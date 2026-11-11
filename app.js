import { config } from "./config.js";
import { summarize, weekRange, TEST_EXERCISE, SEASON_WEEKS } from "./challenge.js";
import { whatsNew } from "./whats-new.js";

const $ = (id) => document.getElementById(id);
const NAME_KEY = "pushup-challenge:name";
const DEMO_KEY = "pushup-challenge:demo-entries";
const SEEN_KEY = "pushup-challenge:whats-new-seen";

// Demo mode starts week 1 and season 1 on this week's Monday, so logging shows results right away.
// ?start=YYYY-MM-DD moves both to test past weeks.
if (!config.scriptUrl) {
  const startOverride = new URLSearchParams(location.search).get("start");
  config.startDate = /^\d{4}-\d{2}-\d{2}$/.test(startOverride || "") ? startOverride : thisMonday();
  config.seasonStart = config.startDate;
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
        let body;
        try {
          const res = await fetch(config.scriptUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(entry),
          });
          body = await res.json();
        } catch {
          // No readable reply. The entry may still have reached the sheet.
          throw Object.assign(new Error("No reply from the server."), { unconfirmed: true });
        }
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
  const testNote = el("p", { class: "muted" }, "Log a max-reps test: one set of as many good pushups as you can. Your test sets your weekly target.");
  if (!week || week.season === null) {
    box.append(el("h2", {}, `Season 1 starts ${dayDate(config.seasonStart)}`));
    if (week) box.append(el("div", { class: "big" }, week.groupReps.toLocaleString(), el("small", {}, " pushups this week")));
    box.append(testNote);
    return;
  }
  const testing = week.members.filter((m) => m.testWeek).length;
  if (week.groupPercent === null) {
    box.append(
      el("h2", {}, "Test week"),
      el("div", { class: "big" }, week.groupReps.toLocaleString(), el("small", {}, " pushups so far")),
      testNote,
    );
    return;
  }
  box.append(
    el("h2", {}, "Group goal this week"),
    el("div", { class: "big" }, `${week.groupPercent}%`, el("small", {}, " of target")),
    el("div", { class: week.hit ? "bar done" : "bar" }, el("div", { style: `width:${Math.min(100, week.groupPercent)}%` })),
    el("p", { class: week.hit ? "good" : "muted" }, week.hit ? "Goal reached. Everything else is extra." : "Every rep over your target covers a friend."),
  );
  if (week.seasonWeek === SEASON_WEEKS) {
    box.append(el("p", { class: "muted" }, "Light week: half your usual target. Retest this week to set next season's target."));
  }
  if (testing > 0) {
    box.append(el("p", { class: "muted" }, `${testing} ${testing === 1 ? "person is" : "people are"} in their test week.`));
  }
}

