const clinicalService = require('../services/clinicalService');

async function getClinicalRecord(req, res) {
  res.json(await clinicalService.getClinicalRecord(req.params.patientId, req.user));
}

async function updateClinicalProfile(req, res) {
  res.json(await clinicalService.updateClinicalProfile(req.params.patientId, req.body, req.user));
}

async function upsertToothChartEntry(req, res) {
  res.json(await clinicalService.upsertToothChartEntry(req.params.patientId, req.body, req.user));
}

async function deleteToothChartEntry(req, res) {
  res.json(
    await clinicalService.deleteToothChartEntry(req.params.patientId, req.params.entryId, req.user, req.body)
  );
}

async function createClinicalNote(req, res) {
  res.status(201).json(
    await clinicalService.createClinicalNote(req.params.patientId, req.body, req.user)
  );
}

async function updateClinicalNote(req, res) {
  res.json(await clinicalService.updateClinicalNote(req.params.patientId, req.params.noteId, req.body, req.user));
}

async function validateClinicalNote(req, res) {
  res.json(await clinicalService.validateClinicalNote(req.params.patientId, req.params.noteId, req.user, req));
}

async function createClinicalNoteAddendum(req, res) {
  res.status(201).json(await clinicalService.createClinicalNoteAddendum(
    req.params.patientId, req.params.noteId, req.body, req.user
  ));
}

async function createTreatmentPlan(req, res) {
  res.status(201).json(
    await clinicalService.createTreatmentPlan(req.params.patientId, req.body, req.user)
  );
}

async function updateTreatmentPlan(req, res) {
  res.json(await clinicalService.updateTreatmentPlan(req.params.patientId, req.params.planId, req.body, req.user));
}

async function createTreatmentPlanItem(req, res) {
  res.status(201).json(
    await clinicalService.createTreatmentPlanItem(req.params.patientId, req.params.planId, req.body, req.user)
  );
}

async function updateTreatmentPlanItem(req, res) {
  res.json(await clinicalService.updateTreatmentPlanItem(req.params.patientId, req.params.itemId, req.body, req.user));
}

async function deleteTreatmentPlanItem(req, res) {
  res.json(await clinicalService.deleteTreatmentPlanItem(req.params.patientId, req.params.itemId, req.user));
}

module.exports = {
  getClinicalRecord,
  updateClinicalProfile,
  upsertToothChartEntry,
  deleteToothChartEntry,
  createClinicalNote,
  updateClinicalNote,
  validateClinicalNote,
  createClinicalNoteAddendum,
  createTreatmentPlan,
  updateTreatmentPlan,
  createTreatmentPlanItem,
  updateTreatmentPlanItem,
  deleteTreatmentPlanItem,
};
