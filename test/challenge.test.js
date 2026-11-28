import { test } from "node:test";
import assert from "node:assert/strict";
import { weekOf, weekRange, seasonWeek, targetForWeek, comebackDays, setSize, summarize, multiplierOn, stepsFor, setsPerWeek, tallestWithin } from "../challenge.js";

// Weeks 1 and 2 (Oct 26, Nov 2) are before seasons. Season 1 is weeks 3 to 6
// (Nov 9 to Dec 6). Season 2 starts in week 7 (Dec 7).
const config = {
  startDate: "2026-10-26",
  seasonStart: "2026-11-09",
  weeklyMultiplier: 6.5,
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

test("rule 3: no test means no target", () => {
  const s = summarize([{ name: "Ana", date: "2026-11-10", reps: 30, exercise: "pushups" }], "2026-11-10", config);
  const ana = member(s, 3, "Ana");
  assert.equal(ana.target, null);
});

test("rule 3: a test in week 4 changes the target from the test day, like any retest", () => {
  // Week 6 (Nov 30 to Dec 6) is season week 4. Test on Tuesday Dec 1.
  const tests = [{ date: "2026-11-02", reps: 20 }, { date: "2026-12-01", reps: 30 }];
  assert.equal(targetForWeek(tests, "2026-11-30", config), 186); // 1/7 of 130 + 6/7 of 195
  assert.equal(targetForWeek(tests, "2026-12-07", config), 195); // next season, from the second test
});

test("rule 3: a person who tests in week 4 can see next week's target", () => {
  const entries = [{ name: "Ana", date: "2026-12-02", reps: 25, exercise: MAX }]; // week 6, season week 4
  const ana = member(summarize(entries, "2026-12-02", config), 6, "Ana");
  assert.equal(ana.target, 116); // 5 of 7 days at 163 a week
  assert.equal(ana.nextTarget, 163);
});

test("an everyday set is about 65% of the latest test", () => {
  assert.equal(setSize([{ date: "2026-11-01", reps: 20 }, { date: "2026-11-10", reps: 25 }], config), 16);
  assert.equal(setSize([], config), null);
  const s = summarize([{ name: "Ana", date: "2026-11-10", reps: 20, exercise: MAX }], "2026-11-10", config);
  assert.equal(s.setSizes.Ana, 13);
});

test("the summary gives each person's latest test", () => {
  const entries = [
    { name: "Ana", date: "2026-11-02", reps: 20, exercise: MAX },
    { name: "Ana", date: "2026-11-10", reps: 24, exercise: MAX },
    { name: "Ben", date: "2026-11-10", reps: 30, exercise: "pushups" },
  ];
  const s = summarize(entries, "2026-11-10", config);
  assert.deepEqual(s.lastTests.Ana, { date: "2026-11-10", reps: 24 });
  assert.equal(s.lastTests.Ben, null);
});

test("rule 4: the weekly target is the max times weeklyMultiplier, rounded", () => {
  assert.equal(targetForWeek([{ date: "2026-11-01", reps: 20 }], "2026-11-09", config), 130);
  assert.equal(targetForWeek([{ date: "2026-11-01", reps: 7 }], "2026-11-09", config), 46);
});

test("rule 4: a new multiplier starts on its date, and past weeks keep the old one", () => {
  const c = { ...config, weeklyMultiplier: 9.75, earlierMultipliers: [{ until: "2026-11-15", weeklyMultiplier: 6.5 }] };
  assert.equal(multiplierOn("2026-11-15", c), 6.5);
  assert.equal(multiplierOn("2026-11-16", c), 9.75);
  const tests = [{ date: "2026-11-01", reps: 20 }];
  assert.equal(targetForWeek(tests, "2026-11-09", c), 130); // week before the change
  assert.equal(targetForWeek(tests, "2026-11-16", c), 195); // week of the change
});

test("rule 5: week 4 of a season has a normal target", () => {
  assert.equal(targetForWeek([{ date: "2026-11-01", reps: 20 }], "2026-11-30", config), 130);
});

test("rule 6: a test mid-week changes the target from the test day on", () => {
  // Week 3 is Mon Nov 9 to Sun Nov 15. 130 a week before Thursday, 195 a week from Thursday.
  const tests = [{ date: "2026-11-02", reps: 20 }, { date: "2026-11-12", reps: 30 }];
  assert.equal(targetForWeek(tests, "2026-11-09", config), 167); // 3/7 of 130 + 4/7 of 195
  assert.equal(targetForWeek(tests, "2026-11-16", config), 195); // the full new rate next week
});

test("rule 6: a test on Monday sets the whole week", () => {
  const tests = [{ date: "2026-11-02", reps: 20 }, { date: "2026-11-09", reps: 30 }];
  assert.equal(targetForWeek(tests, "2026-11-09", config), 195);
});

test("rule 6: a lower test lowers the target from the test day on", () => {
  const entries = [
    { name: "Ana", date: "2026-11-05", reps: 20, exercise: MAX }, // before season 1
    { name: "Ana", date: "2026-11-17", reps: 10, exercise: MAX }, // Tue of week 4: moved to a harder form
    { name: "Ana", date: "2026-11-24", reps: 5, exercise: "pushups" }, // week 5
  ];
  const s = summarize(entries, "2026-11-24", config);
  assert.equal(member(s, 4, "Ana").target, 74); // 1/7 of 130 + 6/7 of 65
  assert.equal(member(s, 5, "Ana").target, 65);
});

test("rule 6: a first test mid-week gives a target for the rest of the week", () => {
  const entries = [
    { name: "Ana", date: "2026-11-02", reps: 20, exercise: MAX }, // week 2
    { name: "Ana", date: "2026-11-10", reps: 130 }, // week 3: 100%
    { name: "Ben", date: "2026-11-09", reps: 30 }, // Mon of week 3, before his test
    { name: "Ben", date: "2026-11-12", reps: 14, exercise: MAX }, // Thu: 4/7 of 91 = 52
  ];
  const s = summarize(entries, "2026-11-15", config);
  const ben = member(s, 3, "Ben");
  assert.equal(ben.target, 52);
  assert.equal(ben.reps, 44);
});

test("rule 6: a test after the week ends does not change it", () => {
  const tests = [{ date: "2026-11-02", reps: 20 }, { date: "2026-11-16", reps: 30 }];
  assert.equal(targetForWeek(tests, "2026-11-09", config), 130);
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

test("rule 8: one set at the set size is one step, and reps carry over in the week", () => {
  // Target 130, sets of 13, 10 sets a week.
  assert.equal(stepsFor(0, 130, 0, 13, 10), 0);
  assert.equal(stepsFor(12, 130, 1, 13, 10), 0);
  assert.equal(stepsFor(13, 130, 1, 13, 10), 1);
  assert.equal(stepsFor(129, 130, 5, 13, 10), 9);
  assert.equal(stepsFor(130, 130, 5, 13, 10), 10);
  assert.equal(stepsFor(400, 130, 5, 13, 10), 30); // no maximum: extra sets cover a friend
  assert.equal(stepsFor(-5, 130, 0, 13, 10), 0);
});

test("rule 8: a person at their target has every step, whatever the set size rounds to", () => {
  // Max 21: target 205, set 14 (rounded up). 15 sets of 14 is 210, but 205 is the target.
  assert.equal(stepsFor(14, 205, 1, 14, 15), 1);
  assert.equal(stepsFor(205, 205, 5, 14, 15), 15);
  // Max 17: target 166, set 11 (rounded down). One logged set is still one step.
  assert.equal(stepsFor(11, 166, 1, 11, 15), 1);
  assert.equal(stepsFor(166, 166, 5, 11, 15), 15);
});

test("rule 8: the sets in a target come from the multiplier and the set share", () => {
  const live = { ...config, weeklyMultiplier: 9.75, earlierMultipliers: [{ until: "2026-11-22", weeklyMultiplier: 6.5 }] };
  assert.equal(setsPerWeek("2026-11-23", live), 15);
  assert.equal(setsPerWeek("2026-11-16", live), 10);
});

test("rule 8: a starter adds three steps for each logged day", () => {
  assert.equal(stepsFor(3, null, 1), 3);
  assert.equal(stepsFor(900, null, 1), 3); // the reps of a starter do not change the steps
  assert.equal(stepsFor(40, null, 7), 21);
});

test("rule 8: a strong week covers another person", () => {
  const entries = [
    { name: "Ana", date: "2026-11-02", reps: 20, exercise: MAX },
    { name: "Ben", date: "2026-11-02", reps: 20, exercise: MAX },
    { name: "Ana", date: "2026-11-10", reps: 195 }, // 150% of 130
    { name: "Ben", date: "2026-11-10", reps: 65 }, // 50% of 130
  ];
  const w3 = summarize(entries, "2026-11-10", config).weeks[2];
  assert.equal(w3.members.find((m) => m.name === "Ana").percent, 150);
  assert.equal(w3.members.find((m) => m.name === "Ana").steps, 15);
  assert.equal(w3.steps, 20);
  assert.equal(w3.maxSteps, 20);
});

test("rule 8: a starter adds steps to the climb and no height to the mountain", () => {
  const entries = [
    { name: "Ana", date: "2026-11-02", reps: 20, exercise: MAX },
    { name: "Ana", date: "2026-11-10", reps: 130 },
    { name: "Ben", date: "2026-11-10", reps: 5 }, // no test yet
    { name: "Ben", date: "2026-11-11", reps: 1 },
  ];
  const w3 = summarize(entries, "2026-11-11", config).weeks[2];
  assert.equal(w3.steps, 16);
  assert.equal(w3.maxSteps, 10);
});

test("rule 12: each person has one mark for each day of the week, Monday first", () => {
  const entries = [
    { name: "Ana", date: "2026-11-09", reps: 10 },
    { name: "Ana", date: "2026-11-11", reps: 10 },
    { name: "Ana", date: "2026-11-11", reps: 5 },
  ];
  const ana = member(summarize(entries, "2026-11-15", config), 3, "Ana");
  assert.deepEqual(ana.days, [true, false, true, false, false, false, false]);
});

test("rule 12: an undo takes the day back", () => {
  const entries = [
    { name: "Ana", date: "2026-11-09", reps: 10 },
    { name: "Ana", date: "2026-11-10", reps: 6 },
    { name: "Ana", date: "2026-11-10", reps: -6 },
  ];
  const s = summarize(entries, "2026-11-10", config);
  assert.deepEqual(s.loggedDays.Ana, ["2026-11-09"]);
  assert.equal(member(s, 3, "Ana").steps, 3);
});

test("rule 13: one rep is one foot, and a season adds up its weeks", () => {
  const entries = [
    { name: "Ana", date: "2026-10-27", reps: 500 }, // week 1, before seasons
    { name: "Ana", date: "2026-11-10", reps: 300 }, // season 1, week 1
    { name: "Ben", date: "2026-11-17", reps: 200 }, // season 1, week 2
    { name: "Ana", date: "2026-12-01", reps: 100 }, // season 1, week 4
  ];
  const during = summarize(entries, "2026-12-06", config);
  assert.equal(during.weeks[2].feet, 300);
  assert.deepEqual(during.seasons, [{ season: 1, feet: 600, complete: false }]);
  const after = summarize(entries, "2026-12-07", config);
  assert.deepEqual(after.seasons, [
    { season: 1, feet: 600, complete: true },
    { season: 2, feet: 0, complete: false },
  ]);
});

test("rule 13: the landmark is the tallest one that is not taller than the feet", () => {
  const list = [{ name: "low", feet: 20 }, { name: "high", feet: 1000 }, { name: "mid", feet: 300 }];
  assert.equal(tallestWithin(999, list).name, "mid");
  assert.equal(tallestWithin(1000, list).name, "high");
  assert.equal(tallestWithin(19, list), null);
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
