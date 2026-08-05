import http from 'node:http';
import { createServer as createViteServer, loadEnv } from 'vite';

const root = process.cwd();
const env = loadEnv('development', root, '');
for (const [key, value] of Object.entries(env)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

const port = Number(process.env.PORT || 5173);
const vite = await createViteServer({
  root,
  server: { middlewareMode: true },
  appType: 'spa',
});

const apiModules = {
  '/api/generate': '/api/generate.ts',
  '/api/delete-account': '/api/delete-account.ts',
  '/api/stock-images': '/api/stock-images.ts',
  '/api/stock-image-proxy': '/api/stock-image-proxy.ts',
};

const readJsonBody = (request) => new Promise((resolve, reject) => {
  const chunks = [];
  let totalBytes = 0;
  request.on('data', (chunk) => {
    totalBytes += chunk.length;
    if (totalBytes > 5 * 1024 * 1024) {
      reject(new Error('Local API request is larger than 5 MB.'));
      request.destroy();
      return;
    }
    chunks.push(chunk);
  });
  request.on('end', () => {
    if (!chunks.length) return resolve({});
    try {
      resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    } catch {
      reject(new Error('Request body is not valid JSON.'));
    }
  });
  request.on('error', reject);
});

const addVercelResponseHelpers = (response) => {
  response.status = (statusCode) => {
    response.statusCode = statusCode;
    return response;
  };
  response.json = (payload) => {
    if (!response.hasHeader('Content-Type')) response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(payload));
    return response;
  };
  response.send = (payload) => {
    response.end(payload);
    return response;
  };
  return response;
};

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const modulePath = apiModules[requestUrl.pathname];

  if (!modulePath) {
    vite.middlewares(request, response, () => {
      response.statusCode = 404;
      response.end('Not found');
    });
    return;
  }

  try {
    request.query = Object.fromEntries(requestUrl.searchParams.entries());
    request.body = request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH'
      ? await readJsonBody(request)
      : {};
    const apiModule = await vite.ssrLoadModule(modulePath);
    await apiModule.default(request, addVercelResponseHelpers(response));
  } catch (error) {
    vite.ssrFixStacktrace(error);
    console.error(error);
    if (!response.headersSent) {
      response.statusCode = 500;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    if (!response.writableEnded) {
      response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Local API error' }));
    }
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Local full-stack app: http://localhost:${port}`);
});

const shutDown = async () => {
  server.close();
  await vite.close();
  process.exit(0);
};

process.once('SIGINT', shutDown);
process.once('SIGTERM', shutDown);
