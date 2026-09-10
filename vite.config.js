import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'node:https'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'fast2sms-proxy-server',
      configureServer(server) {
        server.middlewares.use('/api/send-sms', (req, res) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body);
                const { apiKey, phone, otp, gateway } = parsed;
                const cleanPhone = String(phone).replace(/[^0-9]/g, '').slice(-10);

                // --- MSG91 OTP GATEWAY ---
                if (gateway === 'msg91') {
                  const { templateId } = parsed;
                  const authClean = (apiKey || '').trim();

                  // Verify MSG91 real account balance first
                  https.get(`https://api.msg91.com/api/balance.php?authkey=${encodeURIComponent(authClean)}`, (balRes) => {
                    let balData = '';
                    balRes.on('data', chunk => balData += chunk);
                    balRes.on('end', () => {
                      const balanceNum = parseFloat(balData.trim());
                      if (balData && !isNaN(balanceNum) && balanceNum <= 0) {
                        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ 
                          return: false, 
                          message: 'MSG91 Account SMS Balance is 0 credits. Please recharge your MSG91 wallet to deliver telecom SMS.' 
                        }));
                        return;
                      }

                      let msg91Path = `/api/v5/otp?mobile=91${cleanPhone}&authkey=${encodeURIComponent(authClean)}&otp=${otp}&otp_length=6&otp_expiry=5`;
                      if (templateId && templateId.trim()) {
                        msg91Path += `&template_id=${encodeURIComponent(templateId.trim())}`;
                      }
                      const options = {
                        hostname: 'control.msg91.com',
                        port: 443,
                        path: msg91Path,
                        method: 'POST',
                        headers: {
                          'authkey': authClean,
                          'Content-Type': 'application/json'
                        }
                      };
                      const proxyReq = https.request(options, proxyRes => {
                        let responseData = '';
                        proxyRes.on('data', chunk => { responseData += chunk; });
                        proxyRes.on('end', () => {
                          try {
                            const json = JSON.parse(responseData);
                            const isSuccess = json.type === 'success' || (proxyRes.statusCode >= 200 && proxyRes.statusCode < 300 && json.type !== 'error');
                            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                            res.end(JSON.stringify({ return: isSuccess, message: json.message || responseData }));
                          } catch(e) {
                            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                            res.end(JSON.stringify({ return: true, message: responseData }));
                          }
                        });
                      });
                      proxyReq.on('error', err => {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ return: false, message: err.message }));
                      });
                      proxyReq.end();
                    });
                  }).on('error', () => {
                    // Fallback directly to send if balance check has network error
                  });
                  return;
                }

                // --- FAST2SMS GATEWAY ---
                const sendFast2Sms = (routeType, callback) => {
                  let payloadData = {};
                  if (routeType === 'otp') {
                    payloadData = {
                      route: 'otp',
                      variables_values: String(otp),
                      numbers: cleanPhone
                    };
                  } else {
                    payloadData = {
                      route: 'q',
                      message: `Pipeline CRM Login OTP: ${otp}. Valid for 5 min.`,
                      language: 'english',
                      numbers: cleanPhone
                    };
                  }

                  const payload = JSON.stringify(payloadData);
                  const options = {
                    hostname: 'www.fast2sms.com',
                    port: 443,
                    path: '/dev/bulkV2',
                    method: 'POST',
                    headers: {
                      'authorization': (apiKey || '').trim(),
                      'Content-Type': 'application/json',
                      'Content-Length': Buffer.byteLength(payload)
                    }
                  };

                  const proxyReq = https.request(options, proxyRes => {
                    let responseData = '';
                    proxyRes.on('data', chunk => { responseData += chunk; });
                    proxyRes.on('end', () => {
                      try {
                        const json = JSON.parse(responseData);
                        callback(null, json, responseData);
                      } catch(e) {
                        callback(null, { return: false, raw: responseData }, responseData);
                      }
                    });
                  });

                  proxyReq.on('error', err => {
                    callback(err);
                  });

                  proxyReq.write(payload);
                  proxyReq.end();
                };

                // Try Route 1: 'otp', if fails try Route 2: 'q'
                sendFast2Sms('otp', (err1, res1, raw1) => {
                  if (!err1 && res1 && (res1.return === true || res1.status_code === 200)) {
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(raw1);
                    return;
                  }

                  // Fallback to Quick SMS route 'q'
                  sendFast2Sms('q', (err2, res2, raw2) => {
                    if (!err2 && res2 && (res2.return === true || res2.status_code === 200)) {
                      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                      res.end(raw2);
                    } else {
                      const finalRes = res2 || res1 || { return: false, message: 'Fast2SMS Gateway returned error' };
                      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                      res.end(JSON.stringify(finalRes));
                    }
                  });
                });
              } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ return: false, message: 'Invalid request body' }));
              }
            });
          } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ return: false, message: 'Method not allowed' }));
          }
        });
      }
    }
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api/auth': 'http://127.0.0.1:5000',
      '/api/leads': 'http://127.0.0.1:5000',
      '/api/users': 'http://127.0.0.1:5000',
      '/api/sync': 'http://127.0.0.1:5000',
      '/api/health': 'http://127.0.0.1:5000'
    }
  }
})
