# Binance Agent OS integration qualification

Observed: 2026-09-07 from Codex Desktop on macOS.

## Verified from official sources

- Hosted endpoint: `https://agent.binance.com/mcp/agentic`.
- Public market reads do not require account permission.
- Account and Trade are separate scopes selected by the user.
- Every trade, cancellation, or internal transfer requires user confirmation.
- Trading occurs inside a dedicated Agentic sub-account. The owner funds it manually.
- External withdrawals are not available through this MCP integration.
- Authentication is performed by connecting from a supported MCP client. The endpoint is not opened as a normal web page.

Source: [Binance MCP Server documentation](https://developers.binance.com/en/docs/agent-native/mcp-server/agentic), last modified 2026-09-07.

## Runtime result

The current Codex task does not expose an authenticated Binance MCP server. A successful initialize and paginated `tools/list` could not be recorded. Exact tool names, schemas, account identifiers, order types, lookup, fills, cancellation, client-order IDs, OAuth callback registration, and test environment support remain unqualified.

Chosen deployment mode: local agent companion. The web app performs research and creates immutable paper intents. A supported host can later connect AFTERIMAGE and Binance MCP, show the exact intent, preserve provider confirmation, and return order evidence for reconciliation.

## Fail-closed behavior

- Live account controls are absent.
- The executable adapter is paper-only.
- No MCP tool name is guessed in application code.
- `pnpm qualify:binance` performs no write and explains the remaining authenticated step.
- Public Binance Spot REST data is clearly identified as a market-data source, not as proof of Agent OS MCP integration.
