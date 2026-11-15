export type JiraSettings = {
  demoMode?: boolean;
  baseUrl?: string;
  email?: string;
  apiToken?: string;
  jql?: string;
  refreshSeconds?: number;
};

export type JiraIssue = {
  key: string;
  summary: string;
  description: string;
  status: string;
  statusCategory: string;
  originalEstimateSeconds: number | null;
  timeSpentSeconds: number | null;
};

export const DEFAULT_JQL =
  'assignee = currentUser() AND status NOT IN ("Done", "Ready for Review", "Blocked") ORDER BY updated DESC';

export const DEFAULT_REFRESH_SECONDS = 60;
