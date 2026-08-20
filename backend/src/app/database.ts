// import mongoose from 'mongoose';
// import { logger, serializeError } from '../modules/logger';
// import type { AppConfig } from './config';

// class Database {
//   private started = false;

//   public async start(config: AppConfig): Promise<void> {
//     if (this.started) {
//       return;
//     }

//     try {
//       await mongoose.connect(config.mongoUri, {
//         dbName: config.dbName,
//         serverSelectionTimeoutMS: 5_000,
//       });
//       this.started = true;
//       logger.info('Database connection established', {
//         dbName: config.dbName,
//       });
//     } catch (error) {
//       logger.error('Database connection failed', serializeError(error));
//       throw error;
//     }
//   }

//   public async stop(): Promise<void> {
//     if (!this.started) {
//       return;
//     }

//     await mongoose.disconnect();
//     this.started = false;
//     logger.info('Database connection closed');
//   }
// }

// export default Database;
