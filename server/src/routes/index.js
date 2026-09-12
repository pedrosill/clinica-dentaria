const express = require('express');
const authRoutes = require('./authRoutes');
const patientRoutes = require('./patientRoutes');
const doctorRoutes = require('./doctorRoutes');
const appointmentRoutes = require('./appointmentRoutes');
const clinicSettingsRoutes = require('./clinicSettingsRoutes');
const governanceRoutes = require('./governanceRoutes');
const userRoutes = require('./userRoutes');
const recallRoutes = require('./recallRoutes');
const waitlistRoutes = require('./waitlistRoutes');
const reportRoutes = require('./reportRoutes');
const complianceRoutes = require('./complianceRoutes');
const workQueueRoutes = require('./workQueueRoutes');
const { requireAuth } = require('../middleware/auth');
const { auditRequest } = require('../services/auditService');

const router = express.Router();

router.use(auditRequest);
router.use('/auth', authRoutes);
router.use('/', requireAuth, governanceRoutes);
router.use('/patients', requireAuth, patientRoutes);
router.use('/doctors', requireAuth, doctorRoutes);
router.use('/appointments', requireAuth, appointmentRoutes);
router.use('/settings', requireAuth, clinicSettingsRoutes);
router.use('/users', requireAuth, userRoutes);
router.use('/', requireAuth, recallRoutes);
router.use('/', requireAuth, waitlistRoutes);
router.use('/reports', requireAuth, reportRoutes);
router.use('/compliance', requireAuth, complianceRoutes);
router.use('/work-queue', requireAuth, workQueueRoutes);

module.exports = router;
