const patientService = require('../services/patientService');

async function getPatients(req, res) {
  const patients = await patientService.getPatients();
  return res.status(200).json(patients);
}

async function getPatientById(req, res) {
  const patient = await patientService.getPatientById(req.params.id);
  return res.status(200).json(patient);
}

async function createPatient(req, res) {
  const patient = await patientService.createPatient(req.body);
  return res.status(201).json(patient);
}

async function updatePatient(req, res) {
  const patient = await patientService.updatePatient(req.params.id, req.body);
  return res.status(200).json(patient);
}

async function deletePatient(req, res) {
  const result = await patientService.deletePatient(req.params.id);
  return res.status(200).json(result);
}

module.exports = {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
};