function renderThisWeek(week) {
  const box = $("this-week");
  box.replaceChildren();
  if (!week || week.members.length === 0) {
    box.append(el("p", { class: "muted" }, "Nobody has logged this week yet."));
    return;
  }
  const today = localDate();
  const rows = week.members.map((m) => {
    let status = "";
    if (m.testWeek) status = el("span", { class: "muted" }, "test week");
    else if (m.percent !== null) status = el("span", { class: m.percent >= 100 ? "good" : "muted" }, `${m.percent}%`);
    const name = el("td", {}, m.name);
    if (m.comebacks.includes(today)) name.append(" ", el("span", { class: "badge", title: "Came back today" }, "↩"));
    return el(
      "tr", {},
      name,
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
    let goal = "–";
    let status = "";
    if (w.season !== null && w.groupPercent === null) goal = "test week";
    if (w.groupPercent !== null) {
      goal = `${w.groupPercent}%`;
      status = el("span", { class: w.hit ? "good" : "warn" }, w.hit ? "✓" : "missed");
    }
    const label = w.season === null ? `Week ${w.week}` : `Season ${w.season}, week ${w.seasonWeek}`;
    return el(
      "tr", {},
      el("td", {}, label, el("div", { class: "muted" }, `${prettyDate(w.from)} – ${prettyDate(w.to)}`)),
      el("td", { class: "num" }, w.groupReps.toLocaleString()),
      el("td", { class: "num" }, goal),
      el("td", { class: "num" }, status),
    );
  });
  box.append(table([["Week"], ["Reps", "num"], ["Goal", "num"], ["", "num"]], rows));
}

function renderRules() {
  const light = Math.round(config.lightWeekShare * 100);
  const items = [
    "Weeks run Monday to Sunday. A season is 4 weeks.",
    "Log every set of pushups you do. Pick the kind that suits you: wall, box, knee or full. Do your test in that same kind.",
    "To set your target, log a max-reps test: one set of as many good pushups as you can. Tick the box when you log it. Its reps count too.",
    `Your weekly target is your latest test times ${config.weeklyMultiplier}. A test of 20 gives 130 a week, for example 2 sets of 13 on 5 days.`,
    "A new test changes your target from the next week. Retest when you move to a harder kind of pushup.",
    `Week 4 of each season is a light week: ${light}% of your target. Retest that week to set next season's target.`,
    "The group goal is everyone's percent of target, averaged. Beat yours and you cover a friend's off week.",
    `Log after ${config.comebackAfterDays} or more days off and you get a ↩ next to your name for the day.`,
    "Skip two weeks in a row and you leave the group goal until you log again. No penalty. Keep your old target, or log a new test.",
    "Logged too many? Log a negative number to fix it.",
  ];
  $("rules").replaceChildren(...items.map((t) => el("li", {}, t)));
}

// The latest release note, until this person closes it.
function renderWhatsNew() {
  const box = $("whats-new");
  if (storageGet(SEEN_KEY) === whatsNew.date) {
    box.hidden = true;
    return;
  }
  box.replaceChildren(
    el("h2", {}, `What's new · ${prettyDate(whatsNew.date)}`),
    ...whatsNew.paragraphs.map((t) => el("p", {}, t)),
    el("ul", {}, ...whatsNew.items.map((t) => el("li", {}, t))),
    el("button", { type: "button", id: "close-whats-new", class: "secondary" }, "Got it"),
  );
  box.hidden = false;
  $("close-whats-new").addEventListener("click", () => {
    storageSet(SEEN_KEY, whatsNew.date);
    box.hidden = true;
  });
}

let lastNames = [];
// The entries from the last successful load, or null if the last load failed.
let lastEntries = null;

// After a save with no reply: check whether the entry reached the log anyway.
async function landed(entry) {
  if (!lastEntries) return false;
  const same = (e) => e.name === entry.name && e.date === entry.date && e.reps === entry.reps;
  const before = lastEntries.filter(same).length;
  try {
    return (await store.list()).filter(same).length > before;
  } catch {
    return false;
  }
}

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
    lastEntries = entries;
    const pushups = entries.filter((e) => !e.exercise || e.exercise === "pushups" || e.exercise === TEST_EXERCISE);
    const summary = summarize(pushups, today, config);
    const current = summary.weeks.at(-1);
    $("error").hidden = true;
    if (current) {
      const which = current.season === null ? `Week ${current.week}` : `Season ${current.season}, week ${current.seasonWeek} of ${SEASON_WEEKS}`;
      $("week-label").textContent = `${which} · ${dayDate(current.from)} to ${dayDate(current.to)}`;
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
    lastEntries = null;
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
  const isTest = $("is-test").checked;
  const status = $("form-status");
  if (!name || !Number.isInteger(reps) || reps === 0 || !date) {
    status.textContent = "Enter your name, a whole number of reps (not 0) and a day.";
    return;
  }
  if (isTest && reps < 0) {
    status.textContent = "A max-reps test can't be negative.";
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
  const entry = { name: known || name, date, reps, exercise: isTest ? TEST_EXERCISE : "pushups" };
  try {
    try {
      await store.add(entry);
    } catch (err) {
      if (!err.unconfirmed || !(await landed(entry))) throw err;
    }
    currentName = known || name;
    storageSet(NAME_KEY, currentName);
    $("reps").value = "";
    $("new-name").value = "";
    $("is-test").checked = false;
    if (date < config.startDate) status.textContent = `Saved, but reps before ${prettyDate(config.startDate)} do not count.`;
    else if (isTest) status.textContent = `Saved your max-reps test: ${reps}. Your new target starts next week.`;
    else status.textContent = `Saved ${reps} for ${prettyDate(date)}.`;
    await refresh();
  } catch (err) {
    status.textContent = err.unconfirmed
      ? "Couldn't confirm your reps were saved. Refresh the page and check the board before you log them again."
      : `Not saved: ${err.message}`;
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
renderWhatsNew();
refresh();
