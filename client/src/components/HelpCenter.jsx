import { CircleHelp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useLanguage from '../context/useLanguage';
import Dialog from './ui/Dialog';
import { getHelpTopicForPath, getVisibleHelpTopics } from './help/helpTopics';

export default function HelpCenter({ isOpen, onClose, role }) {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTopicId, setActiveTopicId] = useState(() => getHelpTopicForPath(location.pathname, role));
  const visibleTopics = getVisibleHelpTopics(role);
  const activeTopic = visibleTopics.find((topic) => topic.id === activeTopicId) || visibleTopics[0];

  useEffect(() => {
    if (!isOpen) return;
    // Start each opening on the area the user is currently viewing.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveTopicId(getHelpTopicForPath(location.pathname, role));
  }, [isOpen, location.pathname, role]);

  if (!isOpen || !activeTopic) return null;

  const ActiveIcon = activeTopic.icon;

  function openTopic() {
    onClose();
    navigate(activeTopic.path);
  }

  return (
    <div
      className="modal-backdrop fixed inset-0 z-[80] bg-slate-950/40"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        labelledBy="help-center-title"
        className="help-drawer-surface ml-auto flex h-full max-h-screen w-full max-w-xl flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 md:px-7">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <CircleHelp className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">{t('Help')}</p>
              <h2 id="help-center-title" className="mt-1 text-xl font-semibold text-slate-950 md:text-2xl">
                {t('Help center')}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {t('Choose an area to see what it is for and the usual workflow.')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-xl leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-200"
            aria-label={t('Close help')}
            title={t('Close help')}
          >
            ×
          </button>
        </header>

        <nav className="grid shrink-0 grid-cols-2 gap-2 overflow-y-auto border-b border-slate-200 bg-slate-50 p-3 sm:grid-cols-3 md:px-5" aria-label={t('Help topics')} role="tablist">
          {visibleTopics.map((topic) => {
            const Icon = topic.icon;
            const isActive = topic.id === activeTopic.id;
            return (
              <button
                key={topic.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="help-panel"
                id={`help-tab-${topic.id}`}
                onClick={() => setActiveTopicId(topic.id)}
                className={`flex min-w-0 items-center gap-2 rounded-2xl px-3 py-3 text-left text-sm font-medium transition ${isActive ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-700 hover:bg-white hover:text-slate-950'}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{t(topic.titleKey)}</span>
              </button>
            );
          })}
        </nav>

        <section
          key={activeTopic.id}
          id="help-panel"
          role="tabpanel"
          aria-labelledby={`help-tab-${activeTopic.id}`}
          tabIndex={0}
          className="help-topic-enter min-h-0 flex-1 overflow-y-auto p-5 outline-none md:p-7"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <ActiveIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-teal-700">{t('How this area works')}</p>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{t(activeTopic.titleKey)}</h3>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <HelpBlock title={t('What it is for')}>
              <p>{t(activeTopic.purposeKey)}</p>
            </HelpBlock>

            <HelpBlock title={t('When to use it')}>
              <p>{t(activeTopic.whenKey)}</p>
            </HelpBlock>

            <HelpBlock title={t('Typical workflow')}>
              <ol className="space-y-3">
                {activeTopic.stepsKeys.map((step, index) => (
                  <li key={step} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-semibold text-teal-800">{index + 1}</span>
                    <span>{t(step)}</span>
                  </li>
                ))}
              </ol>
            </HelpBlock>

            <HelpBlock title={t('What happens next')}>
              <p>{t(activeTopic.afterKey)}</p>
            </HelpBlock>

            <HelpBlock title={t('Limits and permissions')} tone="muted">
              <p>{t(activeTopic.permissionsKey)}</p>
            </HelpBlock>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <p className="font-semibold">{t('Practical note')}</p>
              <p className="mt-1">{t(activeTopic.tipKey)}</p>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
            <p className="text-xs text-slate-500">{t('You can return here at any time from the sidebar.')}</p>
            <button
              type="button"
              onClick={openTopic}
              className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-200"
            >
              {t(activeTopic.actionKey)}
            </button>
          </div>
        </section>
      </Dialog>
    </div>
  );
}

function HelpBlock({ title, children, tone = 'default' }) {
  return (
    <section className={`rounded-2xl border p-4 text-sm leading-6 ${tone === 'muted' ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-slate-200 bg-white text-slate-700 shadow-sm'}`}>
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <div className="mt-2">{children}</div>
    </section>
  );
}
