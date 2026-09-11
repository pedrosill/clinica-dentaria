const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requirePermission, requireRole } = require('../middleware/auth');
const controller = require('../controllers/governanceController');

const router = express.Router();
const patientRead = requirePermission('patient', 'read');
const patientWrite = requirePermission('patient', 'write');

router.get('/patients/:patientId/consents', patientRead, asyncHandler(controller.listConsents));
router.post('/patients/:patientId/consents', patientWrite, asyncHandler(controller.createConsent));
router.post('/patients/:patientId/consents/:consentId/withdraw', patientWrite, asyncHandler(controller.withdrawConsent));
router.get('/patients/:patientId/documents', patientRead, asyncHandler(controller.listDocuments));
router.post('/patients/:patientId/documents', patientWrite, asyncHandler(controller.createDocument));
router.get('/patients/:patientId/export', patientRead, asyncHandler(controller.exportPatient));

router.post('/data-subject-requests', patientRead, asyncHandler(controller.createDataSubjectRequest));
router.get('/data-subject-requests', requireRole('admin'), asyncHandler(controller.listDataSubjectRequests));
router.patch('/data-subject-requests/:requestId', requireRole('admin'), asyncHandler(controller.updateDataSubjectRequest));

router.get('/audit-events', requireRole('admin'), asyncHandler(controller.listAuditEvents));
router.get('/audit-events/:eventId', requireRole('admin'), asyncHandler(controller.getAuditEvent));

router.get('/retention/policies', requireRole('admin'), asyncHandler(controller.listRetentionPolicies));
router.put('/retention/policies/:resourceType', requireRole('admin'), asyncHandler(controller.updateRetentionPolicy));
router.get('/retention/preview', requireRole('admin'), asyncHandler(controller.retentionPreview));
router.post('/retention/apply', requireRole('admin'), asyncHandler(controller.applyRetention));
router.get('/retention/holds', requireRole('admin'), asyncHandler(controller.listRetentionHolds));
router.post('/retention/holds/:holdId/release', requireRole('admin'), asyncHandler(controller.releaseRetentionHold));

module.exports = router;
