const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const patientController = require('../controllers/patientController');
const clinicalRoutes = require('./clinicalRoutes');
const { requirePermission } = require('../middleware/auth');

const router = express.Router();

router.get('/', requirePermission('patient', 'read'), asyncHandler(patientController.getPatients));
router.get('/:id', requirePermission('patient', 'read'), asyncHandler(patientController.getPatientById));
router.post('/', requirePermission('patient', 'write'), asyncHandler(patientController.createPatient));
router.put('/:id', requirePermission('patient', 'write'), asyncHandler(patientController.updatePatient));
router.delete('/:id', requirePermission('patient', 'archive'), asyncHandler(patientController.deletePatient));
router.use('/:patientId/clinical', clinicalRoutes);

module.exports = router;
