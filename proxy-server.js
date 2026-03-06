/**
 * Simple CORS proxy for MyAnimeList API
 * This server forwards requests to MAL API and adds CORS headers
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3000;
const MAL_BASE_URL = 'https://api.myanimelist.net/v2';
const CLIENT_ID = 'a86cd94144af52f931b0a3ab74455192';

const server = http.createServer((req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-MAL-CLIENT-ID');
  res.setHeader('Content-Type', 'application/json');

  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse the incoming request path
  const originalPath = req.url.substring(1); // Remove leading /
  const malUrl = `${MAL_BASE_URL}/${originalPath}`;

  console.log(`[Proxy] ${req.method} ${malUrl}`);

  // Create request to MAL API
  https.get(malUrl, {
    headers: {
      'X-MAL-CLIENT-ID': CLIENT_ID,
      'User-Agent': 'AnimeTracker/1.0'
    }
  }, (proxyRes) => {
    let data = '';

    proxyRes.on('data', chunk => {
      data += chunk;
    });

    proxyRes.on('end', () => {
      res.writeHead(proxyRes.statusCode);
      res.end(data);
      console.log(`[Proxy] Response: ${proxyRes.statusCode}`);
    });
  }).on('error', (error) => {
    console.error(`[Proxy Error]`, error.message);
    res.writeHead(500);
    res.end(JSON.stringify({
      error: error.message,
      endpoint: malUrl
    }));
  });
});

server.listen(PORT, () => {
  console.log(`🔄 CORS Proxy Server running at http://localhost:${PORT}`);
  console.log(`📍 Proxying MyAnimeList API requests...`);
  console.log(`✅ Use: http://localhost:${PORT}/anime/ranking?ranking_type=all&limit=4`);
});
