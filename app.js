import { config } from "./config.js";
import { summarize, weekRange } from "./challenge.js";

const $ = (id) => document.getElementById(id);
const NAME_KEY = "pushup-challenge:name";
const DEMO_KEY = "pushup-challenge:demo-entries";

// Demo mode starts week 1 on this week's Monday, so logging shows results right away.
// ?start=YYYY-MM-DD moves week 1 to test past weeks.
if (!config.scriptUrl) {
  const startOverride = new URLSearchParams(location.search).get("start");
  config.startDate = /^\d{4}-\d{2}-\d{2}$/.test(startOverride || "") ? startOverride : thisMonday();
}

function localDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function thisMonday() {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return localDate(d);
}

// "Mon, Oct 19"
function dayDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function prettyDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* private window: skip */ }
}

// Data access: the Google Apps Script web app, or this browser in demo mode.
const store = config.scriptUrl
  ? {
      async list() {
        const res = await fetch(config.scriptUrl);
        const body = await res.json();
        if (!body.ok) throw new Error(body.error || "Could not load entries.");
        return body.entries;
      },
      async add(entry) {
        // text/plain keeps the browser from sending a preflight request,
        // which Apps Script does not answer.
        const res = await fetch(config.scriptUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(entry),
        });
        const body = await res.json();
        if (!body.ok) throw new Error(body.error || "Could not save.");
      },
    }
  : {
      async list() {
        try { return JSON.parse(storageGet(DEMO_KEY) || "[]"); } catch { return []; }
      },
      async add(entry) {
        const all = await this.list();
        all.push(entry);
        storageSet(DEMO_KEY, JSON.stringify(all));
      },
    };

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) node.append(c ?? "");
  return node;
}

function table(headers, rows) {
  return el(
    "table",
    {},
    el("thead", {}, el("tr", {}, ...headers.map(([text, cls]) => el("th", cls ? { class: cls } : {}, text)))),
    el("tbody", {}, ...rows),
  );
}

function renderProgress(week) {
  const box = $("progress");
  box.replaceChildren();
  if (!week) {
    box.append(
      el("h2", {}, "Starting soon"),
      el("p", { class: "muted" }, `Week 1 starts ${dayDate(config.startDate)}. Your first week sets your baseline, so do what you normally can.`),
    );
    return;
  }
  if (week.groupTarget === 0) {
    box.append(
      el("h2", {}, "Baseline week"),
      el("div", { class: "big" }, week.baselineReps.toLocaleString(), el("small", {}, " pushups so far")),
      el("p", { class: "muted" }, "Everyone is setting their starting point. Targets start next week."),
    );
    return;
  }
  const pct = Math.min(100, Math.round((week.groupReps / week.groupTarget) * 100));
  const left = week.groupTarget - week.groupReps;
  box.append(
    el("h2", {}, "Group goal this week"),
    el("div", { class: "big" }, week.groupReps.toLocaleString(), el("small", {}, ` / ${week.groupTarget.toLocaleString()}`)),
    el("div", { class: week.hit ? "bar done" : "bar" }, el("div", { style: `width:${pct}%` })),
    el("p", { class: week.hit ? "good" : "muted" }, week.hit ? "Goal reached. Everything else is extra." : `${left.toLocaleString()} to go, together.`),
  );
  if (week.baselineReps > 0) {
    box.append(el("p", { class: "muted" }, `Plus ${week.baselineReps.toLocaleString()} from people setting their baseline.`));
  }
}

function renderThisWeek(week) {
  const box = $("this-week");
  box.replaceChildren();
  if (!week || week.members.length === 0) {
    box.append(el("p", { class: "muted" }, "Nobody has logged this week yet."));
    return;
  }
  const rows = week.members.map((m) => {
    let status;
    if (m.target === null) status = el("span", { class: "muted" }, "baseline");
    else if (m.reps >= m.target) status = el("span", { class: "good" }, "✓");
    else status = el("span", { class: "muted" }, `${m.target - m.reps} left`);
    return el(
      "tr", {},
      el("td", {}, m.name),
      el("td", { class: "num" }, m.reps.toLocaleString()),
      el("td", { class: "num" }, m.target === null ? "–" : m.target.toLocaleString()),
      el("td", { class: "num" }, status),
    );
  });
  box.append(table([["Name"], ["Reps", "num"], ["Target", "num"], ["", "num"]], rows));
}

function renderHistory(weeks) {
  const box = $("history");
  box.replaceChildren();
  const past = weeks.slice(0, -1).reverse();
  if (past.length === 0) {
    box.append(el("p", { class: "muted" }, "Finished weeks show up here."));
    return;
  }
  const rows = past.map((w) => {
    const baseline = w.groupTarget === 0;
    return el(
      "tr", {},
      el("td", {}, `Week ${w.week}`, el("div", { class: "muted" }, `${prettyDate(w.from)} – ${prettyDate(w.to)}`)),
      el("td", { class: "num" }, (baseline ? w.baselineReps : w.groupReps).toLocaleString()),
      el("td", { class: "num" }, baseline ? "baseline" : w.groupTarget.toLocaleString()),
      el("td", { class: "num" }, baseline ? "" : el("span", { class: w.hit ? "good" : "warn" }, w.hit ? "✓" : "missed")),
    );
  });
  box.append(table([["Week"], ["Reps", "num"], ["Goal", "num"], ["", "num"]], rows));
}

