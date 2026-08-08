const http = require('http');
const https = require('https');

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = '*'; // или 'https://elenafromsochi.github.io'

const server = http.createServer(function(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method !== 'POST' || req.url !== '/api/claude') {
    res.writeHead(404); res.end('Not found'); return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    let parsed;
    try { parsed = JSON.parse(body); } catch(e) {
      res.writeHead(400); res.end('Bad JSON'); return;
    }

    // Убедиться что model задана
    if (!parsed.model) parsed.model = 'claude-sonnet-4-6';

    const postData = JSON.stringify(parsed);
    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      }
    };

    const proxyReq = https.request(options, proxyRes => {
      let data = '';
      proxyRes.on('data', chunk => data += chunk);
      proxyRes.on('end', () => {
        res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
        res.end(data);
      });
    });

    proxyReq.on('error', err => {
      res.writeHead(502); res.end(JSON.stringify({ error: err.message }));
    });

    proxyReq.write(postData);
    proxyReq.end();
  });
});

server.listen(PORT, () => console.log('Proxy running on port ' + PORT));
