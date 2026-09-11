const service = require('../services/governanceService');

const getPatientId = (req) => req.params.patientId;

async function listConsents(req, res) { res.json(await service.listConsents(getPatientId(req), req.user)); }
async function createConsent(req, res) { res.status(201).json(await service.createConsent(getPatientId(req), req.body, req.user)); }
async function withdrawConsent(req, res) { res.json(await service.withdrawConsent(getPatientId(req), req.params.consentId, req.user)); }
async function listDocuments(req, res) { res.json(await service.listDocuments(getPatientId(req), req.user)); }
async function createDocument(req, res) { res.status(201).json(await service.createDocument(getPatientId(req), req.body, req.user)); }
async function exportPatient(req, res) { res.json(await service.exportPatient(getPatientId(req), req.user, req)); }
async function createDataSubjectRequest(req, res) { res.status(201).json(await service.createDataSubjectRequest(req.body, req.user)); }
async function listDataSubjectRequests(req, res) { res.json(await service.listDataSubjectRequests(req.user, req.query)); }
async function updateDataSubjectRequest(req, res) { res.json(await service.updateDataSubjectRequest(req.params.requestId, req.body, req.user)); }
async function listAuditEvents(req, res) { res.json(await service.listAuditEvents(req.user, req.query)); }
async function getAuditEvent(req, res) { res.json(await service.getAuditEvent(req.params.eventId, req.user)); }
async function listRetentionPolicies(req, res) { res.json(await service.listRetentionPolicies(req.user)); }
async function updateRetentionPolicy(req, res) { res.json(await service.updateRetentionPolicy(req.params.resourceType, req.body, req.user)); }
async function retentionPreview(req, res) { res.json(await service.retentionPreview(req.user, req.query.patientId)); }
async function applyRetention(req, res) { res.json(await service.applyRetention(req.body, req.user)); }
async function listRetentionHolds(req, res) { res.json(await service.listRetentionHolds(req.user)); }
async function releaseRetentionHold(req, res) { res.json(await service.releaseRetentionHold(req.params.holdId, req.body, req.user)); }

module.exports = {
  listConsents, createConsent, withdrawConsent, listDocuments, createDocument, exportPatient,
  createDataSubjectRequest, listDataSubjectRequests, updateDataSubjectRequest,
  listAuditEvents, getAuditEvent, listRetentionPolicies, updateRetentionPolicy, retentionPreview,
  applyRetention, listRetentionHolds, releaseRetentionHold,
};
