// The challenge rules. Pure functions, no DOM, so they run in the browser and in tests.

const DAY_MS = 24 * 60 * 60 * 1000;

function utcDay(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function isoDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

// Week 1 is the 7 days starting on the challenge start date.
export function weekOf(dateStr, startDate) {
  return Math.floor((utcDay(dateStr) - utcDay(startDate)) / DAY_MS / 7) + 1;
}

export function weekRange(week, startDate) {
  const first = utcDay(startDate) + (week - 1) * 7 * DAY_MS;
  return { from: isoDate(first), to: isoDate(first + 6 * DAY_MS) };
}

// A person's target for the k-th week after their baseline week (k >= 1).
// Each week adds `weeklyIncrease` of the baseline. Every `recoveryEvery`-th
// week repeats the previous week's target instead of growing.
// The target always grows by at least 1 rep per growth week, so small
// baselines still move.
export function targetFor(baseline, k, rules) {
  if (k < 1) return null;
  const recoveries = rules.recoveryEvery > 0 ? Math.floor(k / rules.recoveryEvery) : 0;
  const steps = k - recoveries;
  const base = Math.max(baseline, 0);
  return Math.max(Math.round(base * (1 + rules.weeklyIncrease * steps)), base + steps);
}

function nameKey(name) {
  return name.trim().toLowerCase();
}

// entries: [{ name, date: "YYYY-MM-DD", reps }]
// Returns one row per week from week 1 to the week that contains `today`.
export function summarize(entries, today, config) {
  const { startDate, rules } = config;
  const currentWeek = weekOf(today, startDate);
  const people = new Map(); // key -> { name, weeks: Map(week -> reps) }

  for (const e of entries) {
    const name = String(e.name || "").trim();
    const reps = Number(e.reps);
    if (!name || !Number.isFinite(reps) || !e.date) continue;
    const week = weekOf(e.date, startDate);
    if (week < 1 || week > currentWeek) continue;
    const key = nameKey(name);
    if (!people.has(key)) people.set(key, { name, weeks: new Map() });
    const p = people.get(key);
    p.weeks.set(week, (p.weeks.get(week) || 0) + reps);
  }

  for (const p of people.values()) {
    p.baselineWeek = Math.min(...p.weeks.keys());
    p.baseline = p.weeks.get(p.baselineWeek);
  }

  const weeks = [];
  for (let w = 1; w <= currentWeek; w++) {
    const members = [];
    for (const p of people.values()) {
      if (w < p.baselineWeek) continue;
      const reps = p.weeks.get(w) || 0;
      if (w === p.baselineWeek) {
        members.push({ name: p.name, reps, target: null });
        continue;
      }
      // A person counts toward the group target while they keep showing up:
      // they logged reps this week or last week. Two empty weeks in a row
      // take them out until they log again.
      const active = p.weeks.has(w) || p.weeks.has(w - 1);
      if (!active) continue;
      members.push({ name: p.name, reps, target: targetFor(p.baseline, w - p.baselineWeek, rules) });
    }
    members.sort((a, b) => a.name.localeCompare(b.name));
    const counted = members.filter((m) => m.target !== null);
    const groupTarget = counted.reduce((s, m) => s + m.target, 0);
    const groupReps = counted.reduce((s, m) => s + m.reps, 0);
    const baselineReps = members.filter((m) => m.target === null).reduce((s, m) => s + m.reps, 0);
    weeks.push({
      week: w,
      ...weekRange(w, startDate),
      members,
      groupTarget,
      groupReps,
      baselineReps,
      hit: counted.length > 0 && groupReps >= groupTarget,
    });
  }

  return { currentWeek, weeks, names: [...people.values()].map((p) => p.name).sort() };
}
