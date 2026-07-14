const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export default async function handler(req, res) {
  const requestUrl = new URL(req.url, 'http://localhost');
  const targetUrl = new URL(requestUrl.pathname + requestUrl.search, BACKEND_URL);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else {
      headers.set(key, value);
    }
  }
  headers.delete('host');
  headers.delete('connection');

  let body;
  if (req.method && !['GET', 'HEAD'].includes(req.method)) {
    if (req.body === undefined || req.body === null) {
      body = undefined;
    } else if (typeof req.body === 'string') {
      body = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      body = req.body;
    } else {
      body = JSON.stringify(req.body);
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
    }
  }

  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body,
  });

  const responseBody = await response.arrayBuffer();
  res.status(response.status);

  response.headers.forEach((value, key) => {
    if (!['content-length', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
      res.setHeader(key, value);
    }
  });

  res.send(Buffer.from(responseBody));
}
