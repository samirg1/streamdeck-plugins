import assert from "node:assert/strict";
import test from "node:test";
import {
  jiraDescriptionToText,
  normalizeBaseUrl,
  transitionIssueToInProgress,
} from "../src/jira-client.js";

test("normalizeBaseUrl adds HTTPS and removes trailing slashes", () => {
  assert.equal(normalizeBaseUrl("team.atlassian.net/"), "https://team.atlassian.net");
  assert.equal(normalizeBaseUrl("https://team.atlassian.net///"), "https://team.atlassian.net");
  assert.equal(
    normalizeBaseUrl("https://team.atlassian.net/browse/DEMO-1?ignored=true"),
    "https://team.atlassian.net",
  );
});

test("normalizeBaseUrl protects Jira credentials from unsafe destinations", () => {
  assert.throws(() => normalizeBaseUrl("http://team.atlassian.net"), /HTTPS/);
  assert.throws(() => normalizeBaseUrl("https://example.com"), /atlassian\.net/);
  assert.throws(() => normalizeBaseUrl("https://team.atlassian.net.example.com"), /atlassian\.net/);
  assert.throws(() => normalizeBaseUrl("https://user:password@team.atlassian.net"), /credentials/);
});

test("jiraDescriptionToText flattens Atlassian document descriptions", () => {
  assert.equal(jiraDescriptionToText({
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "First paragraph." }] },
      { type: "paragraph", content: [{ type: "text", text: "Second paragraph." }] },
    ],
  }), "First paragraph.\nSecond paragraph.");
  assert.equal(jiraDescriptionToText(null), "No description");
});

test("transitionIssueToInProgress selects and submits Jira's In Progress transition", async (context) => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ input: String(input), init });
    if (!init?.method) {
      return new Response(JSON.stringify({
        transitions: [
          { id: "10", name: "Start Progress", to: { name: "In Progress" } },
        ],
      }), { status: 200 });
    }
    return new Response(null, { status: 204 });
  };
  context.after(() => { globalThis.fetch = originalFetch; });

  await transitionIssueToInProgress({
    baseUrl: "team.atlassian.net",
    email: "person@example.com",
    apiToken: "secret",
  }, "DEMO-1234");

  assert.equal(calls.length, 2);
  assert.equal(calls[0].input, "https://team.atlassian.net/rest/api/3/issue/DEMO-1234/transitions");
  assert.equal(calls[1].init?.method, "POST");
  assert.equal(calls[1].init?.body, JSON.stringify({ transition: { id: "10" } }));
});
