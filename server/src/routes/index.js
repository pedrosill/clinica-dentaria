const express = require('express');
const patientRoutes = require('./patientRoutes');
const doctorRoutes = require('./doctorRoutes');
const appointmentRoutes = require('./appointmentRoutes');
const asyncHandler = require('../utils/asyncHandler');
const appointmentController = require('../controllers/appointmentController');

const router = express.Router();

router.get('/debug/patients', asyncHandler(appointmentController.getDebugPatients));
router.use('/patients', patientRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);

module.exports = router;