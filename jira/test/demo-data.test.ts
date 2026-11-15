import assert from "node:assert/strict";
import test from "node:test";
import { getDemoIssues } from "../src/demo-data.js";

test("demo mode fills a six-key Stream Deck with useful issue data", () => {
  const issues = getDemoIssues();
  assert.equal(issues.length, 6);
  assert.ok(issues.every((issue) => issue.key && issue.summary && issue.status));
  assert.ok(issues.some((issue) => issue.originalEstimateSeconds !== null));
  assert.ok(issues.some((issue) => issue.timeSpentSeconds !== null));
});

test("demo issues are returned as fresh objects", () => {
  assert.notEqual(getDemoIssues()[0], getDemoIssues()[0]);
});
