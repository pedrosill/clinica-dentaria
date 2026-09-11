const dotenv = require('dotenv');

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const DATABASE_URL = process.env.DATABASE_URL;

if (NODE_ENV === 'production' && !DATABASE_URL) {
  throw new Error('DATABASE_URL is required in production');
}

module.exports = {
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  DATABASE_URL,
  NODE_ENV,
  PORT: Number(process.env.PORT) || 5000,
};
