import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../services/api';
import useAuth from './useAuth';
import { LanguageContext } from './language-context';
import { LANGUAGE_OPTIONS } from './languageConstants';

const STORAGE_KEY = 'dentalpro-language';
const DEFAULT_LANGUAGE = 'en';

const translations = {
  'pt-PT': {
    'Clinic workspace': 'Espaço da clínica',
    'Clinical Suite': 'Suite clínica',
    Dashboard: 'Painel',
    Patients: 'Pacientes',
    Agenda: 'Agenda',
    Doctors: 'Médicos',
    Settings: 'Definições',
    'Sign out': 'Terminar sessão',
    'Sign in': 'Iniciar sessão',
    'Signing in…': 'A iniciar sessão…',
    'Sign in to manage the clinic safely.': 'Inicie sessão para gerir a clínica em segurança.',
    Email: 'Email',
    Password: 'Palavra-passe',
    'Loading clinic workspace…': 'A carregar o espaço da clínica…',
    'Clinic setup': 'Configuração da clínica',
    'Configure the operational rules used by the agenda, new appointments, and rescheduling.': 'Configure as regras operacionais usadas pela agenda, pelos novos agendamentos e pelos reagendamentos.',
    'Only administrators can change clinic settings.': 'Apenas os administradores podem alterar as definições da clínica.',
    'Practice schedule': 'Horário da clínica',
    'These hours control every available start time in the booking engine.': 'Este horário controla todas as horas de início disponíveis no sistema de agendamento.',
    'Clinic name': 'Nome da clínica',
    Timezone: 'Fuso horário',
    Language: 'Idioma',
    English: 'Inglês',
    'Portuguese (Portugal)': 'Português (Portugal)',
    Day: 'Dia',
    Open: 'Aberto',
    Hours: 'Horário',
    Break: 'Pausa',
    Monday: 'Segunda-feira',
    Tuesday: 'Terça-feira',
    Wednesday: 'Quarta-feira',
    Thursday: 'Quinta-feira',
    Friday: 'Sexta-feira',
    Saturday: 'Sábado',
    Sunday: 'Domingo',
    to: 'a',
    'Appointment grid is fixed at 30 minutes. The latest valid start is calculated from the closing time and duration.': 'A grelha de agendamento está fixa em intervalos de 30 minutos. A última hora válida é calculada a partir do fecho e da duração.',
    'Save schedule': 'Guardar horário',
    'Closures and holidays': 'Encerramentos e feriados',
    'Block a specific date without changing the weekly schedule.': 'Bloqueie uma data específica sem alterar o horário semanal.',
    'Reason, e.g. Christmas': 'Motivo, por exemplo Natal',
    Add: 'Adicionar',
    'No special closures configured.': 'Não existem encerramentos especiais configurados.',
    'Appointment types': 'Tipos de consulta',
    'Templates set the default duration used by new bookings.': 'Os modelos definem a duração predefinida dos novos agendamentos.',
    'Appointment type': 'Tipo de consulta',
    'Appointment type added.': 'Tipo de consulta adicionado.',
    'Appointment type saved.': 'Tipo de consulta guardado.',
    'Appointment type archived. Existing appointments are unchanged.': 'Tipo de consulta arquivado. As consultas existentes não foram alteradas.',
    'Provider availability': 'Disponibilidade dos médicos',
    'Override the clinic schedule for individual doctors when their working days differ.': 'Sobreponha o horário da clínica para médicos individuais quando os seus dias de trabalho forem diferentes.',
    Works: 'Trabalha',
    'Configure weekly availability': 'Configurar disponibilidade semanal',
    'Signed-in account': 'Conta com sessão iniciada',
    'Settings are protected by role': 'As definições estão protegidas por função',
    'Slot interval: 30 minutes': 'Intervalo: 30 minutos',
    'Clinic schedule saved. Availability now uses these hours.': 'Horário da clínica guardado. A disponibilidade usa agora este horário.',
    'Closure added. No appointments can be booked on that date.': 'Encerramento adicionado. Não é possível marcar consultas nessa data.',
    'Closure removed.': 'Encerramento removido.',
    'Provider schedule saved.': 'Horário do médico guardado.',
    'Add a doctor first to configure provider availability.': 'Adicione primeiro um médico para configurar a disponibilidade.',
    'Loading clinic settings…': 'A carregar as definições da clínica…',
    'Save': 'Guardar',
    'Cancel': 'Cancelar',
    'Close': 'Fechar',
    'Search': 'Pesquisar',
    'Save changes': 'Guardar alterações',
    'No appointments': 'Sem consultas',
    'Upcoming agenda': 'Próximas consultas',
    'Clinic overview': 'Visão geral da clínica',
    'Review patients and upcoming appointments across the clinic.': 'Consulte os pacientes e as próximas consultas da clínica.',
    'Open Patients': 'Abrir pacientes',
    'Patient count': 'Número de pacientes',
    'Current registered patients': 'Pacientes atualmente registados',
    'Next scheduled appointments': 'Próximas consultas marcadas',
    'Unknown patient': 'Paciente desconhecido',
    Consultation: 'Consulta',
    'No upcoming appointments': 'Sem próximas consultas',
    'Future scheduled appointments will appear here.': 'As consultas futuras marcadas aparecerão aqui.',
    'Open agenda': 'Abrir agenda',
    'Add appointment': 'Adicionar consulta',
    'Add doctor': 'Adicionar médico',
    'Add patient': 'Adicionar paciente',
    'Search all patients and work from today\'s active appointment list.': 'Pesquise pacientes e trabalhe a partir da lista de consultas ativas de hoje.',
    'Search all patients by name, phone, email or NIF': 'Pesquisar pacientes por nome, telefone, email ou NIF',
    'Search results': 'Resultados da pesquisa',
    'All existing patients': 'Todos os pacientes existentes',
    result: 'resultado',
    results: 'resultados',
    'No matching patients found': 'Não foram encontrados pacientes correspondentes',
    'Try a different name, phone, email or NIF.': 'Tente outro nome, telefone, email ou NIF.',
    'Open patient': 'Abrir paciente',
    'Patients with appointments today': 'Pacientes com consultas hoje',
    'No patients scheduled for today': 'Não há pacientes marcados para hoje',
    'Today\'s operational patient list will appear here once appointments exist.': 'A lista operacional de pacientes de hoje aparecerá aqui quando existirem consultas.',
    'Full name, phone, email, NIF and nationality are required': 'Nome completo, telefone, email, NIF e nacionalidade são obrigatórios',
    'Portuguese NIF must contain exactly 9 digits': 'O NIF português deve conter exatamente 9 algarismos',
    'Search all doctors and manage clinical staff records.': 'Pesquise médicos e faça a gestão dos registos da equipa clínica.',
    'Search all doctors by name, email, phone or specialty': 'Pesquisar médicos por nome, email, telefone ou especialidade',
    'Secretary workflow': 'Fluxo de trabalho da receção',
    'Review the week, prepare today\'s patients, and manage bookings.': 'Consulte a semana, prepare os pacientes de hoje e faça a gestão das marcações.',
    Week: 'Semana',
    Month: 'Mês',
    Today: 'Hoje',
    'Create Appointment': 'Criar consulta',
    'Reschedule Appointment': 'Reagendar consulta',
    'Save reschedule': 'Guardar reagendamento',
    'Open appointment': 'Abrir consulta',
    'Back to patients': 'Voltar aos pacientes',
    'Completed appointment': 'Consulta concluída',
    'Appointment detail': 'Detalhes da consulta',
    Appointment: 'Consulta',
    'Review the completed visit outcome and recorded notes.': 'Consulte o resultado da visita e as notas registadas.',
    'Review timing, treatment, completion outcome, and reschedule safely when needed.': 'Consulte o horário, tratamento e resultado, e reagende em segurança quando necessário.',
    'Edit appointment': 'Editar consulta',
    Reschedule: 'Reagendar',
    Patient: 'Paciente',
    'Linked patient information': 'Informação do paciente associado',
    'No phone number available': 'Número de telefone indisponível',
    'Open patient record': 'Abrir registo do paciente',
    'Related appointments': 'Consultas relacionadas',
    'Recent appointments for this patient': 'Consultas recentes deste paciente',
    'No other appointments found': 'Não foram encontradas outras consultas',
    'Mark as arrived': 'Marcar como chegado',
    'Mark as no-show': 'Marcar como falta',
    'Conclude appointment': 'Concluir consulta',
    'Workflow actions': 'Ações da consulta',
    'Update attendance, conclude the visit, or move directly into follow-up scheduling.': 'Atualize a presença, conclua a consulta ou avance diretamente para o reagendamento.',
    'Reschedule appointment': 'Reagendar consulta',
    'Conclude Appointment': 'Concluir consulta',
    'This appointment has already been concluded.': 'Esta consulta já foi concluída.',
    'This appointment is closed and cannot be edited or rescheduled': 'Esta consulta está encerrada e não pode ser editada ou reagendada.',
    'Clinical record': 'Registo clínico',
    'Medical history': 'Histórico clínico',
    'Treatment plan': 'Plano de tratamento',
    Odontogram: 'Odontograma',
  },
};

function getStoredLanguage() {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return LANGUAGE_OPTIONS.some((option) => option.value === stored) ? stored : DEFAULT_LANGUAGE;
}

export default function LanguageProvider({ children }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState(getStoredLanguage);

  useEffect(() => {
    let isMounted = true;
    if (!user) return undefined;

    apiRequest('/api/settings')
      .then((settings) => {
        if (isMounted && settings?.language) {
          setLanguageState(settings.language);
          window.localStorage.setItem(STORAGE_KEY, settings.language);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [user]);

  const setLanguage = useCallback((nextLanguage) => {
    const normalized = LANGUAGE_OPTIONS.some((option) => option.value === nextLanguage)
      ? nextLanguage
      : DEFAULT_LANGUAGE;
    setLanguageState(normalized);
    window.localStorage.setItem(STORAGE_KEY, normalized);
  }, []);

  const t = useCallback((value) => translations[language]?.[value] || value, [language]);

  useEffect(() => {
    document.documentElement.lang = language === 'pt-PT' ? 'pt-PT' : 'en';
  }, [language]);

  const value = useMemo(() => ({
    language,
    locale: language === 'pt-PT' ? 'pt-PT' : 'en-GB',
    setLanguage,
    t,
  }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