function renderRules() {
  const pct = Math.round(config.rules.weeklyIncrease * 100);
  const items = [
    "Weeks run Monday to Sunday.",
    "Log every set of pushups you do. Any kind counts as one rep: wall, incline, knee or full.",
    "Your first week sets your baseline: the total you did that week. Join on the first day of a week if you can.",
    `After that, your weekly target grows by ${pct}% of your baseline each week.`,
    config.rules.recoveryEvery > 0
      ? `Every ${config.rules.recoveryEvery}th week after your baseline repeats the week before, so you can recover.`
      : null,
    "The group goal is everyone's targets added up. Beat yours and you cover a friend's off week.",
    "Skip two weeks in a row and you leave the group goal until you log again. No penalty.",
    "Logged too many? Log a negative number to fix it.",
  ].filter(Boolean);
  $("rules").replaceChildren(...items.map((t) => el("li", {}, t)));
}

let lastNames = [];

const NEW_NAME = "__new__";
let currentName = storageGet(NAME_KEY) || "";

// The name dropdown: everyone who has logged, plus "I'm new" for joiners.
function renderNameSelect() {
  const select = $("name-select");
  const chosen = currentName;
  select.replaceChildren(
    el("option", { value: "" }, "Choose your name"),
    ...lastNames.map((n) => el("option", { value: n }, n)),
    el("option", { value: NEW_NAME }, "I'm new"),
  );
  const match = chosen === NEW_NAME ? NEW_NAME : lastNames.find((n) => n.toLowerCase() === chosen.toLowerCase());
  select.value = match || (lastNames.length === 0 ? NEW_NAME : "");
  showNewName();
}

function showNewName() {
  const isNew = $("name-select").value === NEW_NAME;
  $("new-name-label").hidden = !isNew;
  $("new-name").required = isNew;
}

async function refresh() {
  const today = localDate();
  try {
    const entries = await store.list();
    const pushups = entries.filter((e) => !e.exercise || e.exercise === "pushups");
    const summary = summarize(pushups, today, config);
    const current = summary.weeks.at(-1);
    $("error").hidden = true;
    if (current) {
      $("week-label").textContent = `Week ${current.week} · ${dayDate(current.from)} to ${dayDate(current.to)}`;
    } else {
      const w1 = weekRange(1, config.startDate);
      $("week-label").textContent = `Starts ${dayDate(w1.from)}`;
    }
    renderProgress(current);
    renderThisWeek(current);
    renderHistory(summary.weeks);
    lastNames = summary.names;
    renderNameSelect();
  } catch (err) {
    $("error").textContent = `Could not load the log: ${err.message}`;
    $("error").hidden = false;
  }
}

$("log-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const picked = $("name-select").value;
  const name = picked === NEW_NAME ? $("new-name").value.trim() : picked;
  const reps = Number($("reps").value);
  const date = $("date").value;
  const status = $("form-status");
  if (!name || !Number.isInteger(reps) || reps === 0 || !date) {
    status.textContent = "Enter your name, a whole number of reps (not 0) and a day.";
    return;
  }
  if (date > localDate()) {
    status.textContent = "That day is in the future.";
    return;
  }
  // Reuse the spelling already on the board, so "ana" and "Ana" stay one person.
  const known = lastNames.find((n) => n.toLowerCase() === name.toLowerCase());
  $("submit").disabled = true;
  status.textContent = "Saving…";
  try {
    await store.add({ name: known || name, date, reps, exercise: "pushups" });
    currentName = known || name;
    storageSet(NAME_KEY, currentName);
    $("reps").value = "";
    $("new-name").value = "";
    status.textContent = date < config.startDate
      ? `Saved, but reps before ${prettyDate(config.startDate)} do not count.`
      : `Saved ${reps} for ${prettyDate(date)}.`;
    await refresh();
  } catch (err) {
    status.textContent = `Not saved: ${err.message}`;
  } finally {
    $("submit").disabled = false;
  }
});

$("demo-banner").hidden = Boolean(config.scriptUrl);
$("clear-demo").addEventListener("click", () => {
  try { localStorage.removeItem(DEMO_KEY); } catch { /* nothing stored */ }
  $("form-status").textContent = "Demo entries cleared.";
  refresh();
});
$("name-select").addEventListener("change", () => {
  currentName = $("name-select").value;
  showNewName();
});
$("date").value = localDate();
$("date").max = localDate();
renderRules();
refresh();
