import 'dotenv/config';
import { connect } from './db.js';
import { createApp } from './app.js';
import { authEnabled } from './auth.js';
import { aiEnabled } from './ai.js';

const port = process.env.PORT || 4000;
await connect();
const app = createApp();
app.listen(port, () => {
  console.log(`API listening on :${port}  (auth: ${authEnabled() ? 'on' : 'off'}, ai summaries: ${aiEnabled() ? 'on' : 'off'})`);
  // Warm the cache so the first visitor doesn't pay for the default (unfiltered) query.
  // Skipped when auth is on (the endpoint is protected); the first login warms it instead.
  if (!authEnabled()) fetch(`http://127.0.0.1:${port}/api/dashboard`).catch(() => {});
});
