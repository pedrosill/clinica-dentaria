const doctorService = require('../services/doctorService');

async function getDoctors(req, res) {
  const doctors = await doctorService.getDoctors(req.user);
  return res.status(200).json(doctors);
}

async function getDoctorById(req, res) {
  const doctor = await doctorService.getDoctorById(req.params.id, req.user);
  return res.status(200).json(doctor);
}

async function createDoctor(req, res) {
  const doctor = await doctorService.createDoctor(req.body, req.user);
  return res.status(201).json(doctor);
}

async function updateDoctor(req, res) {
  const doctor = await doctorService.updateDoctor(req.params.id, req.body, req.user);
  return res.status(200).json(doctor);
}

async function deleteDoctor(req, res) {
  const result = await doctorService.deleteDoctor(req.params.id, req.user);
  return res.status(200).json(result);
}

module.exports = {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
};
