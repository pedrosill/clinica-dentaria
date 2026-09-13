const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requirePermission } = require('../middleware/auth');
const controller = require('../controllers/clinicalController');

const router = express.Router({ mergeParams: true });
const clinicalRead = requirePermission('clinical', 'read');
const clinicalWrite = requirePermission('clinical', 'write');

router.get('/', clinicalRead, asyncHandler(controller.getClinicalRecord));
router.put('/profile', clinicalWrite, asyncHandler(controller.updateClinicalProfile));
router.put('/teeth', clinicalWrite, asyncHandler(controller.upsertToothChartEntry));
router.delete('/teeth/:entryId', clinicalWrite, asyncHandler(controller.deleteToothChartEntry));
router.post('/notes', clinicalWrite, asyncHandler(controller.createClinicalNote));
router.put('/notes/:noteId', clinicalWrite, asyncHandler(controller.updateClinicalNote));
router.post('/notes/:noteId/finalize', requirePermission('clinical', 'validate'), asyncHandler(controller.finalizeClinicalNote));
router.post('/notes/:noteId/validate', requirePermission('clinical', 'validate'), asyncHandler(controller.validateClinicalNote));
router.post('/notes/:noteId/addenda', clinicalWrite, asyncHandler(controller.createClinicalNoteAddendum));
router.post('/treatment-plans', clinicalWrite, asyncHandler(controller.createTreatmentPlan));
router.put('/treatment-plans/:planId', clinicalWrite, asyncHandler(controller.updateTreatmentPlan));
router.post(
  '/treatment-plans/:planId/items',
  clinicalWrite,
  asyncHandler(controller.createTreatmentPlanItem)
);
router.put(
  '/treatment-plan-items/:itemId',
  clinicalWrite,
  asyncHandler(controller.updateTreatmentPlanItem)
);
router.delete(
  '/treatment-plan-items/:itemId',
  clinicalWrite,
  asyncHandler(controller.deleteTreatmentPlanItem)
);

module.exports = router;
