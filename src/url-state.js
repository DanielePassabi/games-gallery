const validStatuses = new Set(['all', 'completed', 'unfinished', 'multiplayer']);
const validViews = new Set(['grid', 'timeline']);
const validStatisticsTabs = new Set(['trend', 'habits', 'platforms']);

export function parseStatisticsState(search, { years = [] } = {}) {
  const params = new URLSearchParams(search);
  const available = new Set(years.map(String));
  const selection = params.get('stats-years');
  const selected = selection ? [...new Set(selection.split(','))].filter((year) => available.has(year)).sort() : [];
  const bins = Number(params.get('stats-bins'));
  return {
    section: params.get('section') === 'statistics' ? 'statistics' : 'explore',
    statisticsTab: validStatisticsTabs.has(params.get('stats-tab')) ? params.get('stats-tab') : 'trend',
    statisticsYears: selection === 'none' ? [] : selected.length ? selected : null,
    statisticsBins: Number.isInteger(bins) && bins >= 10 && bins <= 150 ? bins : 40,
  };
}

export function parseFilterState(search, { platforms = [], years = [] } = {}) {
  const params = new URLSearchParams(search);
  const status = params.get('status') ?? 'all';
  const platform = params.get('platform') ?? 'all';
  const year = params.get('year') ?? 'all';

  return {
    query: params.get('q')?.trim() ?? '',
    status: validStatuses.has(status) ? status : 'all',
    platform: platform === 'all' || platforms.includes(platform) ? platform : 'all',
    year: year === 'all' || years.map(String).includes(year) ? year : 'all',
    screenshots: params.get('screenshots') === '1',
    view: validViews.has(params.get('view')) ? params.get('view') : 'grid',
  };
}

export function serializeFilterState(state) {
  const params = new URLSearchParams();
  if (state.query.trim()) params.set('q', state.query.trim());
  if (state.status !== 'all') params.set('status', state.status);
  if (state.platform !== 'all') params.set('platform', state.platform);
  if (state.year !== 'all') params.set('year', String(state.year));
  if (state.screenshots) params.set('screenshots', '1');
  if (state.view === 'timeline') params.set('view', 'timeline');
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function updateFilterUrl(state, { replace = false } = {}) {
  const url = new URL(window.location.href);
  url.search = serializePageState(state);
  window.history[replace ? 'replaceState' : 'pushState']({}, '', url);
}

export function serializePageState(state) {
  const params = new URLSearchParams(serializeFilterState(state));
  if (state.section === 'statistics') params.set('section', 'statistics');
  if (state.statisticsTab && state.statisticsTab !== 'trend') params.set('stats-tab', state.statisticsTab);
  if (Array.isArray(state.statisticsYears)) {
    const years = [...new Set(state.statisticsYears.map(String))].sort();
    params.set('stats-years', years.length ? years.join(',') : 'none');
  }
  if (Number.isInteger(state.statisticsBins) && state.statisticsBins >= 10 && state.statisticsBins <= 150 && state.statisticsBins !== 40) {
    params.set('stats-bins', String(state.statisticsBins));
  }
  const value = params.toString();
  return value ? `?${value}` : '';
}
