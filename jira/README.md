# Jira Tickets for Stream Deck

A Stream Deck Mini plugin that displays recently updated Jira Cloud issues assigned to you. It starts in demo mode, so you can try the complete layout without providing Jira credentials.

## Features

- Displays issue key, summary, and workflow status on dynamic keys.
- Shows status and time-tracking details when a ticket is selected.
- Types a workspace command into the focused application and transitions the issue to **In Progress** when **Start** is pressed.
- Uses editable JQL, with a default that excludes **Done**, **Ready for Review**, and **Blocked**.
- Refreshes immediately when the Jira folder becomes visible, then at the configured interval; polling stops when you leave the folder.
- Supports macOS 12+ and Windows 10+ with Stream Deck 7.1+.

## Stream Deck layout

The plugin is designed for a Stream Deck Mini folder. Stream Deck reserves one key for **Back**, leaving five positions for Jira Ticket actions.

1. Create and open a folder in Stream Deck.
2. Drag **Jira Ticket** onto each of the five available keys.
3. Demo tickets appear immediately.

Select a ticket to show its detail view. The **Start** key is actionable; the remaining detail keys present ticket information.

## Install from source

Install Node.js 20 or later, then run:

```sh
git clone https://github.com/samirg1/streamdeck-plugins.git
cd streamdeck-plugins/jira
npm ci
npm run build
npx streamdeck link com.samir.jira-tickets.sdPlugin
npx streamdeck restart com.samir.jira-tickets
```

If another copy with the same plugin UUID is installed, uninstall it from the Stream Deck application before linking the development copy.

To create an installable package instead:

```sh
npm run create
```

Open the generated `com.samir.jira-tickets.streamDeckPlugin` file to install it.

## Jira configuration

Select any Jira Ticket action in the Stream Deck application, turn off **Use demo tickets**, and enter:

- Your Jira Cloud site, such as `https://your-company.atlassian.net`.
- Your Atlassian account email.
- An [Atlassian API token](https://id.atlassian.com/manage-profile/security/api-tokens).
- Optional custom JQL and refresh interval.

The minimum refresh interval is 15 seconds and the default is 60 seconds. Configuration is global to the plugin, so it only needs to be entered once.

On macOS, Stream Deck may need permission under **System Settings → Privacy & Security → Accessibility** before the Start action can type into another application.

## Credential and network security

- The plugin communicates directly with the configured Jira Cloud site; it has no intermediary service or analytics.
- Jira credentials are accepted only for HTTPS addresses ending in `.atlassian.net`.
- The API token is stored in Stream Deck's global plugin settings. Treat the local Stream Deck configuration as sensitive; it is not an operating-system keychain.
- The token is used only for Jira Cloud REST API authentication and is never written to this repository.

If a token is exposed, revoke it immediately in your Atlassian account and create a replacement.

## Development

```sh
npm ci
npm run validate
npm run plugin:validate
```

Useful commands:

| Command | Purpose |
| --- | --- |
| `npm run build` | Type-check and bundle the plugin. |
| `npm test` | Run unit and simulated Stream Deck runtime tests. |
| `npm run watch` | Rebuild the bundle as source files change. |
| `npm run create` | Validate, test, and create an installable plugin package. |

## License

[MIT](../LICENSE)
