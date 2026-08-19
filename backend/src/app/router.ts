import { Router, type Request, type Response } from 'express';
import type { AppConfig } from './config';
import { NotFoundError } from './errors';
import type User from '../structures/User';

interface CreateRouterOptions {
  config: AppConfig;
  isReady: () => boolean;
}

function handleHealth(_request: Request, response: Response): void {
  response.status(200).json({
    status: 'ok',
  });
}

function handleReadiness(isReady: () => boolean) {
  return (_request: Request, response: Response): void => {
    const ready = isReady();

    response.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'starting',
    });
  };
}

export function createRouter(options: CreateRouterOptions): Router {
  const router = Router();

  router.get('/health', handleHealth);
  router.get('/ready', handleReadiness(options.isReady));
  router.use((_request, _response, next) => {
    next(new NotFoundError('Route not found'));
  });

  return router;
}
