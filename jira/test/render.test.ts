import assert from "node:assert/strict";
import test from "node:test";
import {
  fitSingleLineFontSize,
  fitTextBlock,
  formatDuration,
  MINIMUM_FONT_SIZE,
  renderDetail,
  renderIssue,
  statusColor,
  wrap,
} from "../src/render.js";
import type { JiraIssue } from "../src/types.js";

test("statusColor maps common workflow statuses", () => {
  assert.equal(statusColor("In Progress"), "#1570EF");
  assert.equal(statusColor("Waiting for customer"), "#DC6803");
  assert.equal(statusColor("Blocked"), "#B42318");
  assert.equal(statusColor("Ready for review"), "#7A5AF8");
});

test("formatDuration uses Jira's 8-hour day and 5-day week", () => {
  assert.equal(formatDuration(null), "None");
  assert.equal(formatDuration(0), "0m");
  assert.equal(formatDuration(288000), "80h");
});

test("wrap limits line length and count", () => {
  const lines = wrap("A compact but complete issue title for a tiny display", 12, 3);
  assert.ok(lines.length <= 3);
  assert.ok(lines.every((line) => line.length <= 12));
  assert.ok(lines.at(-1)?.endsWith("…"));
});

test("dynamic key images use Stream Deck-compatible encoded SVG data URLs", () => {
  const issue: JiraIssue = {
    key: "DEMO-101",
    summary: "Example ticket",
    description: "Example description",
    status: "In Progress",
    statusCategory: "indeterminate",
    originalEstimateSeconds: 3600,
    timeSpentSeconds: 600,
  };
  const image = renderIssue(issue);
  assert.ok(image.startsWith("data:image/svg+xml,%3Csvg"));
  assert.ok(decodeURIComponent(image).includes("DEMO-101"));
});

test("long project keys shrink to fit a Stream Deck key", () => {
  assert.equal(fitSingleLineFontSize("DEMO-101", 22, 15, 124), 22);
  assert.equal(fitSingleLineFontSize("SAMPLE-1234", 22, 15, 124), 18);

  const image = decodeURIComponent(renderIssue({
    key: "SAMPLE-1234",
    summary: "Example ticket",
    description: "Example description",
    status: "In Progress",
    statusCategory: "indeterminate",
    originalEstimateSeconds: null,
    timeSpentSeconds: null,
  }));
  assert.match(image, /font-size="18"[^>]*>SAMPLE-1234<\/text>/);
});

test("text fitting never drops below the global minimum", () => {
  const layout = fitTextBlock("A very long value ".repeat(100), 124, 105, 28, 4);
  assert.equal(layout.size, MINIMUM_FONT_SIZE);
  assert.equal(layout.truncated, true);
  assert.ok(layout.lines.at(-1)?.endsWith("…"));
});

test("folder detail view uses the requested five-key field order", () => {
  const issue: JiraIssue = {
    key: "SAMPLE-1234",
    summary: "A full issue title",
    description: "A longer issue description that may be cut off on the key",
    status: "In Progress",
    statusCategory: "indeterminate",
    originalEstimateSeconds: 28800,
    timeSpentSeconds: 3600,
  };
  const decoded = Array.from({ length: 5 }, (_, slot) => decodeURIComponent(renderDetail(issue, slot)));
  const visibleText = decoded.map((image) =>
    [...image.matchAll(/<text[^>]*>(.*?)<\/text>/g)].map((match) => match[1]).join(" "),
  );
  assert.ok(visibleText[0].includes("SAMPLE-1234") && visibleText[0].includes("A full issue title"));
  assert.ok(visibleText[1].includes("STATUS") && visibleText[1].includes("In Progress"));
  assert.ok(visibleText[2].includes("TIME") && visibleText[2].includes("Logged 1h"));
  assert.ok(visibleText[2].includes("Estimate 8h"));
  assert.ok(visibleText[3].includes("ACTION") && visibleText[3].includes("START"));
  assert.equal(visibleText[4], "");
});
