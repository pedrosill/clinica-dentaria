const reportService = require('../services/reportService');

async function getAppointmentReport(req, res, next) {
  try {
    const report = await reportService.getAppointmentReport(req.query, req.user);
    return res.json(report);
  } catch (error) {
    return next(error);
  }
}

module.exports = { getAppointmentReport };
