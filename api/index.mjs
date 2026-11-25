// Vercel serverless entry: every /api/* request is rewritten to this function (see vercel.json).
// The React app is served as static files by Vercel, so the API needs no static handling here.
// An Express app is itself a (req, res) handler, so it can be the default export.
import { createApp } from '../server/src/app.js';

export default createApp({ staticDir: null });
