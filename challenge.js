// The challenge rules. Pure functions, no DOM, so they run in the browser and in tests.

const DAY_MS = 24 * 60 * 60 * 1000;
export const SEASON_WEEKS = 4;
export const TEST_EXERCISE = "pushups-max";

function utcDay(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function isoDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  return Math.round((utcDay(b) - utcDay(a)) / DAY_MS);
}

// Week 1 is the 7 days starting on the challenge start date.
export function weekOf(dateStr, startDate) {
  return Math.floor((utcDay(dateStr) - utcDay(startDate)) / DAY_MS / 7) + 1;
}

export function weekRange(week, startDate) {
  const first = utcDay(startDate) + (week - 1) * 7 * DAY_MS;
  return { from: isoDate(first), to: isoDate(first + 6 * DAY_MS) };
}

// Seasons are 4 weeks long, counted from seasonStart.
// Returns { season, week } with week 1 to 4, or null for a week before seasons began.
export function seasonWeek(week, config) {
  const first = weekOf(config.seasonStart, config.startDate);
  if (week < first) return null;
  const i = week - first;
  return { season: Math.floor(i / SEASON_WEEKS) + 1, week: (i % SEASON_WEEKS) + 1 };
}

// A person's target for a week. It comes from their latest max-reps test logged
// before the week starts. Week 4 of a season is a light week.
// tests: [{ date, reps }] in the order they were logged. Returns null with no test.
export function targetForWeek(tests, weekStart, weekInSeason, config) {
  let latest = null;
  for (const t of tests) {
    if (t.reps > 0 && t.date < weekStart && (!latest || t.date >= latest.date)) latest = t;
  }
  if (!latest) return null;
  const target = Math.max(1, Math.round(latest.reps * config.weeklyMultiplier));
  return weekInSeason === SEASON_WEEKS ? Math.max(1, Math.round(target * config.lightWeekShare)) : target;
}

// The suggested size of an everyday set: a share of the latest test, so most
// sets stop well short of a max effort. Returns null with no test.
export function setSize(tests, config) {
  let latest = null;
  for (const t of tests) if (t.reps > 0 && (!latest || t.date >= latest.date)) latest = t;
  return latest ? Math.max(1, Math.round(latest.reps * config.setShare)) : null;
}

function nameKey(name) {
  return name.trim().toLowerCase();
}

// The days a person came back: they logged, and their previous logging day was
// at least `afterDays` days before. Their first day ever is not a comeback.
export function comebackDays(days, afterDays) {
  const sorted = [...new Set(days)].sort();
  return sorted.filter((d, i) => i > 0 && daysBetween(sorted[i - 1], d) >= afterDays);
}

// entries: [{ name, date: "YYYY-MM-DD", reps, exercise }]
// Returns one row per week from week 1 to the week that contains `today`.
export function summarize(entries, today, config) {
  const { startDate } = config;
  const currentWeek = weekOf(today, startDate);
  const people = new Map(); // key -> { name, weeks: Map(week -> reps), tests, days }

  for (const e of entries) {
    const name = String(e.name || "").trim();
    const reps = Number(e.reps);
    if (!name || !Number.isFinite(reps) || !e.date) continue;
    const week = weekOf(e.date, startDate);
    if (week < 1 || week > currentWeek) continue;
    const key = nameKey(name);
    if (!people.has(key)) people.set(key, { name, weeks: new Map(), tests: [], days: [] });
    const p = people.get(key);
    p.weeks.set(week, (p.weeks.get(week) || 0) + reps);
    if (e.exercise === TEST_EXERCISE) p.tests.push({ date: e.date, reps });
    if (reps > 0) p.days.push(e.date);
  }

  for (const p of people.values()) {
    p.firstWeek = Math.min(...p.weeks.keys());
    p.comebacks = comebackDays(p.days, config.comebackAfterDays);
  }

  const weeks = [];
  for (let w = 1; w <= currentWeek; w++) {
    const range = weekRange(w, startDate);
    const sw = seasonWeek(w, config);
    const nextFrom = weekRange(w + 1, startDate).from;
    const nextSw = seasonWeek(w + 1, config);
    const members = [];
    for (const p of people.values()) {
      if (w < p.firstWeek) continue;
      // A person counts while they keep showing up: they logged this week or
      // last week. Two empty weeks in a row take them out until they log again.
      if (!p.weeks.has(w) && !p.weeks.has(w - 1)) continue;
      const reps = p.weeks.get(w) || 0;
      const target = sw ? targetForWeek(p.tests, range.from, sw.week, config) : null;
      members.push({
        name: p.name,
        reps,
        target,
        percent: target === null ? null : Math.round((100 * reps) / target),
        testWeek: Boolean(sw) && target === null,
        // What the target will be next week, so a person who just tested can see it.
        nextTarget: nextSw ? targetForWeek(p.tests, nextFrom, nextSw.week, config) : null,
        comebacks: p.comebacks.filter((d) => d >= range.from && d <= range.to),
      });
    }
    members.sort((a, b) => a.name.localeCompare(b.name));
    const counted = members.filter((m) => m.target !== null);
    const groupPercent = counted.length
      ? Math.round(counted.reduce((s, m) => s + (100 * m.reps) / m.target, 0) / counted.length)
      : null;
    weeks.push({
      week: w,
      ...range,
      season: sw ? sw.season : null,
      seasonWeek: sw ? sw.week : null,
      members,
      groupReps: members.reduce((s, m) => s + m.reps, 0),
      groupPercent,
      hit: groupPercent !== null && groupPercent >= 100,
    });
  }

  const setSizes = Object.fromEntries([...people.values()].map((p) => [p.name, setSize(p.tests, config)]));
  return { currentWeek, weeks, names: [...people.values()].map((p) => p.name).sort(), setSizes };
}
