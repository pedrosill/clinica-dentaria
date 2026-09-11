const express = require('express');
const authRoutes = require('./authRoutes');
const patientRoutes = require('./patientRoutes');
const doctorRoutes = require('./doctorRoutes');
const appointmentRoutes = require('./appointmentRoutes');
const clinicSettingsRoutes = require('./clinicSettingsRoutes');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/patients', requireAuth, patientRoutes);
router.use('/doctors', requireAuth, doctorRoutes);
router.use('/appointments', requireAuth, appointmentRoutes);
router.use('/settings', requireAuth, clinicSettingsRoutes);

module.exports = router;
