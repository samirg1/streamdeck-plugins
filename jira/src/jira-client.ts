import { DEFAULT_JQL, type JiraIssue, type JiraSettings } from "./types.js";

type JiraSearchResponse = {
  issues?: Array<{
    key?: string;
    fields?: {
      summary?: string;
      description?: unknown;
      status?: {
        name?: string;
        statusCategory?: { key?: string };
      };
      timetracking?: { originalEstimateSeconds?: number; timeSpentSeconds?: number };
      timeoriginalestimate?: number;
      timespent?: number;
    };
  }>;
};

type JiraTransitionsResponse = {
  transitions?: Array<{
    id?: string;
    name?: string;
    to?: { name?: string };
  }>;
};

export class JiraConfigurationError extends Error {}

export async function fetchJiraIssues(
  settings: JiraSettings,
  signal?: AbortSignal,
): Promise<JiraIssue[]> {
  const baseUrl = normalizeBaseUrl(settings.baseUrl);
  if (!baseUrl || !settings.email?.trim() || !settings.apiToken?.trim()) {
    throw new JiraConfigurationError("Configure Jira URL, email and API token");
  }

  const response = await fetch(`${baseUrl}/rest/api/3/search/jql`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${settings.email.trim()}:${settings.apiToken.trim()}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jql: settings.jql?.trim() || DEFAULT_JQL,
      maxResults: 6,
      fields: ["summary", "description", "status", "timetracking", "timeoriginalestimate", "timespent"],
    }),
    signal,
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Jira returned ${response.status}${detail ? `: ${detail}` : ""}`);
  }

  const data = (await response.json()) as JiraSearchResponse;
  return (data.issues ?? []).flatMap((issue) => {
    if (!issue.key || !issue.fields) return [];
    const fields = issue.fields;
    return [{
      key: issue.key,
      summary: fields.summary ?? "Untitled issue",
      description: jiraDescriptionToText(fields.description),
      status: fields.status?.name ?? "Unknown",
      statusCategory: fields.status?.statusCategory?.key ?? "unknown",
      originalEstimateSeconds:
        fields.timetracking?.originalEstimateSeconds ?? fields.timeoriginalestimate ?? null,
      timeSpentSeconds: fields.timetracking?.timeSpentSeconds ?? fields.timespent ?? null,
    }];
  });
}

export async function transitionIssueToInProgress(
  settings: JiraSettings,
  issueKey: string,
  signal?: AbortSignal,
): Promise<void> {
  const { baseUrl, headers } = jiraRequestConfiguration(settings);
  const url = `${baseUrl}/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`;
  const available = await fetch(url, { headers, signal });
  if (!available.ok) {
    const detail = (await available.text()).slice(0, 300);
    throw new Error(`Jira returned ${available.status}${detail ? `: ${detail}` : ""}`);
  }

  const data = (await available.json()) as JiraTransitionsResponse;
  const transition = data.transitions?.find((candidate) =>
    [candidate.to?.name, candidate.name]
      .some((name) => name?.trim().toLowerCase() === "in progress"),
  );
  if (!transition?.id) {
    throw new Error(`No available transition to In Progress for ${issueKey}`);
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ transition: { id: transition.id } }),
    signal,
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Jira returned ${response.status}${detail ? `: ${detail}` : ""}`);
  }
}

function jiraRequestConfiguration(settings: JiraSettings): {
  baseUrl: string;
  headers: Record<string, string>;
} {
  const baseUrl = normalizeBaseUrl(settings.baseUrl);
  if (!baseUrl || !settings.email?.trim() || !settings.apiToken?.trim()) {
    throw new JiraConfigurationError("Configure Jira URL, email and API token");
  }
  return {
    baseUrl,
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${settings.email.trim()}:${settings.apiToken.trim()}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
  };
}

export function jiraDescriptionToText(value: unknown): string {
  if (typeof value === "string") return normalizeDescription(value);
  if (!value || typeof value !== "object") return "No description";

  const visit = (node: unknown): string => {
    if (!node || typeof node !== "object") return "";
    const record = node as { type?: unknown; text?: unknown; content?: unknown };
    if (typeof record.text === "string") return record.text;
    if (!Array.isArray(record.content)) return "";
    const separator = ["paragraph", "heading", "listItem", "blockquote"].includes(String(record.type))
      ? "\n"
      : "";
    return record.content.map(visit).join("") + separator;
  };

  return normalizeDescription(visit(value)) || "No description";
}

function normalizeDescription(value: string): string {
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n+ */g, "\n")
    .trim();
}

export function normalizeBaseUrl(value?: string): string {
  if (!value?.trim()) return "";
  const candidate = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new JiraConfigurationError("Enter a valid Jira Cloud URL");
  }

  if (url.protocol !== "https:") {
    throw new JiraConfigurationError("Jira URL must use HTTPS");
  }
  if (url.username || url.password) {
    throw new JiraConfigurationError("Jira URL must not contain credentials");
  }
  if (!url.hostname.toLowerCase().endsWith(".atlassian.net")) {
    throw new JiraConfigurationError("Jira URL must be an atlassian.net Jira Cloud site");
  }

  return url.origin;
}
