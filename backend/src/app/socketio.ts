import * as socketIO from 'socket.io';
import { AppConfig } from './config';
import { createServer, Server } from 'node:http';
import { Application } from 'express';
import { buildCorsOptions } from '../modules/util';
import { connectionEvents } from '../events/ConnectionEvents';

interface CreateSocketIoOptions {
    config: AppConfig;
    isReady: () => boolean;
}

export function createWebsocket(expressServer: Application, options: CreateSocketIoOptions): Server {
    const webSocketServer = createServer(expressServer)
    const io = new socketIO.Server(webSocketServer, {
        cors: buildCorsOptions(options.config),
    });

    connectionEvents(io);

    return webSocketServer;
}
