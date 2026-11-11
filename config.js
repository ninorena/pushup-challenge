export const config = {
  // Paste the Web app URL from the Google Apps Script deployment here.
  // Leave it empty to run in demo mode, where entries stay in your own browser.
  scriptUrl: "https://script.google.com/macros/s/AKfycbwbaBfG8Poj3ENF2PfrTwUYaIDEqAgsX_uUTBeW3pY0hXL2CLnInaad4u-jnz1Yp5KS/exec",

  // The first day of week 1. It must be a Monday: weeks run Monday to Sunday.
  startDate: "2026-10-19",

  // The first day of season 1. It must be a Monday. Seasons are 4 weeks long.
  // Weeks before this date show reps only, with no targets.
  seasonStart: "2026-11-23",

  // Your weekly target is your latest max-reps test times this number.
  // 6.5 is about 2 sets at 65% of your max, 5 days a week.
  weeklyMultiplier: 6.5,

  // Week 4 of each season is a light week: this share of your usual target.
  lightWeekShare: 0.5,

  // Log after this many days or more without logging and you get a comeback badge for the day.
  comebackAfterDays: 3,
};
