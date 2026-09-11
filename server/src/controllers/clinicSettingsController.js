const clinicSettingsService = require('../services/clinicSettingsService');

async function getSettings(req, res) {
  res.json(await clinicSettingsService.getClinicSettings(req.user));
}

async function updateSettings(req, res) {
  res.json(await clinicSettingsService.updateClinicSettings(req.body, req.user));
}

async function createClosure(req, res) {
  res.status(201).json(await clinicSettingsService.createClosure(req.body));
}

async function deleteClosure(req, res) {
  res.json(await clinicSettingsService.deleteClosure(req.params.closureId));
}

async function updateProviderSchedule(req, res) {
  res.json(
    await clinicSettingsService.updateProviderSchedule(req.params.doctorId, req.body, req.user)
  );
}

async function createAppointmentType(req, res) {
  res.status(201).json(await clinicSettingsService.createAppointmentType(req.body));
}

async function updateAppointmentType(req, res) {
  res.json(
    await clinicSettingsService.updateAppointmentType(req.params.typeId, req.body)
  );
}

async function deleteAppointmentType(req, res) {
  res.json(await clinicSettingsService.deleteAppointmentType(req.params.typeId));
}

module.exports = {
  getSettings,
  updateSettings,
  createClosure,
  deleteClosure,
  updateProviderSchedule,
  createAppointmentType,
  updateAppointmentType,
  deleteAppointmentType,
};
