import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { whatsNew } from "../whats-new.js";

test("the What's new box shows the newest entry of RELEASE-NOTES.md", () => {
  const notes = readFileSync(new URL("../RELEASE-NOTES.md", import.meta.url), "utf8");
  const newest = notes.split(/^## /m)[1];
  assert.ok(newest.startsWith(whatsNew.date), "newest entry has the same date");
  for (const line of [...whatsNew.paragraphs, ...whatsNew.items]) {
    assert.ok(newest.includes(line), `RELEASE-NOTES.md is missing: ${line}`);
  }
});
