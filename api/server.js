const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = path.join(__dirname, '..', 'wwwroot');
const DATA_FILE = path.join(__dirname, 'data.json');

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(body));
}

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return (
    {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
    }[ext] || 'application/octet-stream'
  );
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (url.pathname === '/api/dashboard') {
    return sendJson(res, 200, readData());
  }

  if (url.pathname === '/api/checkin' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const payload = JSON.parse(body || '{}');
      const data = readData();
      data.checkIns.push({ ...payload, submittedAt: new Date().toISOString() });
      if (!payload.isOkay) {
        data.stats.activeAlerts += 1;
        data.alerts.unshift({
          id: String(Math.floor(Math.random() * 900) + 100).padStart(3, '0'),
          name: data.learner.name,
          grade: data.learner.grade,
          type: `Feeling ${payload.mood?.toLowerCase() || 'concerned'}`,
          time: 'Just now',
          level: 'New',
          color: 'purple',
          concern: payload.concern || 'Something else',
          message: payload.message || '',
          status: 'Open',
        });
      }
      writeData(data);
      sendJson(res, 201, { ok: true });
    });
    return;
  }

  if (url.pathname === '/api/alerts' && req.method === 'GET') {
    return sendJson(res, 200, readData().alerts);
  }

  if (url.pathname.startsWith('/api/alerts/') && req.method === 'PUT') {
    const id = url.pathname.split('/').pop();
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const payload = JSON.parse(body || '{}');
      const data = readData();
      const alert = data.alerts.find((a) => a.id === id);
      if (alert) Object.assign(alert, payload);
      if (payload.status === 'Resolved') data.stats.awaitingFollowUp = Math.max(0, data.stats.awaitingFollowUp - 1);
      writeData(data);
      sendJson(res, 200, alert || {});
    });
    return;
  }

  let filePath = path.join(ROOT, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    return res.end('Not found');
  }
  res.writeHead(200, { 'Content-Type': contentType(filePath) });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Hublio running on port ${PORT}`);
  console.log(`Login:   /login.html`);
  console.log(`Learner: /`);
  console.log(`Teacher: /dashboard.html`);
});
