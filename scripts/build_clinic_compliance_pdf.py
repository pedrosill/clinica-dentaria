from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "dentalpro-clinica-checklist-conformidade.pdf"

PAGE_W, PAGE_H = A4
MARGIN = 16 * mm
TEAL = colors.HexColor("#0f766e")
NAVY = colors.HexColor("#0f172a")
SLATE = colors.HexColor("#475569")
LIGHT = colors.HexColor("#f1f5f9")
BORDER = colors.HexColor("#cbd5e1")


styles = getSampleStyleSheet()
body = ParagraphStyle("body", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.5, leading=11, textColor=SLATE, spaceAfter=3)
small = ParagraphStyle("small", parent=body, fontSize=7.2, leading=9)
section = ParagraphStyle("section", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=12, leading=14, textColor=NAVY, spaceAfter=6)


def draw_header(c, title, page_no):
    c.setFillColor(TEAL)
    c.rect(0, PAGE_H - 14 * mm, PAGE_W, 14 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(MARGIN, PAGE_H - 9 * mm, "DentalPro - checklist de conformidade da clínica")
    c.setFont("Helvetica", 7)
    c.drawRightString(PAGE_W - MARGIN, PAGE_H - 9 * mm, f"Página {page_no}")
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(MARGIN, PAGE_H - 27 * mm, title)


def draw_footer(c):
    c.setStrokeColor(BORDER)
    c.line(MARGIN, 12 * mm, PAGE_W - MARGIN, 12 * mm)
    c.setFillColor(SLATE)
    c.setFont("Helvetica", 6.5)
    c.drawString(MARGIN, 8 * mm, "Documento de trabalho para preenchimento e aprovação da clínica. Não é certificação jurídica.")


def paragraph(c, text, x, y, width, style=body):
    p = Paragraph(text, style)
    w, h = p.wrap(width, PAGE_H)
    p.drawOn(c, x, y - h)
    return y - h


def field(c, name, label, x, y, width, height=8 * mm, value=""):
    c.setFillColor(SLATE)
    c.setFont("Helvetica-Bold", 7.2)
    c.drawString(x, y, label)
    c.acroForm.textfield(name=name, value=value, x=x, y=y - height - 2 * mm, width=width, height=height, borderColor=BORDER, fillColor=colors.white, textColor=NAVY, borderWidth=0.8, forceBorder=True, fontName="Helvetica", fontSize=8)
    return y - height - 8 * mm


def checkbox(c, name, label, x, y, checked=False):
    c.acroForm.checkbox(name=name, x=x, y=y - 3 * mm, buttonStyle="check", borderColor=BORDER, fillColor=colors.white, textColor=TEAL, borderWidth=0.8, size=4 * mm, checked=checked)
    c.setFillColor(SLATE)
    c.setFont("Helvetica", 8)
    c.drawString(x + 6 * mm, y, label)
    return y - 6 * mm


def section_box(c, title, x, y, width):
    c.setFillColor(LIGHT)
    c.roundRect(x, y - 9 * mm, width, 9 * mm, 2 * mm, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x + 4 * mm, y - 6 * mm, title)
    return y - 14 * mm


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=A4)
    c.setTitle("DentalPro - Checklist de conformidade da clínica")
    c.setAuthor("DentalPro")

    # Page 1
    draw_header(c, "Identidade e responsabilidades", 1)
    y = PAGE_H - 36 * mm
    y = paragraph(c, "Preencher pela clínica antes do primeiro uso com dados reais. A app usa esta informação como evidência operacional; a clínica deve confirmar a exatidão e obter aconselhamento jurídico quando necessário.", MARGIN, y, PAGE_W - 2 * MARGIN)
    y -= 5 * mm
    y = section_box(c, "1. Identidade da clínica", MARGIN, y, PAGE_W - 2 * MARGIN)
    y = field(c, "clinic_name", "Nome comercial e denominação legal", MARGIN, y, 82 * mm)
    y = field(c, "clinic_address", "Morada da clínica", MARGIN, y, 82 * mm)
    y = field(c, "clinic_tax_id", "NIPC/NIF", MARGIN, y, 38 * mm)
    y = field(c, "ers_registration", "Registo ERS / referência", MARGIN + 47 * mm, y + 16 * mm, 70 * mm)
    y -= 2 * mm
    y = section_box(c, "2. Responsáveis", MARGIN, y, PAGE_W - 2 * MARGIN)
    y = field(c, "controller_name", "Responsável pelo tratamento", MARGIN, y, 82 * mm)
    y = field(c, "privacy_coordinator", "Coordenação diária de privacidade / secretaria", MARGIN, y, 82 * mm)
    y = field(c, "clinical_lead", "Responsável clínico / médica dentista", MARGIN, y, 82 * mm)
    y = field(c, "dpo_decision", "EPD/DPO: nome, contacto ou decisão de não aplicabilidade", MARGIN, y, 82 * mm)
    y -= 2 * mm
    y = section_box(c, "3. Contactos", MARGIN, y, PAGE_W - 2 * MARGIN)
    y = field(c, "privacy_contact", "Contacto para pedidos de titulares", MARGIN, y, 82 * mm)
    y = field(c, "incident_contact", "Contacto de emergência / incidentes", MARGIN, y, 82 * mm)
    y = field(c, "technical_owner", "Fornecedor ou owner técnico", MARGIN, y, 82 * mm)
    draw_footer(c)
    c.showPage()

    # Page 2
    draw_header(c, "Privacidade e ciclo de vida dos dados", 2)
    y = PAGE_H - 36 * mm
    y = paragraph(c, "Assinalar apenas depois de a clínica ter a evidência disponível. Incluir referências a documentos aprovados, localização segura e data de revisão.", MARGIN, y, PAGE_W - 2 * MARGIN)
    y -= 5 * mm
    y = section_box(c, "4. Documentação e base legal", MARGIN, y, PAGE_W - 2 * MARGIN)
    for idx, label in enumerate([
        "Registo de atividades de tratamento preenchido e revisto",
        "Informação de privacidade entregue aos pacientes e canal de contacto",
        "Base legal e finalidades aprovadas para dados administrativos e de saúde",
        "Contratos com subcontratantes, alojamento e suporte revistos",
        "Localização dos dados e transferências internacionais avaliadas",
        "Decisão documentada sobre EPD/DPO e avaliação de risco/AIPD quando aplicável",
    ]):
        y = checkbox(c, f"privacy_{idx}", label, MARGIN, y)
    y -= 3 * mm
    y = field(c, "privacy_evidence", "Referência dos documentos / localização da evidência", MARGIN, y, 82 * mm, 12 * mm)
    y = section_box(c, "5. Conservação e direitos dos titulares", MARGIN, y, PAGE_W - 2 * MARGIN)
    for idx, label in enumerate([
        "Prazos de conservação aprovados pela clínica e suporte jurídico/clinico",
        "Pedidos de acesso, retificação, limitação e eliminação têm canal e responsável",
        "Identidade do requerente é verificada e cada pedido fica registado",
        "Exportações têm motivo, âmbito e auditoria; não são enviadas sem revisão",
        "Eliminação/anonymização verifica retention holds e conserva o que for obrigatório",
    ]):
        y = checkbox(c, f"rights_{idx}", label, MARGIN, y)
    y -= 3 * mm
    y = field(c, "retention_review", "Prazos, política e próxima revisão", MARGIN, y, 82 * mm, 12 * mm)
    draw_footer(c)
    c.showPage()

    # Page 3
    draw_header(c, "Segurança, documentos e continuidade", 3)
    y = PAGE_H - 36 * mm
    y = paragraph(c, "Estes controlos combinam funcionalidades da app com configuração do host. A aprovação deve referir quem executou o teste e onde foi guardada a evidência.", MARGIN, y, PAGE_W - 2 * MARGIN)
    y -= 5 * mm
    y = section_box(c, "6. Acessos e autenticação", MARGIN, y, PAGE_W - 2 * MARGIN)
    for idx, label in enumerate([
        "Contas individuais para administradora técnica, secretaria e médica dentista",
        "Secretaria tem acesso operacional e transcrição, sem validação clínica final",
        "MFA ativo nas contas privilegiadas e recuperação com tokens one-time",
        "Passwords iniciais alteradas e recuperação de acesso testada",
        "Sessões são revogadas após alteração de password ou desativação",
    ]):
        y = checkbox(c, f"access_{idx}", label, MARGIN, y)
    y -= 3 * mm
    y = section_box(c, "7. Armazenamento e auditoria", MARGIN, y, PAGE_W - 2 * MARGIN)
    for idx, label in enumerate([
        "HTTPS/proxy e origem autorizada confirmados",
        "Volume de produção cifrado e permissões do sistema operativo restritas",
        "Documentos privados fora do web root, com hash e download auditado",
        "Acessos, exportações, downloads, validações e alterações sensíveis auditados",
    ]):
        y = checkbox(c, f"storage_{idx}", label, MARGIN, y)
    y -= 3 * mm
    y = section_box(c, "8. Backups e restauro", MARGIN, y, PAGE_W - 2 * MARGIN)
    for idx, label in enumerate([
        "Backup cifrado agendado e cópia externa aprovada",
        "Verificação diária de backup recente e alerta de falha",
        "Pasta privada de documentos incluída numa estratégia de backup cifrada",
        "Restauro para teste executado com RPO/RTO registados",
        "Retenção e destruição de cópias aprovadas pela clínica",
    ]):
        y = checkbox(c, f"backup_{idx}", label, MARGIN, y)
    y -= 3 * mm
    y = field(c, "backup_evidence", "Evidência: backup, cópia externa, teste de restauro, RPO/RTO", MARGIN, y, 82 * mm, 12 * mm)
    draw_footer(c)
    c.showPage()

    # Page 4
    draw_header(c, "Migração clínica e aprovação", 4)
    y = PAGE_H - 36 * mm
    y = section_box(c, "9. Migração de processos em papel", MARGIN, y, PAGE_W - 2 * MARGIN)
    y = paragraph(c, "Fluxo acordado: a secretaria transcreve o conteúdo necessário como rascunho identificado como paper_transcription; a médica dentista revê, corrige quando necessário e valida. Só depois a nota fica final e imutável. Não usar contas partilhadas.", MARGIN, y, PAGE_W - 2 * MARGIN)
    y -= 3 * mm
    for idx, label in enumerate([
        "Amostra de migração revista pela médica dentista",
        "Procedimento para dúvidas, lacunas e documentos ilegíveis",
        "Processos em papel mantidos ou destruídos segundo decisão documentada",
        "Cada transcrição tem operador, data, estado transcrito e validação",
        "A app não é usada como substituto de faturação certificada",
    ]):
        y = checkbox(c, f"migration_{idx}", label, MARGIN, y)
    y -= 5 * mm
    y = section_box(c, "10. Aprovação do deployment", MARGIN, y, PAGE_W - 2 * MARGIN)
    y = paragraph(c, "Ao assinar, a clínica confirma que recebeu a configuração, conhece os limites técnicos, aprovou responsáveis e procedimentos, e não interpreta este documento como parecer jurídico ou certificação de conformidade.", MARGIN, y, PAGE_W - 2 * MARGIN)
    y -= 5 * mm
    y = field(c, "approval_config", "Configuração e acessos aprovados por", MARGIN, y, 82 * mm)
    y = field(c, "approval_clinical", "Fluxo clínico e migração aprovados por", MARGIN, y, 82 * mm)
    y = field(c, "approval_continuity", "Backups, restauro e incidentes aprovados por", MARGIN, y, 82 * mm)
    y = field(c, "approval_date", "Data de aprovação e próxima revisão", MARGIN, y, 82 * mm)
    y = field(c, "approval_signature", "Assinatura / aceite da entidade responsável", MARGIN, y, 82 * mm, 15 * mm)
    y = field(c, "clinical_signature", "Assinatura / aceite da responsável clínica", MARGIN, y, 82 * mm, 15 * mm)
    draw_footer(c)
    c.save()


if __name__ == "__main__":
    build()
