const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { CLIENT_ORIGIN } = require('./config/env');
const prisma = require('./lib/prisma');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health/ready', async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: 'ready' });
  } catch (error) {
    return next(error);
  }
});

app.get('/', (req, res) => {
  res.json({
    message: 'DentalPro API is running',
  });
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
