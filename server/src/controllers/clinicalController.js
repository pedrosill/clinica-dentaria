const clinicalService = require('../services/clinicalService');

async function getClinicalRecord(req, res) {
  res.json(await clinicalService.getClinicalRecord(req.params.patientId));
}

async function updateClinicalProfile(req, res) {
  res.json(await clinicalService.updateClinicalProfile(req.params.patientId, req.body));
}

async function upsertToothChartEntry(req, res) {
  res.json(await clinicalService.upsertToothChartEntry(req.params.patientId, req.body));
}

async function deleteToothChartEntry(req, res) {
  res.json(
    await clinicalService.deleteToothChartEntry(req.params.patientId, req.params.entryId)
  );
}

async function createClinicalNote(req, res) {
  res.status(201).json(
    await clinicalService.createClinicalNote(req.params.patientId, req.body, req.user?.id)
  );
}

async function updateClinicalNote(req, res) {
  res.json(await clinicalService.updateClinicalNote(req.params.noteId, req.body, req.user?.id));
}

async function createTreatmentPlan(req, res) {
  res.status(201).json(
    await clinicalService.createTreatmentPlan(req.params.patientId, req.body, req.user?.id)
  );
}

async function updateTreatmentPlan(req, res) {
  res.json(await clinicalService.updateTreatmentPlan(req.params.planId, req.body));
}

async function createTreatmentPlanItem(req, res) {
  res.status(201).json(
    await clinicalService.createTreatmentPlanItem(req.params.planId, req.body)
  );
}

async function updateTreatmentPlanItem(req, res) {
  res.json(await clinicalService.updateTreatmentPlanItem(req.params.itemId, req.body));
}

async function deleteTreatmentPlanItem(req, res) {
  res.json(await clinicalService.deleteTreatmentPlanItem(req.params.itemId));
}

module.exports = {
  getClinicalRecord,
  updateClinicalProfile,
  upsertToothChartEntry,
  deleteToothChartEntry,
  createClinicalNote,
  updateClinicalNote,
  createTreatmentPlan,
  updateTreatmentPlan,
  createTreatmentPlanItem,
  updateTreatmentPlanItem,
  deleteTreatmentPlanItem,
};
