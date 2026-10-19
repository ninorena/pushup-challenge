export const config = {
  // Paste the Web app URL from the Google Apps Script deployment here.
  // Leave it empty to run in demo mode, where entries stay in your own browser.
  scriptUrl: "",

  // The first day of week 1. Every week runs 7 days from this day.
  startDate: "2026-10-26",

  rules: {
    // Each week, a person's target grows by this share of their baseline.
    weeklyIncrease: 0.1,
    // Every Nth week repeats the previous target, to recover. 0 turns this off.
    recoveryEvery: 4,
  },
};
