import path from "node:path";
import streamDeck from "@elgato/streamdeck";
import { JiraTicketsAction } from "./actions/jira-tickets.js";

// The SDK resolves manifest.json and its log directory from process.cwd().
// Anchor it to the installed .sdPlugin folder instead of relying on the host's
// launch directory. The bundle is installed at <plugin>/bin/index.js.
process.chdir(path.resolve(__dirname, ".."));

streamDeck.logger.setLevel("info");
streamDeck.actions.registerAction(new JiraTicketsAction());
void streamDeck.connect().catch((error: unknown) => {
  // Stream Deck captures stderr in the plugin log. Keeping this handler here
  // makes connection failures visible instead of allowing a silent exit.
  console.error(error);
  process.exitCode = 1;
});
