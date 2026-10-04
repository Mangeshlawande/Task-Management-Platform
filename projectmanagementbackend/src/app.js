import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger.js';

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

app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Project Camp API is running.',
    data: { docs: '/api-docs', health: '/api/v1/healthcheck' },
  });
});

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

import { errorHandler } from '#middlewares/error.middleware.js';
app.use(errorHandler);

export default app;
