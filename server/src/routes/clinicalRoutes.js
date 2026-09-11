const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireRole } = require('../middleware/auth');
const controller = require('../controllers/clinicalController');

const router = express.Router({ mergeParams: true });
const clinicalRoles = requireRole('admin', 'receptionist');

router.get('/', asyncHandler(controller.getClinicalRecord));
router.put('/profile', clinicalRoles, asyncHandler(controller.updateClinicalProfile));
router.put('/teeth', clinicalRoles, asyncHandler(controller.upsertToothChartEntry));
router.delete('/teeth/:entryId', clinicalRoles, asyncHandler(controller.deleteToothChartEntry));
router.post('/notes', clinicalRoles, asyncHandler(controller.createClinicalNote));
router.put('/notes/:noteId', clinicalRoles, asyncHandler(controller.updateClinicalNote));
router.post('/treatment-plans', clinicalRoles, asyncHandler(controller.createTreatmentPlan));
router.put('/treatment-plans/:planId', clinicalRoles, asyncHandler(controller.updateTreatmentPlan));
router.post(
  '/treatment-plans/:planId/items',
  clinicalRoles,
  asyncHandler(controller.createTreatmentPlanItem)
);
router.put(
  '/treatment-plan-items/:itemId',
  clinicalRoles,
  asyncHandler(controller.updateTreatmentPlanItem)
);
router.delete(
  '/treatment-plan-items/:itemId',
  clinicalRoles,
  asyncHandler(controller.deleteTreatmentPlanItem)
);

module.exports = router;
