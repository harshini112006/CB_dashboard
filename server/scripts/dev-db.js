// Zero-install local MongoDB for development (no Docker / Atlas needed): `npm run dev:db`
// Downloads a mongod binary on first run and persists data in ../data/mongo.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';

const dbPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/mongo');
fs.mkdirSync(dbPath, { recursive: true });
const m = await MongoMemoryServer.create({ instance: { port: 27017, dbPath, storageEngine: 'wiredTiger' } });
console.log(`MongoDB running at ${m.getUri()}  (Ctrl+C to stop)`);
process.on('SIGINT', async () => { await m.stop(); process.exit(0); });
