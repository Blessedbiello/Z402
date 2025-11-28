import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { logger } from './config/logger';
import { config } from './config';
import routes from './routes';
import { swaggerSpec } from './config/swagger';
import { startAggregationJobs, stopAggregationJobs } from './jobs/aggregate-metrics';
import { EmailService } from './services/email.service';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = config.port;

// Security middleware
app.use(helmet());
app.use(cors(config.cors));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API Documentation (Swagger UI)
app.use(
  '/api/v1/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Z402 API Documentation',
    customfavIcon: '/favicon.ico',
  })
);

// Swagger JSON endpoint
app.get('/api/v1/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API routes
app.use('/api/v1', routes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 Z402 Backend running on port ${PORT} in ${config.nodeEnv} mode`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`📄 API Docs: http://localhost:${PORT}/api/v1/docs`);

  // Initialize email service
  try {
    EmailService.initialize();
    logger.info(`📧 Email service initialized (provider: ${config.email.provider})`);
  } catch (error) {
    logger.error('Failed to initialize email service', error);
    // Don't crash the server if email initialization fails
  }

  // Start aggregation jobs
  startAggregationJobs();
  logger.info('📈 Analytics aggregation jobs started');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  stopAggregationJobs();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  stopAggregationJobs();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;
