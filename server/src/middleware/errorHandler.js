function notFoundHandler(req, res) {
  return res.status(404).json({
    message: 'Route not found',
  });
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const response = {
    message: error.message || 'Internal server error',
  };

  if (error.details) {
    response.details = error.details;
  }

  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    response.debugMessage = error?.message || null;
    response.debugCode = error?.code || null;
    response.debugMeta = error?.meta || null;
  }

  console.error(error);

  return res.status(statusCode).json(response);
}

module.exports = {
  notFoundHandler,
  errorHandler,
};