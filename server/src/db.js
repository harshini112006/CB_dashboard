import dns from 'node:dns';
import { MongoClient } from 'mongodb';

let client;
let db;

export async function connect() {
  if (db) return db;
  // Some networks / Windows setups refuse the DNS SRV lookup that `mongodb+srv://` URIs need
  // (error: querySrv ECONNREFUSED). Setting DNS_SERVERS=8.8.8.8,1.1.1.1 makes Node use a public resolver.
  if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean));
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
  client = new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 15000 });
  await client.connect();
  db = client.db(process.env.MONGODB_DB || 'cb_dashboard');
  return db;
}

export const lines = () => db.collection('lines');
export async function close() { await client?.close(); db = undefined; }
