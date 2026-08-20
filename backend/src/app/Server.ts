import type { Server as HttpServer } from 'node:http';
import dotenv from 'dotenv';
import { join } from 'node:path';
import { loadConfig, type AppConfig } from './config';
import Database from './database';
import { createExpressApp } from './express';
import { logger, serializeError } from '../modules/logger';
import { createWebsocket } from './socketio';

class Server {
    private readonly database = new Database();
    private readonly config: AppConfig;
    private httpServer?: HttpServer;
    private ready = false;
    private shuttingDown = false;

    constructor() {
        dotenv.config({ path: join(__dirname, '../../.env') });
        this.config = loadConfig(process.env);
        this.registerSignalHandlers();
    }

    public async start(): Promise<this> {
        logger.info('Server startup initiated', {
            httpPort: this.config.httpPort,
            wsPort: this.config.wsPort,
            nodeEnv: this.config.nodeEnv,
        });

        this.ready = true;

        const conf = {
            config: this.config,
            isReady: () => this.ready,
        }

        const app = createExpressApp(conf);

        const sock = createWebsocket(app, conf);

        await new Promise<void>((resolve, reject) => {
            const server = app.listen(this.config.httpPort, () => {
                this.httpServer = server;
                resolve();
            });

            server.on('error', reject);
        });

        sock.listen(this.config.wsPort);

        logger.info('HTTP server listening', {
            port: this.config.httpPort,
        });

        logger.info('WS server listening', {
            port: this.config.wsPort,
        });

        return this;
    }

    public async stop(reason = 'shutdown'): Promise<void> {
        if (this.shuttingDown) {
            return;
        }

        this.shuttingDown = true;
        this.ready = false;

        logger.info('Server shutdown initiated', {
            reason,
        });

        await new Promise<void>((resolve, reject) => {
            if (!this.httpServer) {
                resolve();
                return;
            }

            this.httpServer.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });

        await this.database.stop();
        logger.info('Server shutdown complete', {
            reason,
        });
    }

    private registerSignalHandlers(): void {
        for (const signal of ['SIGINT', 'SIGTERM'] as const) {
            process.once(signal, () => {
                void this.stop(signal);
            });
        }

        process.once('unhandledRejection', (error) => {
            logger.error('Unhandled promise rejection', serializeError(error));
            void this.stop('unhandledRejection');
        });

        process.once('uncaughtException', (error) => {
            logger.error('Uncaught exception', serializeError(error));
            void this.stop('uncaughtException').finally(() => {
                process.exitCode = 1;
            });
        });
    }
}

export default new Server();
