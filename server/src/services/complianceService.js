const fs = require('node:fs');
const path = require('node:path');
const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const { parseNumericId } = require('../utils/parse');
const { recordAuditEvent } = require('./auditService');

const DEFAULT_ITEMS = [
  ['clinic_identity', 'Identidade da clínica e registo ERS', 'legal', 'Preencher a entidade, morada, NIPC/NIF, registo ERS e licenças aplicáveis.', 'manual'],
  ['responsibilities', 'Responsáveis documentados', 'governance', 'Registar responsável pelo tratamento, coordenação de privacidade e responsável clínico.', 'manual'],
  ['privacy_notice', 'Informação de privacidade aprovada', 'privacy', 'Guardar evidência da informação entregue aos pacientes e dos canais de contacto.', 'manual'],
  ['processing_register', 'Registo de atividades de tratamento', 'privacy', 'Manter finalidades, categorias, prazos, destinatários e transferências documentados.', 'manual'],
  ['retention_schedule', 'Prazos de conservação aprovados', 'privacy', 'Aprovar prazos com base na orientação jurídica e clínica aplicável.', 'manual'],
  ['access_matrix', 'Perfis e princípio da necessidade', 'security', 'Rever os acessos da secretária, doutora e administrador técnico.', 'manual'],
  ['mfa', 'MFA ativo nas contas privilegiadas', 'security', 'O ambiente de producao deve exigir MFA nas contas com acesso a dados clinicos.', 'mixed'],
  ['https', 'Acesso local e não exposição à rede', 'security', 'Confirmar que a aplicação está limitada ao computador da clínica e não está exposta à rede. Se for necessário acesso por outros dispositivos, configurar HTTPS e um proxy controlado.', 'mixed'],
  ['volume_encryption', 'Cifragem do volume de produção', 'security', 'Ativar BitLocker ou cifragem equivalente no host que guarda a base e os documentos.', 'manual'],
  ['private_documents', 'Documentos em armazenamento privado', 'security', 'Confirmar diretoria fora do web root, permissoes restritas e backups incluidos.', 'mixed'],
  ['backup_schedule', 'Backup cifrado automático e cópia externa', 'continuity', 'Agendar o comando de backup, configurar segunda cópia e verificar o estado.', 'mixed'],
  ['restore_test', 'Teste de restauro documentado', 'continuity', 'Registar data, operador, RPO, RTO e resultado de um restauro para teste.', 'manual'],
  ['clinical_migration', 'Migração clínica com validação', 'clinical', 'Registar transcrições em papel e validá-las pela doutora antes de as considerar finais.', 'manual'],
  ['rights_requests', 'Procedimento para direitos dos titulares', 'privacy', 'Definir receção, verificação de identidade, resposta, prazos e registo de pedidos.', 'manual'],
  ['incident_response', 'Procedimento de incidentes e contactos', 'security', 'Preencher responsaveis, contactos, contencao, comunicacao e exercicio.', 'manual'],
  ['deployment_approval', 'Aprovação do deployment pela clínica', 'operations', 'Guardar a aprovação da configuração, backup, acessos, conservação e procedimento de incidente.', 'manual'],
];

function assertManager(user) {
  if (!user || !['admin', 'receptionist'].includes(user.role)) throw new HttpError(403, 'Only the clinic administrator or secretary may manage compliance records');
}

function assertApprover(user) {
  if (!user || !['admin', 'dentist'].includes(user.role)) throw new HttpError(403, 'Only the administrator or clinical lead may approve compliance records');
}

function resolvePath(value) {
  return path.isAbsolute(value) ? value : path.resolve(__dirname, '../../', value || '');
}

async function ensureDefaults() {
  await prisma.$transaction(
    DEFAULT_ITEMS.map(([code, title, category, description, validationMode]) => prisma.complianceItem.upsert({
      where: { code },
      update: { title, category, description, validationMode },
      create: { code, title, category, description, validationMode },
    }))
  );
}

