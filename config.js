export const config = {
  // Paste the Web app URL from the Google Apps Script deployment here.
  // Leave it empty to run in demo mode, where entries stay in your own browser.
  scriptUrl: "https://script.google.com/macros/s/AKfycbwbaBfG8Poj3ENF2PfrTwUYaIDEqAgsX_uUTBeW3pY0hXL2CLnInaad4u-jnz1Yp5KS/exec",

  // The first day of week 1. It must be a Monday: weeks run Monday to Sunday.
  startDate: "2026-10-19",

  rules: {
    // Each week, a person's target grows by this share of their baseline.
    weeklyIncrease: 0.1,
    // Every Nth week repeats the previous target, to recover. 0 turns this off.
    recoveryEvery: 4,
  },
};
