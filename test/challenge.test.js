import { test } from "node:test";
import assert from "node:assert/strict";
import { weekOf, weekRange, seasonWeek, targetForWeek, comebackDays, setSize, summarize } from "../challenge.js";

// Weeks 1 and 2 (Oct 26, Nov 2) are before seasons. Season 1 is weeks 3 to 6
// (Nov 9 to Dec 6). Season 2 starts in week 7 (Dec 7).
const config = {
  startDate: "2026-10-26",
  seasonStart: "2026-11-09",
  weeklyMultiplier: 6.5,
  lightWeekShare: 0.5,
  comebackAfterDays: 3,
  setShare: 0.65,
};
const MAX = "pushups-max";

function member(summary, week, name) {
  return summary.weeks[week - 1].members.find((m) => m.name === name);
}

test("weekOf counts 7-day weeks from the start date", () => {
  assert.equal(weekOf("2026-10-26", "2026-10-26"), 1);
  assert.equal(weekOf("2026-11-01", "2026-10-26"), 1);
  assert.equal(weekOf("2026-11-02", "2026-10-26"), 2);
  assert.equal(weekOf("2026-10-25", "2026-10-26"), 0);
});

test("weekOf is not shifted by a daylight-saving change", () => {
  // US clocks change on 2026-11-01, inside week 1.
  assert.equal(weekOf("2026-11-08", "2026-10-26"), 2);
  assert.equal(weekOf("2026-11-09", "2026-10-26"), 3);
});

test("weekRange gives the first and last day", () => {
  assert.deepEqual(weekRange(2, "2026-10-26"), { from: "2026-11-02", to: "2026-11-08" });
});

test("rule 1: seasons are 4 weeks long from seasonStart", () => {
  assert.equal(seasonWeek(2, config), null);
  assert.deepEqual(seasonWeek(3, config), { season: 1, week: 1 });
  assert.deepEqual(seasonWeek(6, config), { season: 1, week: 4 });
  assert.deepEqual(seasonWeek(7, config), { season: 2, week: 1 });
});

test("rule 1: a daylight-saving change does not move the season week", () => {
  const dst = { ...config, startDate: "2026-10-26", seasonStart: "2026-10-26" };
  assert.deepEqual(seasonWeek(weekOf("2026-11-02", dst.startDate), dst), { season: 1, week: 2 });
});

test("rule 2: a test's reps count toward that week's total", () => {
  const s = summarize([{ name: "Ana", date: "2026-11-10", reps: 20, exercise: MAX }], "2026-11-10", config);
  assert.equal(member(s, 3, "Ana").reps, 20);
});

test("rule 3: no test means no target, and the person is in a test week", () => {
  const s = summarize([{ name: "Ana", date: "2026-11-10", reps: 30, exercise: "pushups" }], "2026-11-10", config);
  const ana = member(s, 3, "Ana");
  assert.equal(ana.target, null);
  assert.equal(ana.testWeek, true);
  assert.equal(s.weeks[2].groupPercent, null);
});

test("rule 3: a test in week 4 sets next season's target, not week 4's", () => {
  const tests = [{ date: "2026-11-02", reps: 20 }, { date: "2026-12-01", reps: 30 }];
  assert.equal(targetForWeek(tests, "2026-11-30", 4, config), 65); // from the first test, light
  assert.equal(targetForWeek(tests, "2026-12-07", 1, config), 195); // from the second test
});

test("rule 3: a person in a test week can see next week's target", () => {
  const entries = [{ name: "Ana", date: "2026-11-11", reps: 25, exercise: MAX }]; // week 3
  const ana = member(summarize(entries, "2026-11-11", config), 3, "Ana");
  assert.equal(ana.target, null);
  assert.equal(ana.nextTarget, 163);
});

test("an everyday set is about 65% of the latest test", () => {
  assert.equal(setSize([{ date: "2026-11-01", reps: 20 }, { date: "2026-11-10", reps: 25 }], config), 16);
  assert.equal(setSize([], config), null);
  const s = summarize([{ name: "Ana", date: "2026-11-10", reps: 20, exercise: MAX }], "2026-11-10", config);
  assert.equal(s.setSizes.Ana, 13);
});

test("rule 4: the weekly target is the max times weeklyMultiplier, rounded", () => {
  assert.equal(targetForWeek([{ date: "2026-11-01", reps: 20 }], "2026-11-09", 1, config), 130);
  assert.equal(targetForWeek([{ date: "2026-11-01", reps: 7 }], "2026-11-09", 1, config), 46);
});

test("rule 5: week 4 of a season is a light week", () => {
  assert.equal(targetForWeek([{ date: "2026-11-01", reps: 20 }], "2026-11-30", 4, config), 65);
});

test("rule 6: a test mid-season changes the target from the next week", () => {
  const entries = [
    { name: "Ana", date: "2026-11-05", reps: 20, exercise: MAX }, // before season 1
    { name: "Ana", date: "2026-11-17", reps: 10, exercise: MAX }, // week 4: moved to a harder form
    { name: "Ana", date: "2026-11-24", reps: 5, exercise: "pushups" }, // week 5
  ];
  const s = summarize(entries, "2026-11-24", config);
  assert.equal(member(s, 4, "Ana").target, 130);
  assert.equal(member(s, 5, "Ana").target, 65);
});

