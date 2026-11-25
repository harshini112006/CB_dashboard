import { MongoClient } from 'mongodb';

let client;
let db;

export async function connect() {
  if (db) return db;
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
  client = new MongoClient(uri, { maxPoolSize: 10 });
  await client.connect();
  db = client.db(process.env.MONGODB_DB || 'cb_dashboard');
  return db;
}

export const lines = () => db.collection('lines');
export async function close() { await client?.close(); db = undefined; }
