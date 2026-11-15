import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function workspaceTextForIssue(issueKey: string, issueSummary: string): string {
  const match = issueKey.match(/(?:^|\D)(\d{4})(?!\d)/);
    if (!match) throw new Error(`Ticket ${issueKey} does not contain a four-digit number`);

    let extra = ''
    if (issueSummary.startsWith("Backend")) extra = ' backend only'
    else if (issueSummary.startsWith("App")) extra = ' app only'
    else if (issueSummary.startsWith("Web")) extra = ' web only'
    else if (issueSummary.startsWith("Fullstack")) extra = ' app and backend'

    const withPrompt = extra ? ', prompt: ""' : '';
  return `new workspace for ticket ${match[1]},${extra} ${withPrompt}`;
}

export async function typeWorkspaceText(issueKey: string, issueSummary: string): Promise<string> {
  const value = workspaceTextForIssue(issueKey, issueSummary);
  if (process.platform === "darwin") {
    await execFileAsync("/usr/bin/osascript", [
      "-e",
      `tell application "System Events" to keystroke ${JSON.stringify(value)}`,
    ]);
  } else if (process.platform === "win32") {
    const escaped = value.replace(/'/g, "''");
    await execFileAsync("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escaped}')`,
    ]);
  } else {
    throw new Error("Typing is only supported on macOS and Windows");
  }
  return value;
}
