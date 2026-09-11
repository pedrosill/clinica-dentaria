const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const doctorController = require('../controllers/doctorController');

const router = express.Router();

router.get('/', asyncHandler(doctorController.getDoctors));
router.get('/:id', asyncHandler(doctorController.getDoctorById));
router.post('/', asyncHandler(doctorController.createDoctor));
router.put('/:id', asyncHandler(doctorController.updateDoctor));
router.delete('/:id', asyncHandler(doctorController.deleteDoctor));

module.exports = router;