// Minimal dependency-free authentication: one configured account, HMAC-signed session token in an
// HttpOnly cookie. Enabled only when AUTH_PASSWORD is set (so local dev stays frictionless).
import crypto from 'node:crypto';

const COOKIE = 'cb_session';
const TTL_MS = 12 * 60 * 60 * 1000;
const secret = process.env.AUTH_SECRET || crypto.randomBytes(32).toString('hex'); // random => sessions reset on restart

export const authEnabled = () => Boolean(process.env.AUTH_PASSWORD);

const b64 = (b) => Buffer.from(b).toString('base64url');
const sign = (data) => crypto.createHmac('sha256', secret).update(data).digest('base64url');

export function createToken(user, now = Date.now()) {
  const payload = b64(JSON.stringify({ u: user, exp: now + TTL_MS }));
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token, now = Date.now()) {
  if (typeof token !== 'string') return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return exp > now ? u : null;
  } catch { return null; }
}

const safeEqual = (a, b) => {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

export function checkCredentials(username, password) {
  const u = process.env.AUTH_USER || 'admin';
  // Evaluate both so timing does not reveal which field was wrong.
  const okUser = safeEqual(username, u);
  const okPass = safeEqual(password, process.env.AUTH_PASSWORD || '');
  return okUser && okPass;
}

const readCookie = (req, name) => {
  const m = (req.headers.cookie || '').split(';').map((s) => s.trim()).find((s) => s.startsWith(`${name}=`));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
};

export const currentUser = (req) => (authEnabled() ? verifyToken(readCookie(req, COOKIE)) : 'anonymous');

export function requireAuth(req, res, next) {
  if (currentUser(req)) return next();
  res.status(401).json({ error: 'Authentication required' });
}

export function setSession(req, res, user) {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie(COOKIE, createToken(user), { httpOnly: true, sameSite: 'lax', secure, maxAge: TTL_MS, path: '/' });
}
export const clearSession = (res) => res.clearCookie(COOKIE, { path: '/' });

// Tiny in-memory brute-force limiter: 10 failed logins / 15 min / IP.
const attempts = new Map();
export function loginLimiter(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec && rec.reset > now && rec.count >= 10) {
    return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  }
  res.on('finish', () => {
    if (res.statusCode === 401) {
      const r = attempts.get(ip);
      if (!r || r.reset <= now) attempts.set(ip, { count: 1, reset: now + 15 * 60 * 1000 });
      else r.count++;
    } else if (res.statusCode === 200) attempts.delete(ip);
  });
  next();
}
