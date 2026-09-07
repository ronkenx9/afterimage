const endpoint = process.env.BINANCE_MCP_ENDPOINT ?? "https://agent.binance.com/mcp/agentic";

console.log("AFTERIMAGE Binance qualification");
console.log(`Endpoint: ${endpoint}`);
console.log("Mode: read-only manifest check");
console.log("Status: authentication required in a supported MCP client");
console.log("Next: connect the server through Codex Desktop or another documented client, authenticate, and record the redacted tools/list response in docs/binance-tools.json.");
console.log("No tool names are guessed and no trading request is sent.");
