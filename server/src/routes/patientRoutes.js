const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const patientController = require('../controllers/patientController');
const clinicalRoutes = require('./clinicalRoutes');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', asyncHandler(patientController.getPatients));
router.get('/:id', asyncHandler(patientController.getPatientById));
router.post('/', requireRole('admin', 'receptionist'), asyncHandler(patientController.createPatient));
router.put('/:id', requireRole('admin', 'receptionist'), asyncHandler(patientController.updatePatient));
router.delete('/:id', requireRole('admin'), asyncHandler(patientController.deletePatient));
router.use('/:patientId/clinical', clinicalRoutes);

module.exports = router;
