// import test from 'node:test';
// import assert from 'node:assert/strict';
// import request from 'supertest';
// import { createExpressApp } from '../src/app/express';
// import type { AppConfig } from '../src/app/config';
// import User from '../src/structures/User';

// function createConfig(overrides: Partial<AppConfig> = {}): AppConfig {
//     return {
//         nodeEnv: 'test',
//         httpPort: 3000,
//         wsPort: 3001,
//         mongoUri: 'mongodb://127.0.0.1:27017',
//         dbName: 'api',
//         // adminApiToken: '0123456789abcdef',
//         // adminUsername: 'admin',
//         allowedOrigins: ['http://localhost:3000'],
//         rateLimitWindowMs: 60_000,
//         rateLimitMax: 100,
//         jsonBodyLimit: '100kb',
//         trustProxy: false,
//         ...overrides,
//     };
// }

// function createApp() {
//     return createExpressApp({
//         config: createConfig(),
//         isReady: () => true,
//     });
// }

// test('GET /health returns ok', async () => {
//     const response = await request(createApp()).get('/health');

//     assert.equal(response.status, 200);
//     assert.deepEqual(response.body, { status: 'ok' });
// });

// test('GET /ready reflects readiness state', async () => {
//     const response = await request(createApp()).get('/ready');

//     assert.equal(response.status, 503);
//     assert.deepEqual(response.body, { status: 'starting' });
// });

// // test('GET /client/students/:id returns a user', async () => {
// //   const response = await request(createApp()).get('/client/students/123');

// //   assert.equal(response.status, 200);
// //   assert.equal(response.body.id, '123');
// //   assert.equal(response.body.email, 'ava@example.com');
// // });

// // test('GET /admin/login requires a valid bearer token', async () => {
// //   const response = await request(createApp())
// //     .get('/admin/login')
// //     .set('Authorization', ['Bearer', '0123456789abcdef'].join(' '));

// //   assert.equal(response.status, 200);
// //   assert.deepEqual(response.body, {
// //     authenticated: true,
// //     admin: 'admin',
// //   });
// // });
