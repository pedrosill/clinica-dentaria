const appointmentService = require('../services/appointmentService');

async function getAppointments(req, res, next) {
  try {
    const appointments = await appointmentService.getAppointments(req.user);
    res.json(appointments);
  } catch (error) {
    next(error);
  }
}

async function getAppointmentById(req, res, next) {
  try {
    const appointment = await appointmentService.getAppointmentById(req.params.appointmentId, req.user);
    res.json(appointment);
  } catch (error) {
    next(error);
  }
}

async function getAppointmentAvailability(req, res, next) {
  try {
    const data = await appointmentService.getAppointmentAvailability({
      doctorId: req.query.doctorId,
      date: req.query.date,
      duration: req.query.duration,
      excludeAppointmentId: req.query.excludeAppointmentId,
      user: req.user,
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
}

// ADD THIS NEW HANDLER
async function getRescheduleOptions(req, res, next) {
  try {
    const data = await appointmentService.getRescheduleOptions({
      appointmentId: req.params.appointmentId,
      date: req.query.date,
      duration: req.query.duration,
      user: req.user,
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function createAppointment(req, res, next) {
  try {
    const appointment = await appointmentService.createAppointment(req.body, req.user, req);
    res.status(201).json(appointment);
  } catch (error) {
    next(error);
  }
}

async function updateAppointment(req, res, next) {
  try {
    const appointment = await appointmentService.updateAppointment(
      req.params.appointmentId,
      req.body,
      req.user,
      req
    );
    res.json(appointment);
  } catch (error) {
    next(error);
  }
}

async function concludeAppointment(req, res, next) {
  try {
    const appointment = await appointmentService.concludeAppointment(
      req.params.appointmentId,
      req.body,
      req.user
    );
    res.json(appointment);
  } catch (error) {
    next(error);
  }
}

async function deleteAppointment(req, res, next) {
  try {
    const result = await appointmentService.deleteAppointment(req.params.appointmentId, req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function updateAppointmentStatus(req, res, next) {
  try {
    const appointment = await appointmentService.updateAppointmentStatus(
      req.params.appointmentId,
      req.body,
      req.user
    );
    res.json(appointment);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAppointments,
  getAppointmentById,
  getAppointmentAvailability,
  getRescheduleOptions, // ADD THIS EXPORT
  createAppointment,
  updateAppointment,
  concludeAppointment,
  deleteAppointment,
  updateAppointmentStatus,
};
