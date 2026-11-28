import { config } from "./config.js?v=2026-11-30";
import { summarize, weekRange, daysBetween, tallestWithin, TEST_EXERCISE, SEASON_WEEKS, STARTER_DAYS } from "./challenge.js?v=2026-11-30";
import { landmarks, mountains } from "./heights.js?v=2026-11-30";
import { whatsNew } from "./whats-new.js?v=2026-11-30";

const $ = (id) => document.getElementById(id);
const NAME_KEY = "pushup-challenge:name";
const DEMO_KEY = "pushup-challenge:demo-entries";
const SEEN_KEY = "pushup-challenge:whats-new-seen";
const REVEAL_KEY = "pushup-challenge:reveal-seen";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const params = new URLSearchParams(location.search);
// Demo mode only: ?today=YYYY-MM-DD shows the page as it will look on that day.
const todayOverride = !config.scriptUrl && ISO_DAY.test(params.get("today") || "") ? params.get("today") : null;

function now() {
  if (!todayOverride) return new Date();
  const [y, m, d] = todayOverride.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Demo mode: the preview script can put a demo-seed.json file next to the page.
// It holds the starting entries, the real start dates and the test people to view the page as.
let demoSeed = null;
if (!config.scriptUrl) {
  try {
    const res = await fetch("demo-seed.json");
    if (res.ok) demoSeed = await res.json();
  } catch { /* no seed file: the demo starts empty */ }
  // With no seed file, the demo starts week 1 and season 1 on this week's Monday, so logging shows results right away.
  // ?start=YYYY-MM-DD moves both to test past weeks.
  const startOverride = params.get("start");
  if (ISO_DAY.test(startOverride || "")) config.startDate = config.seasonStart = startOverride;
  else if (demoSeed) ({ startDate: config.startDate, seasonStart: config.seasonStart } = demoSeed);
  else config.startDate = config.seasonStart = thisMonday();
}

function localDate(d = now()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function thisMonday() {
  const d = now();
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
        const stored = storageGet(DEMO_KEY);
        if (stored === null && demoSeed) {
          storageSet(DEMO_KEY, JSON.stringify(demoSeed.entries));
          return demoSeed.entries;
        }
        try { return JSON.parse(stored || "[]"); } catch { return []; }
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

const NEW_NAME = "__new__";
let currentName = storageGet(NAME_KEY) || "";
// The summary from the last successful load, or null.
let summary = null;
// The entries from the last successful load, or null if the last load failed.
let lastEntries = null;
// The entry that the Undo button takes back, or null.
let lastLogged = null;

// The chosen person, spelled as on the board, or null for a new person.
function knownName() {
  if (!summary || !currentName) return null;
  return summary.names.find((n) => n.toLowerCase() === currentName.toLowerCase()) || null;
}

const feetText = (n) => `${n.toLocaleString()} ${n === 1 ? "foot" : "feet"}`;
const comparedTo = (feet, item) => `${feet === item.feet ? "as high as" : "higher than"} ${item.name} (${item.feet.toLocaleString()} ft)`;

// A row of round marks, filled for each true entry.
function dots(flags, label, cls = "") {
  return el(
    "span", { class: `dots ${cls}`.trim(), role: "img", "aria-label": label },
    ...flags.map((on) => el("span", { class: on ? "dot on" : "dot" })),
  );
}

function starterDots(done) {
  const flags = Array.from({ length: STARTER_DAYS }, (_, i) => i < done);
  return dots(flags, `${done} of ${STARTER_DAYS} starter days done`, "big-dots");
}

// The card for the person: who they are, where they are, and the form to log today.
function renderMe() {
  const today = localDate();
  const known = knownName();
  const head = $("me-head");
  head.replaceChildren();
  $("who").hidden = Boolean(known);
  $("switch-name").hidden = !known;
  $("new-name").required = !known;
  let button = "Log reps";

  if (!known) {
    head.append(
      el("h2", {}, "Start here"),
      el("p", {}, "Do any pushups today. One counts. Then log them."),
      starterDots(0),
      el("p", { class: "muted" }, `Your first goal is ${STARTER_DAYS} days. No target and no test until then.`),
    );
    $("submit").textContent = "Log day 1";
    return;
  }

  const days = summary.loggedDays[known] || [];
  const n = days.length;
  const loggedToday = days.includes(today);
  const before = days.filter((d) => d < today).at(-1);
  const back = Boolean(before) && daysBetween(before, today) >= config.comebackAfterDays;
  const week = summary.weeks.at(-1);
  const m = week ? week.members.find((x) => x.name === known) : null;
  let title;
  const body = [];

  if (!summary.lastTests[known] && n < STARTER_DAYS) {
    // A starter: any pushups on 5 days, with no target and no test.
    const left = STARTER_DAYS - n;
    title = loggedToday ? `Day ${n} done, ${known}` : `Day ${n + 1} of ${STARTER_DAYS}, ${known}`;
    body.push(
      el("p", {}, loggedToday ? `${left} more ${left === 1 ? "day" : "days"} to your first goal.` : "Any pushups count. One is enough."),
      starterDots(n),
    );
    button = loggedToday ? "Log another set" : `Log day ${n + 1}`;
  } else if (!summary.lastTests[known]) {
    title = `${STARTER_DAYS} days done, ${known}`;
    body.push(
      el("p", {}, "Next is your max-reps test: one set of as many good pushups as you can. It sets your weekly target."),
      el("p", {}, el("a", { href: "#test", class: "button" }, "Do my test")),
    );
  } else {
    title = loggedToday ? `You showed up today, ${known}` : `Hi, ${known}`;
    const reps = m ? m.reps : 0;
    const size = summary.setSizes[known];
    body.push(el("p", { class: "muted" },
      m && m.target !== null ? `${reps.toLocaleString()} of ${m.target.toLocaleString()} reps this week, ${m.steps} of ${m.goal} steps.` : `${reps.toLocaleString()} reps this week.`,
      size ? ` Your sets: about ${size}, one step each.` : ""));
    if (week && week.seasonWeek === SEASON_WEEKS) {
      body.push(el("p", { class: "muted" }, "Retest week: ", el("a", { href: "#test" }, "do a new max-reps test"), " this week."));
    }
    if (loggedToday) button = "Log another set";
  }

  if (back) {
    // The first day back after days off gets a welcome, not a mark on the board.
    head.append(el("div", { class: "welcome" },
      el("h2", {}, `Welcome back, ${known}`),
      el("p", {}, loggedToday ? "You showed up today." : "Any pushups today count.")));
    head.append(...body);
  } else {
    head.append(el("h2", {}, title), ...body);
  }
  $("submit").textContent = button;
}

// The name list for a person the page does not know yet.
function renderNameSelect() {
  const select = $("name-select");
  select.replaceChildren(
    el("option", { value: NEW_NAME }, "I'm new"),
    ...summary.names.map((n) => el("option", { value: n }, n)),
  );
  select.value = NEW_NAME;
}

// The mountain: the climber moves up the left side as the group adds steps.
function mountain(week) {
  const f = week.maxSteps ? Math.min(1, week.steps / week.maxSteps) : 0;
  const base = [14, 108];
  const top = [226, 16];
  const at = [base[0] + (top[0] - base[0]) * f, base[1] + (top[1] - base[1]) * f];
  const ns = "http://www.w3.org/2000/svg";
  const node = (tag, attrs) => {
    const n = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  };
  const svg = node("svg", { viewBox: "0 0 320 120", class: "mountain", role: "img", "aria-label": `The group is at ${week.steps} of ${week.maxSteps} steps to the summit.` });
  svg.append(
    node("polygon", { points: `${base} ${top} 306,108`, class: "rock" }),
    node("line", { x1: top[0], y1: top[1], x2: top[0], y2: top[1] - 12, class: "pole" }),
    node("polygon", { points: `${top[0]},${top[1] - 12} ${top[0] + 12},${top[1] - 8} ${top[0]},${top[1] - 4}`, class: f >= 1 ? "flag reached" : "flag" }),
    node("line", { x1: base[0], y1: base[1], x2: top[0], y2: top[1], class: "trail" }),
    node("line", { x1: base[0], y1: base[1], x2: at[0], y2: at[1], class: "climbed" }),
    node("circle", { cx: at[0], cy: at[1], r: 7, class: "climber" }),
  );
  return svg;
}

// The card for the group: the climb, then one row for each person with days and percent.
function renderGroup(week) {
  const box = $("group-body");
  box.replaceChildren();
  if (!week || week.members.length === 0) {
    box.append(el("p", { class: "muted" }, "Nobody has logged this week yet."));
    return;
  }
  const summit = week.maxSteps > 0 && week.steps >= week.maxSteps;
  const climb = week.maxSteps > 0 ? `${week.steps} of ${week.maxSteps} steps to the summit.` : `${week.steps} ${week.steps === 1 ? "step" : "steps"} so far.`;
  box.append(
    mountain(week),
    el("p", { class: summit ? "good" : "" }, summit ? `Summit reached: ${week.steps} of ${week.maxSteps} steps.` : climb),
    el("p", { class: "muted" }, `${feetText(week.feet)} climbed this week. One set is one step. One rep is one foot.`),
  );
  const known = knownName();
  const rows = [...week.members].sort((a, b) => (b.name === known) - (a.name === known));
  const list = el("ul", { class: "board" });
  for (const m of rows) {
    const count = m.days.filter(Boolean).length;
    let status = "";
    if (m.percent !== null) status = el("span", { class: m.percent >= 100 ? "good" : "" }, `${m.percent}%`);
    else if (week.season !== null) status = el("span", { class: "muted small" }, "🌱 first week");
    list.append(el(
      "li", {},
      el("span", { class: "who" }, m.name, m.name === known ? el("span", { class: "muted you" }, " (you)") : ""),
      dots(m.days, `${count} ${count === 1 ? "day" : "days"}`),
      el("span", { class: "pct" }, status),
    ));
  }
  box.append(list);
}

// The landmark of last week, and the mountain of a season that just ended, until the person closes the card.
function renderReveal(weeks, seasons) {
  const box = $("reveal");
  const last = weeks.at(-2);
  const lastSeason = last && last.season !== null ? seasons[last.season - 1] : null;
  // A season that just ended shows its mountain, also if nobody logged in its last week.
  const seasonEnded = Boolean(lastSeason) && lastSeason.complete && last.seasonWeek === SEASON_WEEKS && lastSeason.feet > 0;
  if (!last || (last.members.length === 0 && !seasonEnded) || storageGet(REVEAL_KEY) === String(last.week)) {
    box.hidden = true;
    return;
  }
  const landmark = tallestWithin(last.feet, landmarks);
  box.replaceChildren(
    el("h2", {}, `Last week: ${feetText(last.feet)}`),
    el("p", {}, landmark ? `Together, you climbed ${comparedTo(last.feet, landmark)}.` : "Every foot counts."),
  );
  if (seasonEnded) {
    const peak = tallestWithin(lastSeason.feet, mountains);
    box.append(el("p", {}, el("strong", {}, `Season ${lastSeason.season}: ${feetText(lastSeason.feet)}.`), peak ? ` That is ${comparedTo(lastSeason.feet, peak)}.` : ""));
  }
  const close = el("button", { type: "button", class: "secondary" }, "Got it");
  close.addEventListener("click", () => {
    storageSet(REVEAL_KEY, String(last.week));
    box.hidden = true;
  });
  box.append(close);
  box.hidden = false;
}

// The "Past weeks" page: the feet and the landmark of each finished week.
function renderHistory(weeks, seasons) {
  const box = $("history");
  box.replaceChildren();
  const past = weeks.slice(0, -1).reverse();
  if (past.length === 0) {
    box.append(el("p", { class: "muted" }, "Finished weeks show up here."));
    return;
  }
  for (const s of seasons.filter((x) => x && x.complete).reverse()) {
    const peak = tallestWithin(s.feet, mountains);
    box.append(el("p", {}, el("strong", {}, `Season ${s.season}: ${feetText(s.feet)}.`), peak ? ` That is ${comparedTo(s.feet, peak)}.` : ""));
  }
  const rows = past.map((w) => {
    const landmark = tallestWithin(w.feet, landmarks);
    const label = w.season === null ? `Week ${w.week}` : `Season ${w.season}, week ${w.seasonWeek}`;
    return el(
      "tr", {},
      el("td", {}, label, el("div", { class: "muted" }, `${prettyDate(w.from)} – ${prettyDate(w.to)}`)),
      el("td", { class: "num" }, w.feet.toLocaleString()),
      el("td", {}, landmark ? `${landmark.name} (${landmark.feet.toLocaleString()} ft)` : "–"),
    );
  });
  box.append(table([["Week"], ["Feet", "num"], ["Higher than"]], rows));
}

// The "How it works" page: what the challenge is, the first three steps, then the rules.
function renderRules() {
  const perTest = Math.round(20 * config.weeklyMultiplier);
  const perSet = Math.round(20 * config.setShare);
  $("how-intro").textContent = "Everyone does pushups at their own level. Each week, the group climbs a mountain together.";
  const steps = [
    "Choose your name. If you are not on the list, choose \"I'm new\".",
    `Do any pushups on ${STARTER_DAYS} days. One counts. Log them each day.`,
    `Then do a max-reps test: one set of as many good pushups as you can. Your test sets your weekly target. A test of 20 gives ${perTest} a week, for example 3 sets of ${perSet} on 5 days.`,
  ];
  const rules = [
    "Any kind of pushup counts, from wall pushups to one-armed. Use the same kind for your test and your sets.",
    "Only the weekly total counts. If you miss a set, do an extra one on another day.",
    `Most sets are not max sets. An everyday set is about ${Math.round(config.setShare * 100)}% of your test, so you stop with 2 or 3 reps left.`,
    "Weeks run Monday to Sunday. A season is 4 weeks. In week 4, do a new test to set your target for the next season.",
    "You can retest any day. Your new target starts that day. Retest when you move to a harder kind of pushup.",
    "The board shows the days you logged and your percent of your own target. It does not show reps.",
    "The climb: each set at your set size is one step, and reps add up over the week. A target of 3 sets a day for 5 days is 15 steps. Before your test, each day you log is 3 steps. The summit is every target added up, so extra sets cover a friend.",
    "One rep is one foot. On Monday, the page shows how high the group climbed and a landmark of that height. After 4 weeks, it shows a mountain.",
    "Skip two weeks in a row and you leave the climb until you log again. No penalty.",
    "Logged the wrong number? Tap Undo right after you log. For an older mistake, open \"Another day\".",
  ];
  $("first-steps").replaceChildren(...steps.map((t) => el("li", {}, t)));
  $("rules").replaceChildren(...rules.map((t) => el("li", {}, t)));
}

// The latest release note, until this person closes it.
function renderWhatsNew() {
  const box = $("whats-new");
  if (storageGet(SEEN_KEY) === whatsNew.date) {
    box.hidden = true;
    return;
  }
  box.replaceChildren(
    el("h2", {}, whatsNew.title || `What's new · ${prettyDate(whatsNew.date)}`),
    ...whatsNew.paragraphs.map((t) => el("p", {}, t)),
    el("ul", {}, ...whatsNew.items.map((t) => el("li", {}, t))),
    el("button", { type: "button", id: "close-whats-new", class: whatsNew.button ? "" : "secondary" }, whatsNew.button || "Got it"),
  );
  box.hidden = false;
  $("close-whats-new").addEventListener("click", () => {
    storageSet(SEEN_KEY, whatsNew.date);
    box.hidden = true;
  });
}

// The test page and the "Another day" page need a person with a name on the board.
function renderPages() {
  const known = knownName();
  for (const id of ["test-form", "day-form"]) $(id).hidden = !known;
  for (const id of ["test-who", "day-who"]) {
    $(id).textContent = known ? `Logging as ${known}.` : "First log a day on the main page, or choose your name there.";
  }
  const last = known ? summary.lastTests[known] : null;
  $("test-last").textContent = last ? `Last test: ${last.reps} on ${prettyDate(last.date)}` : "No test yet.";
  $("take-off").checked = false;
  $("day-submit").textContent = "Log reps";
}

// The pages behind the links: #how, #past, #test and #day. Any other address shows the main page.
const PAGES = ["how", "past", "test", "day"];
function showPage() {
  const page = PAGES.includes(location.hash.slice(1)) ? location.hash.slice(1) : null;
  $("home").hidden = Boolean(page);
  for (const p of PAGES) $(`page-${p}`).hidden = p !== page;
  if (page) $(`page-${page}`).querySelector("h2").focus();
}

function render() {
  if (!summary) return;
  const current = summary.weeks.at(-1);
  if (current) {
    const which = current.season === null ? `Week ${current.week}` : `Season ${current.season}, week ${current.seasonWeek} of ${SEASON_WEEKS}`;
    $("week-label").textContent = `${which} · ${dayDate(current.from)} to ${dayDate(current.to)}`;
  } else {
    const w1 = weekRange(1, config.startDate);
    $("week-label").textContent = `Starts ${dayDate(w1.from)}`;
  }
  if (!knownName()) renderNameSelect();
  renderMe();
  renderGroup(current);
  renderReveal(summary.weeks, summary.seasons);
  renderHistory(summary.weeks, summary.seasons);
  renderPages();
}

async function refresh() {
  try {
    const entries = await store.list();
    lastEntries = entries;
    const pushups = entries.filter((e) => !e.exercise || e.exercise === "pushups" || e.exercise === TEST_EXERCISE);
    summary = summarize(pushups, localDate(), config);
    $("error").hidden = true;
    render();
  } catch (err) {
    lastEntries = null;
    $("error").textContent = `Could not load the log: ${err.message}`;
    $("error").hidden = false;
  }
}

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

// Save one entry and load the log again. Returns true if the entry is in the log.
async function save(entry, button) {
  const status = $("form-status");
  button.disabled = true;
  status.textContent = "Saving…";
  try {
    try {
      await store.add(entry);
    } catch (err) {
      if (!err.unconfirmed || !(await landed(entry))) throw err;
    }
    currentName = entry.name;
    storageSet(NAME_KEY, currentName);
    await refresh();
    return true;
  } catch (err) {
    status.textContent = err.unconfirmed
      ? "Couldn't confirm your reps were saved. Refresh the page and check the board before you log them again."
      : `Not saved: ${err.message}`;
    return false;
  } finally {
    button.disabled = false;
  }
}

// Show the message and put the cursor in the field that has the problem.
function fail(message, id) {
  $("form-status").textContent = message;
  $(id).setAttribute("aria-invalid", "true");
  $(id).focus();
}

// "Logged 13. Undo." The Undo button takes back the entry just logged.
function showLogged(entry) {
  lastLogged = entry;
  const undo = el("button", { type: "button", class: "link" }, "Undo");
  undo.addEventListener("click", async () => {
    if (lastLogged !== entry) return;
    lastLogged = null;
    if (await save({ ...entry, reps: -entry.reps }, undo)) $("form-status").textContent = `Took off ${entry.reps}.`;
  });
  $("form-status").replaceChildren(`Logged ${entry.reps}. `, undo, ".");
}

// The main form: reps for today.
$("log-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const known = knownName();
  const picked = $("new-name").value.trim();
  const reps = Number($("reps").value);
  for (const id of ["new-name", "reps"]) $(id).removeAttribute("aria-invalid");
  if (!known && !picked) return fail("Enter your name.", "new-name");
  // A new name that is already on the board would add reps to that person's row.
  const taken = known ? null : summary && summary.names.find((n) => n.toLowerCase() === picked.toLowerCase());
  if (taken) return fail(`${taken} is already in the challenge. If that's you, pick your name from the list. If not, add your last initial, for example ${taken} R.`, "new-name");
  if (!Number.isInteger(reps) || reps < 1) return fail("Enter a whole number of pushups, 1 or more.", "reps");
  const entry = { name: known || picked, date: localDate(), reps, exercise: "pushups" };
  if (!(await save(entry, $("submit")))) return;
  $("reps").value = "";
  $("new-name").value = "";
  showLogged(entry);
});

// The test page: one max-reps test, dated today.
$("test-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const reps = Number($("test-reps").value);
  $("test-reps").removeAttribute("aria-invalid");
  if (!Number.isInteger(reps) || reps < 1) return fail("Enter a whole number of pushups, 1 or more.", "test-reps");
  if (!(await save({ name: knownName(), date: localDate(), reps, exercise: TEST_EXERCISE }, $("test-submit")))) return;
  $("test-reps").value = "";
  lastLogged = null;
  $("form-status").textContent = `Saved your max-reps test: ${reps}. Your target changes from today.`;
  location.hash = "";
});

// The "Another day" page: reps for an earlier day, or reps to take off.
$("day-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const typed = Number($("day-reps").value);
  const date = $("date").value;
  for (const id of ["day-reps", "date"]) $(id).removeAttribute("aria-invalid");
  if (!Number.isInteger(typed) || typed < 1) return fail("Enter a whole number of pushups, 1 or more.", "day-reps");
  if (!date) return fail("Pick a day.", "date");
  if (date > localDate()) return fail("That day is in the future.", "date");
  // Phone number pads have no minus key, so the checkbox makes the number negative.
  const reps = $("take-off").checked ? -typed : typed;
  if (!(await save({ name: knownName(), date, reps, exercise: "pushups" }, $("day-submit")))) return;
  $("day-reps").value = "";
  lastLogged = null;
  if (date < config.startDate) $("form-status").textContent = `Saved, but reps before ${prettyDate(config.startDate)} do not count.`;
  else $("form-status").textContent = reps < 0 ? `Took off ${-reps} for ${prettyDate(date)}.` : `Saved ${reps} for ${prettyDate(date)}.`;
  location.hash = "";
});
$("take-off").addEventListener("change", () => {
  $("day-submit").textContent = $("take-off").checked ? "Take off reps" : "Log reps";
});

