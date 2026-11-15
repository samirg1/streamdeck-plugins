# Stream Deck Plugins

[![CI](https://github.com/samirg1/streamdeck-plugins/actions/workflows/ci.yml/badge.svg)](https://github.com/samirg1/streamdeck-plugins/actions/workflows/ci.yml)

Open-source plugins for Elgato Stream Deck.

## Plugins

| Plugin | Description | Status |
| --- | --- | --- |
| [Jira Tickets](jira/) | Shows assigned Jira Cloud tickets on a Stream Deck Mini and provides a shortcut for starting work. | Active |

## Repository layout

Each plugin lives in its own directory with an independent package, tests, and build output. Shared repository scripts are kept in [`scripts/`](scripts/).

## Development

The plugins require Node.js 20 or later. To validate the Jira plugin:

```sh
cd jira
npm ci
npm run validate
npm run plugin:validate
```

See the plugin's README for installation, configuration, and packaging instructions.

## Security

Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md). Never include Jira API tokens or other credentials in a public issue.

## License

This repository is available under the [MIT License](LICENSE).

Elgato, Stream Deck, Jira, Atlassian, and related marks belong to their respective owners. This project is not affiliated with or endorsed by Elgato or Atlassian.
