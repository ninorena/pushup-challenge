# Pushup Challenge

A shared weekly pushup goal for a group of friends. Each person logs their reps. The site adds up everyone's personal targets into one group goal.

The site is plain HTML and JavaScript on GitHub Pages. A Google Sheet stores the reps.

## The rules

- Weeks run Monday to Sunday. Week 1 starts on `startDate` in `config.js`, which must be a Monday.
- Seasons are 4 weeks long. Season 1 starts on `seasonStart` in `config.js`, which must be a Monday. Weeks before it show reps only, with no targets.
- A person sets their target with a max-reps test: one set of as many good pushups as they can, logged with the "max-reps test" box ticked. The Sheet stores it with the exercise `pushups-max`. Its reps count toward the week too.
- A person's weekly target is their latest test from before the week started, times `weeklyMultiplier` (6.5), rounded. A test of 20 gives 130.
- A person with no test is in a test week. They show on the board, but they do not count toward the group goal.
- Week 4 of each season is a light week: `lightWeekShare` (half) of the usual target. People retest that week for the next season.
- Each person picks their kind of pushup (wall, box, knee or full) and tests in that kind. Every rep counts as one. A person who moves to a harder kind retests.
- A person's percent is reps divided by target. The group goal is the average percent of everyone with a target. Over 100% counts.
- A person who logs after `comebackAfterDays` (3) or more days without logging gets a ↩ next to their name that day.
- A person who logs nothing for two weeks in a row leaves the group goal until they log again. They keep their old target, or log a new test.
- A negative number fixes a mistake.

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

## Tests

```
npm test
```

The tests cover the rules in `challenge.js`. Expected result: `# fail 0`.
