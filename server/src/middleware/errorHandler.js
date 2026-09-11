function notFoundHandler(req, res) {
  return res.status(404).json({
    message: 'Route not found',
  });
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const response = {
    message:
      isProduction && statusCode >= 500
        ? 'Internal server error'
        : error.message || 'Internal server error',
  };

  if (error.details) {
    response.details = error.details;
  }

  if (!isProduction && statusCode === 500) {
    response.debugMessage = error?.message || null;
    response.debugCode = error?.code || null;
    response.debugMeta = error?.meta || null;
  }

  if (isProduction) {
    console.error({
      code: error?.code || null,
      message: error?.message || 'Internal server error',
      method: req.method,
      path: req.path,
      statusCode,
    });
  } else {
    console.error(error);
  }

  return res.status(statusCode).json(response);
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
