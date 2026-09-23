const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requirePermission, requireRole } = require('../middleware/auth');
const controller = require('../controllers/governanceController');

const router = express.Router();
const governanceRead = requirePermission('governance', 'read');
const governanceWrite = requirePermission('governance', 'write');
const governanceManage = requirePermission('governance', 'manage');
const governanceExport = requirePermission('governance', 'export');

router.get('/patients/:patientId/consents', governanceRead, asyncHandler(controller.listConsents));
router.post('/patients/:patientId/consents', governanceWrite, asyncHandler(controller.createConsent));
router.post('/patients/:patientId/consents/:consentId/withdraw', governanceManage, asyncHandler(controller.withdrawConsent));
router.get('/patients/:patientId/privacy-notice', governanceRead, asyncHandler(controller.listPrivacyNotices));
router.get('/patients/:patientId/privacy-notice/preview', governanceRead, asyncHandler(controller.previewPrivacyNotice));
router.get('/patients/:patientId/privacy-notice.pdf', governanceRead, asyncHandler(controller.downloadPrivacyNotice));
router.post('/patients/:patientId/privacy-notice/send', governanceWrite, asyncHandler(controller.sendPrivacyNotice));
router.get('/patients/:patientId/documents', governanceRead, asyncHandler(controller.listDocuments));
router.post('/patients/:patientId/documents', governanceWrite, asyncHandler(controller.createDocument));
router.post('/patients/:patientId/documents/upload', governanceWrite, express.raw({ type: 'application/octet-stream', limit: '25mb' }), asyncHandler(controller.uploadDocument));
router.get('/patients/:patientId/documents/:documentId/content', governanceRead, asyncHandler(controller.downloadDocument));
router.get('/patients/:patientId/export', governanceExport, asyncHandler(controller.exportPatient));

router.post('/data-subject-requests', governanceWrite, asyncHandler(controller.createDataSubjectRequest));
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