test("rule 7: two empty weeks take a person out until they return, with their old target", () => {
  const entries = [
    { name: "Ana", date: "2026-11-02", reps: 20, exercise: MAX }, // week 2
    { name: "Ben", date: "2026-11-02", reps: 10, exercise: MAX },
    { name: "Ana", date: "2026-11-10", reps: 100 }, // week 3
    { name: "Ana", date: "2026-11-17", reps: 100 }, // week 4
    { name: "Ben", date: "2026-11-24", reps: 50 }, // week 5
  ];
  const s = summarize(entries, "2026-11-24", config);
  const names = (w) => s.weeks[w - 1].members.map((m) => m.name);
  assert.deepEqual(names(3), ["Ana", "Ben"]); // Ben missed one week: still counts
  assert.deepEqual(names(4), ["Ana"]); // missed two: out
  assert.deepEqual(names(5), ["Ana", "Ben"]); // Ben is back
  assert.equal(member(s, 5, "Ben").target, 65); // keeps his old target (max 10)
});

test("rule 8: percent is not capped, and the group percent is the average", () => {
  const entries = [
    { name: "Ana", date: "2026-11-02", reps: 20, exercise: MAX },
    { name: "Ben", date: "2026-11-02", reps: 20, exercise: MAX },
    { name: "Ana", date: "2026-11-10", reps: 195 }, // 150% of 130
    { name: "Ben", date: "2026-11-10", reps: 65 }, // 50% of 130
  ];
  const w3 = summarize(entries, "2026-11-10", config).weeks[2];
  assert.equal(w3.members.find((m) => m.name === "Ana").percent, 150);
  assert.equal(w3.groupPercent, 100);
  assert.equal(w3.hit, true);
});

test("rule 8: a person in a test week is not counted in the group percent", () => {
  const entries = [
    { name: "Ana", date: "2026-11-02", reps: 20, exercise: MAX },
    { name: "Ana", date: "2026-11-10", reps: 130 },
    { name: "Ben", date: "2026-11-10", reps: 5 }, // no test yet
  ];
  const w3 = summarize(entries, "2026-11-10", config).weeks[2];
  assert.equal(w3.groupPercent, 100);
  assert.equal(w3.members.length, 2);
});

test("rule 9: a comeback is a logging day 3 or more days after the last one", () => {
  assert.deepEqual(comebackDays(["2026-11-10", "2026-11-12", "2026-11-15"], 3), ["2026-11-15"]);
  assert.deepEqual(comebackDays(["2026-11-10"], 3), []); // the first day is not a comeback
  assert.deepEqual(comebackDays(["2026-11-10", "2026-11-10", "2026-11-11"], 3), []);
});

test("rule 9: summarize lists a person's comeback days in each week", () => {
  const entries = [
    { name: "Ana", date: "2026-11-09", reps: 10 },
    { name: "Ana", date: "2026-11-13", reps: 10 },
  ];
  assert.deepEqual(member(summarize(entries, "2026-11-13", config), 3, "Ana").comebacks, ["2026-11-13"]);
});

test("rule 11: weeks before seasonStart show reps with no target", () => {
  const entries = [
    { name: "Ana", date: "2026-10-27", reps: 100 },
    { name: "Ana", date: "2026-10-28", reps: 20, exercise: MAX },
  ];
  const s = summarize(entries, "2026-10-28", config);
  const ana = member(s, 1, "Ana");
  assert.equal(ana.reps, 120);
  assert.equal(ana.target, null);
  assert.equal(ana.testWeek, false);
  assert.equal(s.weeks[0].season, null);
});

test("names match regardless of case and spaces", () => {
  const entries = [
    { name: "ana", date: "2026-10-27", reps: 40 },
    { name: " Ana ", date: "2026-10-28", reps: 60 },
  ];
  const s = summarize(entries, "2026-10-28", config);
  assert.deepEqual(s.names, ["ana"]);
  assert.equal(s.weeks[0].groupReps, 100);
});

test("negative entries correct a mistake", () => {
  const entries = [
    { name: "Ana", date: "2026-10-27", reps: 1000 },
    { name: "Ana", date: "2026-10-27", reps: -900 },
  ];
  assert.equal(summarize(entries, "2026-10-27", config).weeks[0].groupReps, 100);
});

test("entries before the start or after today are ignored", () => {
  const entries = [
    { name: "Ana", date: "2026-10-20", reps: 500 },
    { name: "Ana", date: "2026-10-27", reps: 100 },
    { name: "Ana", date: "2026-12-01", reps: 500 },
  ];
  const s = summarize(entries, "2026-10-28", config);
  assert.equal(s.weeks.length, 1);
  assert.equal(s.weeks[0].groupReps, 100);
});

test("before the start date there are no weeks", () => {
  assert.deepEqual(summarize([], "2026-10-20", config).weeks, []);
});
