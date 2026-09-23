const privacyNoticeService = require('../services/privacyNoticeService');

function sendPublicPage(res, html) {
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
  return res.type('html').send(html);
}

async function show(req, res, next) {
  try {
    const delivery = await privacyNoticeService.getPublicDelivery(req.params.token);
    return sendPublicPage(res, privacyNoticeService.renderPage({ token: req.params.token, delivery }));
  } catch (error) {
    return next(error);
  }
}

async function respond(req, res, next) {
  try {
    const result = await privacyNoticeService.respond(req.params.token, req.body?.choice, { req });
    return sendPublicPage(res, privacyNoticeService.renderPage({
      token: req.params.token,
      delivery: result.delivery,
      result: result.expired
        ? 'Esta ligação expirou. Contacte diretamente a clínica para receber um novo aviso.'
        : result.alreadyResponded
          ? 'A sua resposta já tinha sido registada.'
          : 'Obrigado. A sua resposta foi enviada para a clínica.',
    }));
  } catch (error) {
    return next(error);
  }
}

module.exports = { show, respond };
