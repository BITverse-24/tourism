import compression from 'compression';
import cors from 'cors';
import express, { type Application } from 'express';
import helmet from 'helmet';
import type { AppConfig } from './config';
import { errorMiddleware } from './errors';
import { createRouter } from './router';
import { buildCorsOptions, createRateLimiter } from '../modules/util';

interface CreateExpressOptions {
  config: AppConfig;
  isReady: () => boolean;
}

export function createExpressApp(options: CreateExpressOptions): Application {
  const app = express();

  app.disable('x-powered-by');

  if (options.config.trustProxy) {
    app.set('trust proxy', 1);
  }

  app.use(helmet());
  app.use(cors(buildCorsOptions(options.config)));
  app.use(express.json({ limit: options.config.jsonBodyLimit }));
  app.use(express.urlencoded({ extended: false, limit: options.config.jsonBodyLimit }));
  app.use(compression());
  app.use(createRateLimiter(options.config));
  app.use(createRouter(options));
  app.use(errorMiddleware);

  return app;
}
