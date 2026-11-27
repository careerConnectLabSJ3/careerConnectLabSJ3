// Calendar keys stay in local time, including across DST changes.
export function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function startForRange(range, now = new Date()) {
  if (range === 'all') return null;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - Number(range) + 1);
  return start;
}

export function weekKey(value) {
  const day = new Date(value);
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() - (day.getDay() + 6) % 7);
  return dateKey(day);
}

export function weeklyCounts(applications, range, now = new Date()) {
  const counts = new Map();
  for (const application of applications) {
    const key = weekKey(application.appliedAt);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const start = startForRange(range, now);
  const first = start ? weekKey(start) : [...counts.keys()].sort()[0];
  if (!first) return [];
  const last = weekKey(now);
  const weeks = [];
  const day = new Date(`${first}T00:00:00`);
  while (dateKey(day) <= last) {
    const key = dateKey(day);
    const label = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(day);
    weeks.push({ key, label, count: counts.get(key) || 0 });
    day.setDate(day.getDate() + 7);
  }
  return weeks;
}
