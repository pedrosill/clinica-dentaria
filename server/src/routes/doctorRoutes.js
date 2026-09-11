const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const doctorController = require('../controllers/doctorController');
const { requirePermission } = require('../middleware/auth');

const router = express.Router();

router.get('/', requirePermission('doctor', 'read'), asyncHandler(doctorController.getDoctors));
router.get('/:id', requirePermission('doctor', 'read'), asyncHandler(doctorController.getDoctorById));
router.post('/', requirePermission('doctor', 'write'), asyncHandler(doctorController.createDoctor));
router.put('/:id', requirePermission('doctor', 'write'), asyncHandler(doctorController.updateDoctor));
router.delete('/:id', requirePermission('doctor', 'archive'), asyncHandler(doctorController.deleteDoctor));

module.exports = router;
