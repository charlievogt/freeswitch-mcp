#!/usr/bin/env node

/**
 * FreeSWITCH Docs MCP Server — stdio mode for Claude Code.
 *
 * Usage: node index.mjs
 *
 * Add to ~/.claude/mcp.json:
 * {
 *   "mcpServers": {
 *     "freeswitch-docs": {
 *       "command": "node",
 *       "args": ["c:/dev/freeswitch-mcp/index.mjs"]
 *     }
 *   }
 * }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./lib/server.mjs";

const server = new McpServer({
  name: "freeswitch-docs",
  version: "1.0.0",
});

registerTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
