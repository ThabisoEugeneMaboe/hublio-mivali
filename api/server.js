const http = require('http');
const fs = require('fs');
const path = require('path');
const mvp = require('./mvp');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = path.join(__dirname, '..', 'wwwroot');

function sendJson(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((part) => {
    const [k, ...rest] = part.trim().split('=');
    if (k) out[k] = decodeURIComponent(rest.join('='));
  });
  return out;
}

function sessionCookie(token) {
  return `hublio=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${12 * 3600}`;
}

function clearCookie() {
  return 'hublio=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0';
}

function currentUser(req) {
  return mvp.getSession(parseCookies(req).hublio);
}

function requireUser(req, res) {
  const user = currentUser(req);
  if (!user) {
    sendJson(res, 401, { error: 'Please sign in' });
    return null;
  }
  return user;
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
      '.ico': 'image/x-icon',
    }[ext] || 'application/octet-stream'
  );
}

function match(pathname, pattern) {
  const keys = [];
  const rx = new RegExp('^' + pattern.replace(/:([^/]+)/g, (_, k) => {
    keys.push(k);
    return '([^/]+)';
  }) + '$');
  const m = pathname.match(rx);
  if (!m) return null;
  const params = {};
  keys.forEach((k, i) => {
    params[k] = decodeURIComponent(m[i + 1]);
  });
  return params;
}

async function handleApi(req, res, url) {
  const { pathname } = url;
  const method = req.method;

  if (pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, service: 'hublio-mvp' });
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    const payload = await readBody(req);
    const result = mvp.login(payload);
    if (result.error) return sendJson(res, result.status || 400, result);
    return sendJson(res, 200, { user: result.user }, { 'Set-Cookie': sessionCookie(result.token) });
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    mvp.destroySession(parseCookies(req).hublio);
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearCookie() });
  }

  if (pathname === '/api/auth/me' && method === 'GET') {
    const user = currentUser(req);
    if (!user) return sendJson(res, 200, { user: null });
    return sendJson(res, 200, { user: mvp.publicUser(user, mvp.load()) });
  }

  const user = requireUser(req, res);
  if (!user) return;

  if (pathname === '/api/dashboard' && method === 'GET') {
    return sendJson(res, 200, mvp.dashboard(user));
  }

  if (pathname === '/api/checkin' && method === 'POST') {
    const payload = await readBody(req);
    const result = mvp.submitCheckIn(user, payload);
    if (result.error) return sendJson(res, result.status || 400, result);
    return sendJson(res, 201, result);
  }

  const alertPut = match(pathname, '/api/alerts/:id');
  if (alertPut && method === 'PUT') {
    const payload = await readBody(req);
    const result = mvp.updateAlert(user, alertPut.id, payload);
    if (result.error) return sendJson(res, result.status || 400, result);
    return sendJson(res, 200, result);
  }

  const follow = match(pathname, '/api/cases/:id/followups');
  if (follow && method === 'POST') {
    const payload = await readBody(req);
    const result = mvp.addFollowUp(user, follow.id, payload);
    if (result.error) return sendJson(res, result.status || 400, result);
    return sendJson(res, 201, result);
  }

  if (pathname === '/api/teachers' && method === 'POST') {
    const result = mvp.createTeacher(user, await readBody(req));
    if (result.error) return sendJson(res, result.status || 400, result);
    return sendJson(res, 201, result);
  }

  if (pathname === '/api/learners' && method === 'POST') {
    const result = mvp.createLearner(user, await readBody(req));
    if (result.error) return sendJson(res, result.status || 400, result);
    return sendJson(res, 201, result);
  }

  if (pathname === '/api/classes' && method === 'POST') {
    const result = mvp.createClass(user, await readBody(req));
    if (result.error) return sendJson(res, result.status || 400, result);
    return sendJson(res, 201, result);
  }

  if (pathname === '/api/school' && method === 'PUT') {
    const result = mvp.updateSchool(user, await readBody(req));
    if (result.error) return sendJson(res, result.status || 400, result);
    return sendJson(res, 200, result);
  }

  return sendJson(res, 404, { error: 'Unknown API route' });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Credentials': 'true',
      });
      return res.end();
    }

    if (url.pathname.startsWith('/api/')) {
      return await handleApi(req, res, url);
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
  } catch (err) {
    sendJson(res, 400, { error: err.message || 'Request failed' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Hublio Phase 3 MVP on port ${PORT}`);
  console.log('Login:   /login.html');
  console.log('Learner: admin code 024 / PIN 1234');
  console.log('Teacher: kholofelo@school.local / demo');
  console.log('Admin:   admin@demo.school / demo');
});
