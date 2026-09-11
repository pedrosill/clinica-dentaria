const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  PORT: Number(process.env.PORT) || 5000,
};