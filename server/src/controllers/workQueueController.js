const workQueueService = require('../services/workQueueService');

async function getWorkQueue(req, res, next) {
  try {
    return res.json(await workQueueService.getWorkQueue(req.user));
  } catch (error) {
    return next(error);
  }
}

module.exports = { getWorkQueue };