function automaticCheck(item) {
  if (item.code === 'mfa') return process.env.NODE_ENV === 'production' ? 'review' : 'not_checked';
  if (item.code === 'https') {
    const localOnly = process.env.NODE_ENV !== 'production' || ['1', 'true', 'yes'].includes(String(process.env.LOCAL_ONLY || '').trim().toLowerCase());
    const host = String(process.env.HOST || '127.0.0.1').trim().toLowerCase();
    const localHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    if (localOnly && localHost && String(process.env.CLIENT_ORIGIN || '').split(',').filter(Boolean).every((origin) => /^(http:\/\/localhost|http:\/\/127\.0\.0\.1|http:\/\/\[::1\])/.test(origin.trim()))) return 'passed';
    return process.env.NODE_ENV === 'production' && process.env.CLIENT_ORIGIN?.startsWith('https://') ? 'passed' : 'review';
  }
  if (item.code === 'private_documents') return process.env.PRIVATE_DOCUMENTS_DIR ? 'passed' : 'review';
  if (item.code === 'backup_schedule') {
    const statusFile = resolvePath(process.env.BACKUP_STATUS_FILE || path.join(process.env.BACKUP_DIR || 'backups', 'backup-status.json'));
    try {
      const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
      const fresh = Date.now() - new Date(status.completedAt).getTime() <= 26 * 3600000;
      return status.encrypted && fresh && (status.secondaryPath || process.env.BACKUP_SECONDARY_DIR) ? 'passed' : 'review';
    } catch { return 'review'; }
  }
  if (item.code === 'volume_encryption') return 'manual';
  return 'manual';
}

function effectiveState(item, automaticState = item.automaticState) {
  if (item.manualState === 'approved' && ['passed', 'manual', 'not_checked'].includes(automaticState)) return 'approved';
  if (automaticState === 'passed') return 'passed';
  if (item.manualState === 'not_applicable') return 'not_applicable';
  return item.manualState === 'rejected' ? 'blocked' : 'pending';
}

async function listCompliance(user) {
  assertManager(user);
  await ensureDefaults();
  const items = await prisma.complianceItem.findMany({ orderBy: [{ category: 'asc' }, { title: 'asc' }], include: { owner: { select: { id: true, displayName: true } }, approvedBy: { select: { id: true, displayName: true } } } });
  return items.map((item) => {
    const automaticState = automaticCheck(item);
    return { ...item, automaticState, effectiveState: effectiveState(item, automaticState) };
  });
}

async function updateCompliance(itemId, payload = {}, user, req) {
  assertManager(user);
  const id = parseNumericId(itemId, 'compliance item id');
  const existing = await prisma.complianceItem.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Compliance item not found');
  const manualState = payload.manualState === undefined ? existing.manualState : String(payload.manualState);
  if (!['pending', 'approved', 'rejected', 'not_applicable'].includes(manualState)) throw new HttpError(400, 'Invalid compliance state');
  if (manualState === 'approved') assertApprover(user);
  const updated = await prisma.complianceItem.update({
    where: { id },
    data: {
      manualState,
      evidence: payload.evidence === undefined ? existing.evidence : String(payload.evidence || '').slice(0, 4000) || null,
      notes: payload.notes === undefined ? existing.notes : String(payload.notes || '').slice(0, 4000) || null,
      ownerId: payload.ownerId === undefined ? existing.ownerId : (payload.ownerId ? parseNumericId(payload.ownerId, 'owner id') : null),
      reviewDueAt: payload.reviewDueAt === undefined ? existing.reviewDueAt : (payload.reviewDueAt ? new Date(payload.reviewDueAt) : null),
      approvedById: manualState === 'approved' ? user.id : null,
      approvedAt: manualState === 'approved' ? new Date() : null,
    },
    include: { owner: { select: { id: true, displayName: true } }, approvedBy: { select: { id: true, displayName: true } } },
  });
  await recordAuditEvent({ req, actor: user, action: manualState === 'approved' ? 'approve' : 'update', resource: 'compliance', resourceId: id, result: 'success', metadata: { code: existing.code, manualState }, required: true });
  return { ...updated, automaticState: automaticCheck(updated), effectiveState: effectiveState(updated, automaticCheck(updated)) };
}

module.exports = { listCompliance, updateCompliance, DEFAULT_ITEMS };
