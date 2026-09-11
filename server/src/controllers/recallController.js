const recallService = require('../services/recallService');

async function listRecalls(req, res) {
  return res.status(200).json(await recallService.listRecalls(req.query, req.user));
}

async function createRecall(req, res) {
  return res.status(201).json(
    await recallService.createRecall(req.params.patientId, req.body, req.user, req)
  );
}

async function transitionRecall(req, res) {
  return res.status(200).json(
    await recallService.transitionRecall(req.params.id, req.body, req.user, req)
  );
}

module.exports = {
  listRecalls,
  createRecall,
  transitionRecall,
};
