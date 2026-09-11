const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const reportController = require('../controllers/reportController');
const { requirePermission } = require('../middleware/auth');

const router = express.Router();

router.get('/appointments', requirePermission('report', 'read'), asyncHandler(reportController.getAppointmentReport));

module.exports = router;
