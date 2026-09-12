const service = require('../services/complianceService');

async function list(req, res) { res.json(await service.listCompliance(req.user)); }
async function update(req, res) { res.json(await service.updateCompliance(req.params.itemId, req.body, req.user, req)); }

module.exports = { list, update };