function choose(name) {
  currentName = name;
  storageSet(NAME_KEY, name);
  lastLogged = null;
  $("form-status").textContent = "";
  render();
}
$("name-select").addEventListener("change", () => {
  if ($("name-select").value !== NEW_NAME) choose($("name-select").value);
});
$("switch-name").addEventListener("click", () => choose(""));

$("demo-banner").hidden = Boolean(config.scriptUrl);
$("clear-demo").addEventListener("click", () => {
  try { localStorage.removeItem(DEMO_KEY); } catch { /* nothing stored */ }
  $("form-status").textContent = demoSeed ? "Demo entries reset to the starting copy." : "Demo entries cleared.";
  refresh();
});
// With a seed file, the banner gets one button for each test person.
if (demoSeed) {
  const buttons = demoSeed.profiles.map((p) => {
    const button = el("button", { type: "button", class: "secondary", style: "margin: 0 6px 6px 0" }, p.label);
    button.addEventListener("click", () => choose(p.name));
    return button;
  });
  $("demo-banner").append(el("p", {}, "This preview starts from a copy of the real log. View the page as:"), el("p", {}, ...buttons));
}
if (todayOverride) $("demo-banner").append(el("p", {}, `Showing the page as of ${dayDate(todayOverride)}.`));

window.addEventListener("hashchange", showPage);
$("date").value = localDate();
$("date").max = localDate();
renderRules();
renderWhatsNew();
showPage();
refresh();
