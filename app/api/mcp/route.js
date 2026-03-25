import { createMcpHandler } from "mcp-handler/next";
import { registerTools } from "../../../lib/server.mjs";

const handler = createMcpHandler(registerTools);

export { handler as GET, handler as POST, handler as DELETE };
