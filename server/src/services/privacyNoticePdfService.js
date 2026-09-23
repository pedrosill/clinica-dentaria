const PDFDocument = require('pdfkit');

function clinicName() {
  return process.env.CLINIC_NAME || 'Clínica dentária';
}

function privacyNoticeVersion() {
  return String(process.env.PRIVACY_NOTICE_VERSION || '1.0').trim() || '1.0';
}

function privacyNoticeText() {
  return String(
    process.env.PRIVACY_NOTICE_TEXT
      || 'A clínica entrega este aviso para explicar como os dados pessoais e de saúde são tratados no âmbito da prestação de cuidados de saúde. O paciente pode contactar a clínica para exercer os direitos aplicáveis ou comunicar uma oposição. Este texto deve ser revisto e aprovado pela clínica antes da utilização com dados reais.'
  ).trim();
}

function formatDate(value) {
  if (!value) return 'Não registada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Não registada';
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium' }).format(date);
}

function addFooter(document) {
  const footerY = document.page.height - 48;
  document.fontSize(8).fillColor('#64748b').text(
    `${clinicName()} - Aviso de privacidade - versão ${privacyNoticeVersion()}`,
    50,
    footerY,
    { align: 'center', width: document.page.width - 100 }
  );
}

function createPrivacyNoticePdf(patient) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: 'A4', margin: 50, info: { Title: 'Aviso de privacidade' } });
    const chunks = [];
    document.on('data', (chunk) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);

    document.fillColor('#0f766e').fontSize(11).font('Helvetica-Bold').text(clinicName().toUpperCase());
    document.moveDown(0.6);
    document.fillColor('#172033').fontSize(20).text('Aviso de privacidade');
    document.font('Helvetica').fontSize(10).fillColor('#64748b').text(`Versão ${privacyNoticeVersion()}`);
    document.moveDown(1.2);

    document.font('Helvetica-Bold').fontSize(11).fillColor('#172033').text('Identificação do paciente');
    document.moveDown(0.35);
    document.font('Helvetica').fontSize(10).text(`Nome: ${patient.fullName || 'Não registado'}`);
    document.text(`Email: ${patient.email || 'Não registado'}`);
    document.text(`Telefone: ${patient.phone || 'Não registado'}`);
    document.text(`NIF: ${patient.nif || 'Não registado'}`);
    document.text(`Data de nascimento: ${formatDate(patient.dateOfBirth)}`);
    document.moveDown(1.2);

    document.font('Helvetica-Bold').fontSize(11).text('Informação');
    document.moveDown(0.35);
    document.font('Helvetica').fontSize(10).text(privacyNoticeText(), { align: 'left', lineGap: 4 });
    document.moveDown(1.2);

    document.font('Helvetica-Bold').fontSize(11).text('Registo de entrega');
    document.moveDown(0.35);
    document.font('Helvetica').fontSize(10).text('A clínica deve registar a data e o meio através do qual este aviso foi entregue ao paciente.');
    document.moveDown(1.5);
    document.text('Data de entrega: __________________________________________');
    document.moveDown(1.2);
    document.text('Assinatura do paciente (se aplicável):');
    document.moveDown(1.6);
    document.text('____________________________________________________________');
    document.moveDown(1.6);
    document.text('Assinatura/identificação da clínica:');
    document.moveDown(1.6);
    document.text('____________________________________________________________');

    addFooter(document);
    document.end();
  });
}

module.exports = {
  createPrivacyNoticePdf,
  privacyNoticeText,
  privacyNoticeVersion,
};
