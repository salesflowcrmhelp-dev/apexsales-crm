import app from '../server/server.js';

export default function handler(req, res) {
  // If Vercel rewrote /api/... to /api, ensure Express router matches
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
}
