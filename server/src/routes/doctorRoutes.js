const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const doctorController = require('../controllers/doctorController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', asyncHandler(doctorController.getDoctors));
router.get('/:id', asyncHandler(doctorController.getDoctorById));
router.post('/', requireRole('admin'), asyncHandler(doctorController.createDoctor));
router.put('/:id', requireRole('admin'), asyncHandler(doctorController.updateDoctor));
router.delete('/:id', requireRole('admin'), asyncHandler(doctorController.deleteDoctor));

module.exports = router;
