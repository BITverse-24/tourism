import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createWebsocket } from '../src/app/socketio';
import { AppConfig } from '../src/app/config';
import { createExpressApp } from '../src/app/express';
import { io } from 'socket.io-client'
import { createNewSessionMessage, createSessionStartMessage } from '../src/factory/Command';
import { Acks, Commands } from '../src/structures/enums';

function createConfig(overrides: Partial<AppConfig> = {}): AppConfig {
    return {
        nodeEnv: 'test',
        httpPort: 3000,
        wsPort: 3001,
        // mongoUri: 'mongodb://127.0.0.1:27017',
        // dbName: 'api',
        // adminApiToken: '0123456789abcdef',
        // adminUsername: 'admin',
        allowedOrigins: ['http://localhost:3000'],
        rateLimitWindowMs: 60_000,
        rateLimitMax: 100,
        jsonBodyLimit: '100kb',
        trustProxy: false,
        ...overrides,
    };
}

const conf = {
    config: createConfig(),
    isReady: () => true,
}

const expressApp = createExpressApp(conf);
const socketServer = createWebsocket(expressApp, conf);

let httpServer: ReturnType<typeof expressApp.listen>;

before(() => {
    httpServer = expressApp.listen(conf.config.httpPort);
    socketServer.listen(conf.config.wsPort);
});

after(async () => {
    await socketServer.close();

    await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
});

test(
    `ACK accept ${Commands.SESSION_START} with new session start message`,
    async () => {
        const socket = io(`http://localhost:${conf.config.wsPort}`);

        await new Promise<void>((resolve, reject) => {
            socket.on("connect", () => {
                socket.emit(
                    Commands.SESSION_START,
                    createNewSessionMessage({
                        message_id: "test-msg-id",
                        command_id: "test-command-id",
                        occurred_at: "test-occurred-at",
                        payload: {
                            session_id: null,
                        },
                    })
                );
            });
            socket.on(Acks.COMMAND_ACCEPTED, (data) => {
                console.log("recieved data: " + JSON.stringify(data))
                socket.close();
                try {
                    assert.ok(data);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });

            socket.on(Acks.COMMAND_REJECTED, (data) => {
                socket.close();
                reject(
                    new Error(
                        `Command rejected: ${JSON.stringify(data)}`
                    )
                );
            });
        });
    }
);


test(
    `ACK reject ${Commands.SESSION_START} with malformed new session start message`,
    async () => {
        const socket = io(`http://localhost:${conf.config.wsPort}`);

        await new Promise<void>((resolve, reject) => {
            socket.on("connect", () => {
                socket.emit(
                    Commands.SESSION_START,
                    {
                        message_id: "test-msg-id",
                        command_id: "test-command-id",
                        payload: {
                            session_id: null,
                        },
                    }
                );
            });
            socket.on(Acks.COMMAND_ACCEPTED, (data) => {
                socket.close();
                reject(
                    new Error(
                        `Command rejected: ${JSON.stringify(data)}`
                    )
                );
            });

            socket.on(Acks.COMMAND_REJECTED, (data) => {
                console.log("recieved data: " + JSON.stringify(data))
                socket.close();
                try {
                    assert.ok(data);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }
);


test(
    `ACK accept ${Commands.SESSION_START} with session start message`,
    async () => {
        const socket = io(`http://localhost:${conf.config.wsPort}`);

        await new Promise<void>((resolve, reject) => {
            socket.on("connect", () => {
                socket.emit(
                    Commands.SESSION_START,
                    createSessionStartMessage({
                        message_id: "test-msg-id",
                        session_id: "test-sess-id",
                        run_id: "test-run-id",
                        command_id: "test-command-id",
                        occurred_at: "test-occurred-at",
                        payload: {
                            session_id: null,
                        },
                    })
                );
            });
            socket.on(Acks.COMMAND_ACCEPTED, (data) => {
                console.log("recieved data: " + JSON.stringify(data))
                socket.close();
                try {
                    assert.ok(data);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });

            socket.on(Acks.COMMAND_REJECTED, (data) => {
                socket.close();
                reject(
                    new Error(
                        `Command rejected: ${JSON.stringify(data)}`
                    )
                );
            });
        });
    }
);
