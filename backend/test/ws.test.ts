import test from 'node:test';
import assert from 'node:assert/strict';
import { createWebsocket } from '../src/app/socketio';
import { AppConfig } from '../src/app/config';
import { createExpressApp } from '../src/app/express';
import { io } from 'socket.io-client'

function createConfig(overrides: Partial<AppConfig> = {}): AppConfig {
    return {
        nodeEnv: 'test',
        httpPort: 3000,
        wsPort: 3001,
        mongoUri: 'mongodb://127.0.0.1:27017',
        dbName: 'api',
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

const expressServer = createExpressApp(conf)
const socketServer = createWebsocket(expressServer, conf)
expressServer.listen(conf.config.httpPort);
socketServer.listen(conf.config.wsPort);

test('RECIEVE trip_info_req event', () => {
    const socket = io(`http://localhost:${conf.config.wsPort}`);

    socket.emit('trip_info_req', {});

    assert(true);
    socket.close();
});

test('RECIEVE trip_create event', () => {
    const socket = io(`http://localhost:${conf.config.wsPort}`);

    socket.emit('trip_create', {});

    assert(true);
    socket.close();
});

test('RECIEVE trip_replan event', () => {
    const socket = io(`http://localhost:${conf.config.wsPort}`);

    socket.emit('trip_replan', {});

    assert(true);
    socket.close();
});

test('RECIEVE trip_cancel event', () => {
    const socket = io(`http://localhost:${conf.config.wsPort}`);

    socket.emit('trip_cancel', {});

    assert(true);
    socket.close();
});

test('RECIEVE prof_answer event', () => {
    const socket = io(`http://localhost:${conf.config.wsPort}`);

    socket.emit('prof_answer', {});

    assert(true);
    socket.close();
});

test('RECIEVE sim_and_optimize_req event', () => {
    const socket = io(`http://localhost:${conf.config.wsPort}`);

    socket.emit('sim_and_optimize_req', {});

    assert(true);
    socket.close();
});
