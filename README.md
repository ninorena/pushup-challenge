# Pushup Challenge

A weekly pushup challenge for a group of friends. Each person logs their reps. Each person has their own target, and the group climbs a mountain together.

The site is plain HTML and JavaScript on GitHub Pages. A Google Sheet stores the reps.

## The rules

- Weeks run Monday to Sunday. Week 1 starts on `startDate` in `config.js`, which must be a Monday.
- Seasons are 4 weeks long. Season 1 starts on `seasonStart` in `config.js`, which must be a Monday. Weeks before it show reps only, with no targets.
- A new person is a starter. A starter does any quantity of pushups on 5 days (`STARTER_DAYS` in `challenge.js`). A logged day is a day with more than 0 reps. After 5 logged days, the page asks for the max-reps test. A starter can do the test earlier.
- A person sets their target with a max-reps test: one set of as many good pushups as they can, logged on the "Max-reps test" page. The Sheet stores it with the exercise `pushups-max`. Its reps count toward the week too.
- A person's weekly target is their latest test times `weeklyMultiplier` (9.75), rounded. A test of 20 gives 195: 3 sets of 13 on 5 days. Before Nov 23 the multiplier was 6.5, and `earlierMultipliers` in `config.js` keeps past weeks at that rate.
- A person can retest any day. The new target counts from the test day, and the days before keep the old one. Each day is 1/7 of the week. Example: 195 a week, then a test of 30 (293 a week) on Thursday, gives 3/7 × 195 + 4/7 × 293 = 251 that week. A lower test lowers the target the same way.
- A person whose first test is mid-week gets a target for the rest of that week.
- Week 4 of each season is a retest week. Its target is a normal week's target. People retest that week, and the new target starts on the test day, as with any retest.
- Any kind of pushup counts, from wall pushups to one-armed. A person uses the same kind for the test and the sets. Every rep counts as one. A person who moves to a harder kind retests.
- The board shows 7 marks for the days of the week and a percent for each person. The percent is reps divided by target. The board does not show reps. A person sees their own reps on their own card.
- The group climbs a mountain each week. A person with a target adds 1 step for each 10% of the target. A starter adds 2 steps for each logged day. The maximum is 10 steps a week for each person, so a strong week does not cover another person. The summit is every person at 10 steps.
- One rep is one foot. The page shows the feet of a week only after the week ends. It shows them with the tallest landmark in `heights.js` that is not taller. A week always shows its feet, also when the group did not reach the summit.
- The feet of a season are the sum of its 4 weeks. After week 4, the page shows them with a mountain from `heights.js`. The feet start at zero each season.
- Each height in `heights.js` has the address of its source.
- A person who logs after `comebackAfterDays` (3) or more days without logging gets a "Welcome back" card that day.
- A person who logs nothing for two weeks in a row leaves the climb until they log again. They keep their old target, or log a new test.
- Each name is one person. A new name that is already on the board, in any case, is refused. The person picks their name from the list, or adds a last initial.
- The main form logs reps for today. An Undo button shows after each log. The "Another day" page logs reps for an earlier day and takes off reps. Each fix adds a negative entry to the Sheet.

To change these numbers, edit `config.js`.

## Release notes

Every release adds an entry at the top of `RELEASE-NOTES.md` and copies it into `whats-new.js`. The page shows that entry in a "What's new" box until each person closes it. `npm test` fails if the two do not match.

## Set up the Google Sheet (one time, about 5 minutes)

1. Make a new Google Sheet. Name it "Pushup Challenge".
2. In the sheet, click **Extensions → Apps Script**. A code editor opens.
3. Delete the code in the editor. Paste in all of `apps-script/Code.gs`. Click the save icon.
4. Click **Deploy → New deployment**. Click the gear next to "Select type" and pick **Web app**.
5. Set **Execute as** to **Me**. Set **Who has access** to **Anyone**. Click **Deploy**.
6. Google asks you to allow access. Pick your account. If you see "Google hasn't verified this app", click **Advanced**, then **Go to (project name)**. This is your own script, so it is safe.
7. Copy the **Web app URL**. It ends in `/exec`.
8. Paste that URL into `scriptUrl` in `config.js`.

The script adds a tab named **Log** to the sheet the first time someone logs reps. To fix or remove an entry, edit that tab.

If you change `Code.gs` later, use **Deploy → Manage deployments → Edit → Version: New version**. A new deployment gives a new URL.

Anyone with the site link can add entries. That is fine for a group of friends. Do not share the link publicly.

## Try it without the sheet

Leave `scriptUrl` empty. The site runs in demo mode and keeps entries in your browser only.

To open it on your computer, run this in the project folder. It starts a small web server:

```
python3 -m http.server 8000
```

Then open http://localhost:8000. Press Ctrl-C in the terminal to stop the server.

Demo mode has two more tools for testing:

- Add `?today=2026-11-30` to the address to see the page as it will look on that day.
- Put a `demo-seed.json` file next to the page to start the demo with entries. The file holds `startDate`, `seasonStart`, `entries`, and `profiles`, a list of test people. Each test person gets a button in the demo banner.

Neither tool does anything when `scriptUrl` is set.

## Tests

```
npm test
```

The tests cover the rules in `challenge.js`. Expected result: `# fail 0`.
