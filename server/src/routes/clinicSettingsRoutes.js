const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireRole } = require('../middleware/auth');
const controller = require('../controllers/clinicSettingsController');

const router = express.Router();

router.get('/', asyncHandler(controller.getSettings));
router.put('/', requireRole('admin'), asyncHandler(controller.updateSettings));
router.post('/closures', requireRole('admin'), asyncHandler(controller.createClosure));
router.delete('/closures/:closureId', requireRole('admin'), asyncHandler(controller.deleteClosure));
router.put(
  '/providers/:doctorId/schedule',
  requireRole('admin'),
  asyncHandler(controller.updateProviderSchedule)
);
router.post('/appointment-types', requireRole('admin'), asyncHandler(controller.createAppointmentType));
router.put(
  '/appointment-types/:typeId',
  requireRole('admin'),
  asyncHandler(controller.updateAppointmentType)
);
router.delete(
  '/appointment-types/:typeId',
  requireRole('admin'),
  asyncHandler(controller.deleteAppointmentType)
);

module.exports = router;
