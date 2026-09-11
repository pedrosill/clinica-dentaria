const express = require('express');
const appointmentController = require('../controllers/appointmentController');

const router = express.Router();

router.get('/', appointmentController.getAppointments);
router.get('/availability', appointmentController.getAppointmentAvailability);
router.get('/:appointmentId', appointmentController.getAppointmentById);

// ADD THIS NEW ROUTE
router.get('/:appointmentId/reschedule-options', appointmentController.getRescheduleOptions);

router.post('/', appointmentController.createAppointment);
router.put('/:appointmentId', appointmentController.updateAppointment);
router.patch('/:appointmentId/conclude', appointmentController.concludeAppointment);
router.patch('/:appointmentId/status', appointmentController.updateAppointmentStatus);
router.delete('/:appointmentId', appointmentController.deleteAppointment);

module.exports = router;
