const FALLBACK_RETURN_CONTEXT = Object.freeze({
  pathname: '/patients',
  search: '',
  labelKey: 'Back to patients',
});

function normalizeSearch(search) {
  return typeof search === 'string' ? search : '';
}

function normalizePathname(pathname) {
  return typeof pathname === 'string' && pathname.startsWith('/')
    ? pathname
    : FALLBACK_RETURN_CONTEXT.pathname;
}

export function createAppointmentReturnState(location, labelKey = FALLBACK_RETURN_CONTEXT.labelKey) {
  return {
    returnTo: {
      pathname: normalizePathname(location?.pathname),
      search: normalizeSearch(location?.search),
      labelKey: typeof labelKey === 'string' && labelKey.trim()
        ? labelKey
        : FALLBACK_RETURN_CONTEXT.labelKey,
    },
  };
}

export function getAppointmentReturnContext(location) {
  const returnTo = location?.state?.returnTo;

  if (!returnTo || typeof returnTo !== 'object') {
    return FALLBACK_RETURN_CONTEXT;
  }

  return {
    pathname: normalizePathname(returnTo.pathname),
    search: normalizeSearch(returnTo.search),
    labelKey: typeof returnTo.labelKey === 'string' && returnTo.labelKey.trim()
      ? returnTo.labelKey
      : FALLBACK_RETURN_CONTEXT.labelKey,
  };
}

export function getAppointmentReturnPath(location) {
  const context = getAppointmentReturnContext(location);
  return `${context.pathname}${context.search}`;
}
