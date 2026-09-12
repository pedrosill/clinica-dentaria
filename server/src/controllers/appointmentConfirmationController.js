const confirmationService = require('../services/appointmentConfirmationService');
const appointmentService = require('../services/appointmentService');

async function send(req, res, next) {
  try {
    await appointmentService.getAppointmentById(req.params.appointmentId, req.user);
    const confirmation = await confirmationService.sendAppointmentConfirmation(req.params.appointmentId, {
      req,
      actor: req.user,
    });
    return res.status(confirmation.alreadySent ? 200 : 202).json(confirmation);
  } catch (error) {
    return next(error);
  }
}

async function show(req, res, next) {
  try {
    const confirmation = await confirmationService.getConfirmation(req.params.token);
    return res.type('html').send(confirmationService.renderConfirmationPage({
      token: req.params.token,
      confirmation,
      proposedChoice: req.query.choice,
    }));
  } catch (error) {
    return next(error);
  }
}

async function respond(req, res, next) {
  try {
    const result = await confirmationService.respondToConfirmation(req.params.token, req.body?.choice, { req });
    return res.type('html').send(confirmationService.renderConfirmationPage({
      token: req.params.token,
      confirmation: result.confirmation,
      result: result.alreadyResponded ? 'A sua resposta já tinha sido registada.' : 'Obrigado. A sua resposta foi enviada para a clínica.',
    }));
  } catch (error) {
    return next(error);
  }
}

module.exports = { send, show, respond };
