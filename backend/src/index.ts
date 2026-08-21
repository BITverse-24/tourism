import Server from './app/Server';
import { logger, serializeError } from './modules/logger';

void Server.start().catch((error) => {
  logger.error('Failed to start server', serializeError(error));
  process.exitCode = 1;
});
