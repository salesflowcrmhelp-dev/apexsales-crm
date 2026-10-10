let appPromise = null;

export default async function handler(req, res) {
  try {
    if (!appPromise) {
      appPromise = import('../server/server.js').then(async m => {
        if (m.initDatabase) {
          try { await m.initDatabase(); } catch(e) {}
        }
        return m.default || m.app;
      });
    }
    const app = await appPromise;
    if (req.url && !req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
    return app(req, res);
  } catch (err) {
    console.error('Serverless boot error:', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      success: false,
      error: 'SERVERLESS_BOOT_ERROR',
      message: err.message,
      stack: err.stack
    });
  }
}
