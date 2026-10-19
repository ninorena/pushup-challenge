# Pushup Challenge

A shared weekly pushup goal for a group of friends. Each person logs their reps. The site adds up everyone's personal targets into one group goal.

The site is plain HTML and JavaScript on GitHub Pages. A Google Sheet stores the reps.

## The rules

- Week 1 starts on `startDate` in `config.js`. Every week is 7 days from that day.
- A person's first week is their baseline: the total they did that week.
- After that, their weekly target grows by 10% of their baseline each week.
- Every 4th week after the baseline repeats the week before, for recovery.
- The group goal is the sum of everyone's targets for the week.
- A person who logs nothing for two weeks in a row leaves the group goal until they log again.
- Any pushup variation counts as one rep. A negative number fixes a mistake.

To change the growth rate or the recovery week, edit `rules` in `config.js`.

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
