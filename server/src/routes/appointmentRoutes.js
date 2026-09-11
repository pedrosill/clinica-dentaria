const express = require('express');
const appointmentController = require('../controllers/appointmentController');
const { requirePermission } = require('../middleware/auth');

const router = express.Router();

router.get('/', requirePermission('appointment', 'read'), appointmentController.getAppointments);
router.get('/availability', requirePermission('appointment', 'read'), appointmentController.getAppointmentAvailability);
router.get('/:appointmentId', requirePermission('appointment', 'read'), appointmentController.getAppointmentById);

// ADD THIS NEW ROUTE
router.get('/:appointmentId/reschedule-options', requirePermission('appointment', 'read'), appointmentController.getRescheduleOptions);

router.post('/', requirePermission('appointment', 'schedule'), appointmentController.createAppointment);
router.put('/:appointmentId', requirePermission('appointment', 'schedule'), appointmentController.updateAppointment);
router.patch('/:appointmentId/conclude', requirePermission('appointment', 'clinicalWrite'), appointmentController.concludeAppointment);
router.patch('/:appointmentId/status', requirePermission('appointment', 'status'), appointmentController.updateAppointmentStatus);
router.delete('/:appointmentId', requirePermission('appointment', 'archive'), appointmentController.deleteAppointment);

module.exports = router;
