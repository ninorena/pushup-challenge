// The challenge rules. Pure functions, no DOM, so they run in the browser and in tests.

const DAY_MS = 24 * 60 * 60 * 1000;
export const SEASON_WEEKS = 4;
export const TEST_EXERCISE = "pushups-max";
// A person with no test is a starter. After this many logged days, the page asks for the test.
export const STARTER_DAYS = 5;
// The climb: one set is one step. A starter day is this many steps: the suggested sets for a day.
export const STARTER_DAY_STEPS = 3;

function utcDay(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function isoDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function daysBetween(a, b) {
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

// The latest test logged on or before `day`, or null.
function latestTest(tests, day) {
  let latest = null;
  for (const t of tests) {
    if (t.reps > 0 && t.date <= day && (!latest || t.date >= latest.date)) latest = t;
  }
  return latest;
}

// The weekly multiplier on a day: config.weeklyMultiplier, unless an entry in
// config.earlierMultipliers covers that day.
export function multiplierOn(day, config) {
  let best = null;
  for (const m of config.earlierMultipliers || []) {
    if (day <= m.until && (!best || m.until < best.until)) best = m;
  }
  return best ? best.weeklyMultiplier : config.weeklyMultiplier;
}

// A person's target for a week. tests: [{ date, reps }] in the order they were
// logged. Returns null with no test.
// Each day counts 1/7 of the weekly rate from the latest test on or before
// that day. A test on Thursday sets the rate for
// Thursday to Sunday, and the days before keep the old rate. Days before a
// person's first test count 0.
// Week 4 of a season is a normal week. It is when people retest.
export function targetForWeek(tests, weekStart, config) {
  let total = 0;
  let tested = false;
  for (let i = 0; i < 7; i++) {
    const day = isoDate(utcDay(weekStart) + i * DAY_MS);
    const latest = latestTest(tests, day);
    if (!latest) continue;
    tested = true;
    total += (latest.reps * multiplierOn(day, config)) / 7;
  }
  return tested ? Math.max(1, Math.round(total)) : null;
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

// The sets in a weekly target: the weekly multiplier divided by the set share
// (9.75 / 0.65 = 15, which is 3 sets a day for 5 days).
export function setsPerWeek(day, config) {
  return Math.round(multiplierOn(day, config) / config.setShare);
}

// The steps one person adds to the group climb in a week. One set is one step,
// and reps carry over within the week. A person at their target always has
// `goal` steps, also when the rounded set size does not divide the target.
// There is no maximum: a strong week covers a friend.
// With no target (a starter): STARTER_DAY_STEPS for each logged day.
export function stepsFor(reps, target, daysLogged, set, goal) {
  if (target === null) return daysLogged * STARTER_DAY_STEPS;
  if (reps <= 0) return 0;
  return Math.max(set ? Math.floor(reps / set) : 0, Math.floor((reps * goal) / target));
}

// The tallest item in `list` ([{ name, feet }]) that is not taller than `feet`, or null.
export function tallestWithin(feet, list) {
  let best = null;
  for (const item of list) {
    if (item.feet <= feet && (!best || item.feet > best.feet)) best = item;
  }
  return best;
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
    if (!people.has(key)) people.set(key, { name, weeks: new Map(), tests: [], dayTotals: new Map() });
    const p = people.get(key);
    p.weeks.set(week, (p.weeks.get(week) || 0) + reps);
    if (e.exercise === TEST_EXERCISE) p.tests.push({ date: e.date, reps });
    p.dayTotals.set(e.date, (p.dayTotals.get(e.date) || 0) + reps);
  }

  for (const p of people.values()) {
    p.firstWeek = Math.min(...p.weeks.keys());
    // A logged day is a day with more than 0 reps in total, so an undo takes the day back.
    p.days = [...p.dayTotals].filter(([, total]) => total > 0).map(([day]) => day).sort();
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
      const target = sw ? targetForWeek(p.tests, range.from, config) : null;
      const goal = target === null ? 0 : setsPerWeek(range.from, config);
      const set = target === null ? null : setSize(p.tests.filter((t) => t.date <= range.to), config);
      // One entry for each day, Monday to Sunday: did the person log that day?
      const days = Array.from({ length: 7 }, (_, i) => p.days.includes(isoDate(utcDay(range.from) + i * DAY_MS)));
      members.push({
        name: p.name,
        reps,
        target,
        percent: target === null ? null : Math.round((100 * reps) / target),
        days,
        steps: stepsFor(reps, target, days.filter(Boolean).length, set, goal),
        goal,
        // What the target will be next week, so a person who just tested can see it.
        nextTarget: nextSw ? targetForWeek(p.tests, nextFrom, config) : null,
        comebacks: p.comebacks.filter((d) => d >= range.from && d <= range.to),
      });
    }
    members.sort((a, b) => a.name.localeCompare(b.name));
    const groupReps = members.reduce((s, m) => s + m.reps, 0);
    weeks.push({
      week: w,
      ...range,
      season: sw ? sw.season : null,
      seasonWeek: sw ? sw.week : null,
      members,
      groupReps,
      // The climb: the summit is the sets of every person with a target.
      // A starter adds steps and no height.
      steps: members.reduce((s, m) => s + m.steps, 0),
      maxSteps: members.reduce((s, m) => s + m.goal, 0),
      // One rep is one foot.
      feet: Math.max(0, groupReps),
    });
  }

  // The feet of each season: the sum of its weeks. `complete` after its last week ends.
  const seasons = [];
  for (const w of weeks) {
    if (w.season === null) continue;
    if (!seasons[w.season - 1]) seasons[w.season - 1] = { season: w.season, feet: 0, complete: false };
    seasons[w.season - 1].feet += w.feet;
    if (w.seasonWeek === SEASON_WEEKS && w.week < currentWeek) seasons[w.season - 1].complete = true;
  }

  const setSizes = Object.fromEntries([...people.values()].map((p) => [p.name, setSize(p.tests, config)]));
  // Each person's latest test, { date, reps }, or null with no test.
  const lastTests = Object.fromEntries([...people.values()].map((p) => [p.name, latestTest(p.tests, "9999-12-31")]));
  // Each person's logged days, oldest first.
  const loggedDays = Object.fromEntries([...people.values()].map((p) => [p.name, p.days]));
  return { currentWeek, weeks, seasons, names: [...people.values()].map((p) => p.name).sort(), setSizes, lastTests, loggedDays };
}
