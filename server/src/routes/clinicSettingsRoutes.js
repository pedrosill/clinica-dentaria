const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requirePermission } = require('../middleware/auth');
const controller = require('../controllers/clinicSettingsController');

const router = express.Router();

router.get('/', requirePermission('settings', 'read'), asyncHandler(controller.getSettings));
router.put('/', requirePermission('settings', 'write'), asyncHandler(controller.updateSettings));
router.post('/closures', requirePermission('settings', 'write'), asyncHandler(controller.createClosure));
router.delete('/closures/:closureId', requirePermission('settings', 'write'), asyncHandler(controller.deleteClosure));
router.put(
  '/providers/:doctorId/schedule',
  requirePermission('settings', 'write'),
  asyncHandler(controller.updateProviderSchedule)
);
router.post('/appointment-types', requirePermission('settings', 'write'), asyncHandler(controller.createAppointmentType));
router.put(
  '/appointment-types/:typeId',
  requirePermission('settings', 'write'),
  asyncHandler(controller.updateAppointmentType)
);
router.delete(
  '/appointment-types/:typeId',
  requirePermission('settings', 'write'),
  asyncHandler(controller.deleteAppointmentType)
);

module.exports = router;
