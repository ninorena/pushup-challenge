import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { whatsNew } from "../whats-new.js";

test("the What's new box shows the newest entry of RELEASE-NOTES.md", () => {
  const notes = readFileSync(new URL("../RELEASE-NOTES.md", import.meta.url), "utf8");
  const newest = notes.split(/^## /m)[1];
  assert.ok(newest.startsWith(whatsNew.date), "newest entry has the same date");
  if (whatsNew.title) assert.ok(newest.startsWith(`${whatsNew.date}: ${whatsNew.title}`), "newest entry has the same title");
  for (const line of [...whatsNew.paragraphs, ...whatsNew.items]) {
    assert.ok(newest.includes(line), `RELEASE-NOTES.md is missing: ${line}`);
  }
});

// A browser can keep an old copy of a file for some minutes after a release. An old script with a new page stops the page.
// The date in each address makes the browser get the new file. This test fails if a release forgets to change one of them.
test("each address of a page file has the date of the newest release note", () => {
  const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
  const page = [...read("index.html").matchAll(/(?:href|src)="((?:style\.css|app\.js)[^"]*)"/g)].map((m) => m[1]);
  const imports = [...read("app.js").matchAll(/^import .* from "\.\/([^"]+)"/gm)].map((m) => m[1]);
  assert.equal(page.length, 2, "index.html loads style.css and app.js");
  assert.ok(imports.length > 0, "app.js imports its modules");
  for (const address of [...page, ...imports]) {
    assert.ok(address.endsWith(`?v=${whatsNew.date}`), `${address} must end with ?v=${whatsNew.date}`);
  }
});
