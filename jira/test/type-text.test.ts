import assert from "node:assert/strict";
import test from "node:test";
import { workspaceTextForIssue } from "../src/type-text.js";

test("workspace command uses the four-digit ticket number", () => {
  assert.equal(
    workspaceTextForIssue("DEMO-3569", "Backend issue"),
    "new workspace for ticket 3569, backend only , prompt: \"\"",
  );
  assert.throws(() => workspaceTextForIssue("DEMO-123", "Backend issue"), /four-digit number/);
});

test("workspace command uses the correct extra text for different issue summaries", () => {
  assert.equal(
    workspaceTextForIssue("DEMO-3569", "App issue"),
    "new workspace for ticket 3569, app only , prompt: \"\"",
  );
  assert.equal(
    workspaceTextForIssue("DEMO-3569", "Web issue"),
    "new workspace for ticket 3569, web only , prompt: \"\"",
  );
  assert.equal(
    workspaceTextForIssue("DEMO-3569", "Fullstack issue"),
    "new workspace for ticket 3569, app and backend , prompt: \"\"",
  );
});
