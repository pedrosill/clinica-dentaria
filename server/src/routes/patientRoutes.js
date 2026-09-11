const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const patientController = require('../controllers/patientController');

const router = express.Router();

router.get('/', asyncHandler(patientController.getPatients));
router.get('/:id', asyncHandler(patientController.getPatientById));
router.post('/', asyncHandler(patientController.createPatient));
router.put('/:id', asyncHandler(patientController.updatePatient));
router.delete('/:id', asyncHandler(patientController.deletePatient));

module.exports = router;