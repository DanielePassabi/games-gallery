const validStatuses = new Set(['all', 'completed', 'unfinished', 'multiplayer']);
const validViews = new Set(['grid', 'timeline']);

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
  url.search = serializeFilterState(state);
  window.history[replace ? 'replaceState' : 'pushState']({}, '', url);
}
