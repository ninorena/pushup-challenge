import { test } from "node:test";
import assert from "node:assert/strict";
import { weekOf, weekRange, targetFor, summarize } from "../challenge.js";

const rules = { weeklyIncrease: 0.1, recoveryEvery: 4 };
const config = { startDate: "2026-10-26", rules };

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

test("targets grow 10% of baseline per week and repeat every 4th week", () => {
  const t = [1, 2, 3, 4, 5, 8, 9].map((k) => targetFor(100, k, rules));
  assert.deepEqual(t, [110, 120, 130, 130, 140, 160, 170]);
});

test("small baselines still grow by at least 1 rep", () => {
  assert.deepEqual([1, 2, 3].map((k) => targetFor(3, k, rules)), [4, 5, 6]);
});

test("recovery weeks can be turned off", () => {
  assert.equal(targetFor(100, 4, { weeklyIncrease: 0.1, recoveryEvery: 0 }), 140);
});

test("a late joiner adds their own baseline without changing anyone else", () => {
  const entries = [
    { name: "Ana", date: "2026-10-27", reps: 100 }, // week 1 baseline
    { name: "Ana", date: "2026-11-03", reps: 115 }, // week 2
    { name: "Ana", date: "2026-11-10", reps: 120 }, // week 3
    { name: "Ben", date: "2026-11-10", reps: 60 }, // week 3 baseline
    { name: "Ana", date: "2026-11-17", reps: 50 }, // week 4
    { name: "Ben", date: "2026-11-17", reps: 70 }, // week 4
  ];
  const s = summarize(entries, "2026-11-18", config);
  assert.equal(s.currentWeek, 4);
  const [w1, w2, w3, w4] = s.weeks;
  assert.equal(w1.groupTarget, 0);
  assert.equal(w1.baselineReps, 100);
  assert.equal(w1.hit, false);
  assert.equal(w2.groupTarget, 110);
  assert.equal(w2.hit, true);
  assert.equal(w3.groupTarget, 120);
  assert.equal(w3.baselineReps, 60);
  assert.equal(w4.groupTarget, 130 + 66);
  assert.equal(w4.groupReps, 120);
  assert.equal(w4.hit, false);
});

test("names match regardless of case and spaces", () => {
  const entries = [
    { name: "ana", date: "2026-10-27", reps: 40 },
    { name: " Ana ", date: "2026-10-28", reps: 60 },
  ];
  const s = summarize(entries, "2026-10-28", config);
  assert.deepEqual(s.names, ["ana"]);
  assert.equal(s.weeks[0].baselineReps, 100);
});

test("negative entries correct a mistake", () => {
  const entries = [
    { name: "Ana", date: "2026-10-27", reps: 1000 },
    { name: "Ana", date: "2026-10-27", reps: -900 },
  ];
  assert.equal(summarize(entries, "2026-10-27", config).weeks[0].baselineReps, 100);
});

test("two empty weeks take a person out of the target until they return", () => {
  const entries = [
    { name: "Ana", date: "2026-10-27", reps: 100 }, // week 1
    { name: "Ben", date: "2026-10-27", reps: 50 }, // week 1
    { name: "Ana", date: "2026-11-03", reps: 110 }, // week 2
    { name: "Ana", date: "2026-11-10", reps: 120 }, // week 3
    { name: "Ben", date: "2026-11-24", reps: 10 }, // week 5
  ];
  const s = summarize(entries, "2026-11-24", config);
  const names = (w) => s.weeks[w - 1].members.map((m) => m.name);
  assert.deepEqual(names(2), ["Ana", "Ben"]); // missed one week: still counts
  assert.deepEqual(names(3), ["Ana"]); // missed two: out
  assert.deepEqual(names(4), ["Ana"]);
  assert.deepEqual(names(5), ["Ben"]); // Ben is back, Ana has now missed two
});

test("entries before the start or after today are ignored", () => {
  const entries = [
    { name: "Ana", date: "2026-10-20", reps: 500 },
    { name: "Ana", date: "2026-10-27", reps: 100 },
    { name: "Ana", date: "2026-12-01", reps: 500 },
  ];
  const s = summarize(entries, "2026-10-28", config);
  assert.equal(s.weeks.length, 1);
  assert.equal(s.weeks[0].baselineReps, 100);
});

test("before the start date there are no weeks", () => {
  assert.deepEqual(summarize([], "2026-10-20", config).weeks, []);
});
