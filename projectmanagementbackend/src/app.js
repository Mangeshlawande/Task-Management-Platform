import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { swaggerSpec } from './docs/swagger.js';

const here = path.dirname(fileURLToPath(import.meta.url));
// Built SPA (client/ → client/dist). Gitignored: on Render it is produced by
// the build command; locally only after `npm run build` in client/.
const clientDist = path.resolve(here, '../client/dist');
const hasClientBuild = fs.existsSync(path.join(clientDist, 'index.html'));

const app = express();

// Rate limiting keys on req.ip, so proxy headers may only be trusted when a
// proxy is actually configured — an untrusted X-Forwarded-For would let a
// client spoof its own key and bypass every limit. Opt in with TRUST_PROXY=<hops>.
const trustProxy = process.env.TRUST_PROXY;
if (trustProxy) {
  app.set(
    'trust proxy',
    Number.isNaN(Number(trustProxy)) ? trustProxy : Number(trustProxy)
  );
}

app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static('public'));
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:5173',
      'http://localhost:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  }),
);

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
import healthCheckRouter from '#routes/healthcheck.routes.js';
import authRouter from '#routes/auth.routes.js';
import projectRouter from '#routes/project.routes.js';

// In production (client/dist built) the SPA takes over `/`; without a build
// the API-root JSON stays as the liveness banner.
if (!hasClientBuild) {
  app.get('/', (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'Project Camp API is running.',
      data: { docs: '/api-docs', health: '/api/v1/healthcheck' },
    });
  });
}

app.use('/api/v1/healthcheck', healthCheckRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/projects', projectRouter);

// JSON 404 for unknown API routes (instead of Express default HTML)
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    errors: {},
  });
});

// ── Single-origin production serving ───────────────────────────────
// The React client calls the API with relative URLs (/api/v1/...) and httpOnly
// cookies (sameSite=strict), so in production Express must serve the built
// bundle from the same origin. Inactive in dev: dist/ is gitignored and Vite
// serves the app on :5173 behind its own proxy.
if (hasClientBuild) {
  app.use(express.static(clientDist));
  // SPA fallback for react-router deep links (/login, /projects/:id/...).
  // Express 5 has no bare '*' pattern — use a method/path guard instead.
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api') || req.path.startsWith('/api-docs')) {
      return next();
    }
    // Extensionless path → a client route (/login, /projects/:id/board);
    // anything that looks like a file (/assets/*.js) missed static and 404s.
    if (path.extname(req.path)) return next();
    return res.sendFile(path.join(clientDist, 'index.html'));
  });
}

import { errorHandler } from '#middlewares/error.middleware.js';
app.use(errorHandler);

export default app;
