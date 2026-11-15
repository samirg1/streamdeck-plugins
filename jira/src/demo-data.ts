import type { JiraIssue } from "./types.js";

export const DEMO_ISSUES: readonly JiraIssue[] = [
  {
    key: "DEMO-3569",
    summary: "Backend: Update keyboard shortcuts to the customer dashboard",
    description: "Add shortcuts for search, navigation, and common ticket actions. Include a help overlay listing every available shortcut.",
    status: "In Progress",
    statusCategory: "indeterminate",
    originalEstimateSeconds: 28800,
    timeSpentSeconds: 12600,
  },
  {
    key: "DEMO-3102",
    summary: "Fullstack: Investigate intermittent login failures on mobile",
    description: "Customers occasionally return to the login screen after completing MFA. Capture diagnostics and identify the failing authentication path.",
    status: "To Be Scoped",
    statusCategory: "indeterminate",
    originalEstimateSeconds: 57600,
    timeSpentSeconds: 23400,
  },
  {
    key: "DEMO-3103",
    summary: "App: Update onboarding copy for new team workspaces",
    description: "Rewrite the empty states and first-run checklist to better explain workspace roles and invitations.",
    status: "Groomed",
    statusCategory: "new",
    originalEstimateSeconds: 14400,
    timeSpentSeconds: null,
  },
  {
    key: "DEMO-3104",
    summary: "Web: Waiting for design approval on billing settings",
    description: "Implement the approved billing settings layout once the final design and responsive behaviour are confirmed.",
    status: "Groomed",
    statusCategory: "indeterminate",
    originalEstimateSeconds: 28800,
    timeSpentSeconds: 7200,
  },
  {
    key: "DEMO-3105",
    summary: "Backend: Improve performance of the activity history page",
    description: "Reduce initial load time for accounts with large histories by paginating results and removing duplicate API requests.",
    status: "Groomed",
    statusCategory: "indeterminate",
    originalEstimateSeconds: 86400,
    timeSpentSeconds: 30600,
  },
  {
    key: "DEMO-3106",
    summary: "App: Document the release and rollback procedure",
    description: "Create a concise runbook covering release checks, deployment steps, verification, rollback, and incident communication.",
    status: "In Progress",
    statusCategory: "new",
    originalEstimateSeconds: null,
    timeSpentSeconds: 3600,
  },
];

export function getDemoIssues(): JiraIssue[] {
  return DEMO_ISSUES.map((issue) => ({ ...issue }));
}
