export function filterYears(years, { platform = 'all', query, screenshots = false, status, year = 'all' }) {
  const normalizedQuery = query.trim().toLocaleLowerCase('it');

  return years.filter(({ year: entryYear }) => year === 'all' || String(entryYear) === String(year)).map(({ year: entryYear, games }) => ({
    year: entryYear,
    games: games.filter((game) => {
      const matchesStatus = status === 'all' || game.status === status;
      const matchesPlatform = platform === 'all' || game.platform === platform;
      const matchesScreenshots = !screenshots || game.screenshots.length > 0;
      const matchesQuery = !normalizedQuery || game.name.toLocaleLowerCase('it').includes(normalizedQuery);
      return matchesStatus && matchesPlatform && matchesScreenshots && matchesQuery;
    }),
  })).filter(({ games }) => games.length > 0);
}

export function summarize(years) {
  const games = years.flatMap(({ games: yearGames }) => yearGames);
  const completed = games.filter(({ status }) => status === 'completed').length;
  const knownHoursGames = games.filter(({ hours }) => hours !== null).length;
  const knownHours = games.reduce((total, { hours }) => total + (hours ?? 0), 0);

  return {
    games: games.length,
    completed,
    completionRate: games.length ? Math.round((completed / games.length) * 100) : 0,
    knownHoursGames,
    hours: knownHours,
    days: Math.round((knownHours / 24) * 10) / 10,
  };
}

export function summarizeYear(games) {
  return {
    games: games.length,
    completed: games.filter(({ status }) => status === 'completed').length,
    unfinished: games.filter(({ status }) => status === 'unfinished').length,
    multiplayer: games.filter(({ status }) => status === 'multiplayer').length,
    hours: games.reduce((total, { hours }) => total + (hours ?? 0), 0),
  };
}
