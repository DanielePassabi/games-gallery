export function normalizeVideos(videos = [], context = 'videos') {
  if (!Array.isArray(videos)) throw new Error(`${context}: expected an array`);
  const ids = new Set();
  return videos.map((video, index) => {
    const label = `${context}[${index}]`;
    if (!video || video.provider !== 'youtube') throw new Error(`${label}: unsupported video provider`);
    if (typeof video.id !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(video.id)) {
      throw new Error(`${label}: invalid YouTube video id`);
    }
    if (typeof video.title !== 'string' || !video.title.trim()) throw new Error(`${label}: title is required`);
    if (ids.has(video.id)) throw new Error(`${label}: duplicate video ${video.id}`);
    ids.add(video.id);
    return { provider: 'youtube', id: video.id, title: video.title.trim() };
  });
}

export function mediaSummary(game) {
  return [
    game.screenshots?.length ? `${game.screenshots.length} foto` : '',
    game.videos?.length ? `${game.videos.length} video` : '',
  ].filter(Boolean).join(' · ');
}

export function youtubeUrls(video) {
  const [validated] = normalizeVideos([video]);
  return {
    watch: `https://www.youtube.com/watch?v=${validated.id}`,
    embed: `https://www.youtube-nocookie.com/embed/${validated.id}?playsinline=1&rel=0`,
    thumbnail: `https://i.ytimg.com/vi/${validated.id}/mqdefault.jpg`,
  };
}
