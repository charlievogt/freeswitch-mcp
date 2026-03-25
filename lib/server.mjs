import { z } from "zod";
import Fuse from "fuse.js";
import { docs } from "./docs.mjs";

const TOPICS = [
  "ESL", "SIP", "Dialplan", "Verto", "Directory", "Kamailio",
  "Media", "Troubleshooting", "Twilio", "Variables", "Modules",
  "Configuration", "Scripting", "Conference", "CallCenter",
  "Security", "Performance",
];

// Pre-build fuzzy search index
const fuse = new Fuse(docs, {
  keys: [
    { name: "title", weight: 3 },
    { name: "keywords", weight: 2 },
    { name: "summary", weight: 1.5 },
    { name: "content", weight: 1 },
  ],
  threshold: 0.4,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
});

export function registerTools(server) {
  // ── Tool: Search (returns summaries + IDs, not full content) ──
  server.tool(
    "search_freeswitch_docs",
    "Search FreeSWITCH, Kamailio, Verto, and SIP documentation. Returns titles, summaries, and IDs. Use get_freeswitch_doc with an ID to read the full content.",
    {
      query: z.string().describe("Search query — e.g. 'originate', 'uuid_audio_fork', '32 second drop', 'kamailio record route', 'NAT traversal', 'mod_conference'"),
      limit: z.number().optional().describe("Max results to return (default 5, max 15)"),
    },
    async ({ query, limit }) => {
      const max = Math.min(limit || 5, 15);
      const results = fuse.search(query, { limit: max });

      if (results.length === 0) {
        return {
          content: [{
            type: "text",
            text: `No documentation found for "${query}".\n\nAvailable topics: ${TOPICS.join(", ")}.\n\nTry broader terms or use list_freeswitch_docs to browse.`,
          }],
        };
      }

      const lines = results.map((r, i) => {
        const d = r.item;
        return `${i + 1}. **${d.title}** [${d.topic}]\n   ID: \`${d.id}\`\n   ${d.summary}`;
      });

      return {
        content: [{
          type: "text",
          text: `## Search results for "${query}"\n\n${lines.join("\n\n")}\n\n---\n_Use get_freeswitch_doc with an ID above to read the full documentation._`,
        }],
      };
    }
  );

  // ── Tool: Get full doc by ID ──
  server.tool(
    "get_freeswitch_doc",
    "Retrieve the full documentation content for a specific document by its ID. Use search_freeswitch_docs or list_freeswitch_docs first to find document IDs.",
    {
      id: z.string().describe("Document ID (e.g. 'esl-overview', 'sip-nat', 'mod-conference')"),
    },
    async ({ id }) => {
      const doc = docs.find((d) => d.id === id);
      if (!doc) {
        // Try fuzzy match on ID
        const close = docs
          .filter((d) => d.id.includes(id) || id.includes(d.id))
          .slice(0, 5);
        if (close.length > 0) {
          const suggestions = close.map((d) => `  - ${d.id} (${d.title})`).join("\n");
          return {
            content: [{
              type: "text",
              text: `No doc with ID "${id}". Did you mean:\n${suggestions}`,
            }],
          };
        }
        return {
          content: [{
            type: "text",
            text: `No doc with ID "${id}". Use search_freeswitch_docs or list_freeswitch_docs to find valid IDs.`,
          }],
        };
      }
      return { content: [{ type: "text", text: doc.content }] };
    }
  );

  // ── Tool: Browse by topic (titles + IDs only) ──
  server.tool(
    "get_freeswitch_topic",
    "List all documentation entries for a specific topic area. Returns titles and IDs — use get_freeswitch_doc to read full content.",
    {
      topic: z
        .enum(TOPICS)
        .describe("The documentation topic to browse"),
    },
    async ({ topic }) => {
      const topicDocs = docs.filter((d) => d.topic === topic);
      if (topicDocs.length === 0) {
        return { content: [{ type: "text", text: `No docs found for topic: ${topic}` }] };
      }
      const lines = topicDocs.map(
        (d) => `- **${d.title}** (id: \`${d.id}\`)\n  ${d.summary}`
      );
      return {
        content: [{
          type: "text",
          text: `## ${topic} Documentation\n\n${lines.join("\n\n")}\n\n---\n_Use get_freeswitch_doc with an ID to read the full content._`,
        }],
      };
    }
  );

  // ── Tool: List all docs ──
  server.tool(
    "list_freeswitch_docs",
    "List all available FreeSWITCH documentation grouped by topic. Returns titles and IDs for browsing.",
    {},
    async () => {
      const grouped = {};
      for (const d of docs) {
        if (!grouped[d.topic]) grouped[d.topic] = [];
        grouped[d.topic].push(d);
      }

      const sections = Object.entries(grouped).map(([topic, entries]) => {
        const items = entries.map((d) => `  - ${d.title} (\`${d.id}\`)`).join("\n");
        return `### ${topic}\n${items}`;
      });

      return {
        content: [{
          type: "text",
          text: `# FreeSWITCH Documentation Library\n\n${docs.length} documents across ${Object.keys(grouped).length} topics.\n\n${sections.join("\n\n")}\n\n---\n_Use search_freeswitch_docs to search, get_freeswitch_topic to browse a topic, or get_freeswitch_doc to read a specific document._`,
        }],
      };
    }
  );

  // ── Resources: each doc as a browsable MCP resource ──
  for (const doc of docs) {
    server.resource(
      doc.id,
      `freeswitch://docs/${doc.id}`,
      { description: `[${doc.topic}] ${doc.title}`, mimeType: "text/markdown" },
      async (uri) => ({
        contents: [{
          uri: uri.href,
          text: doc.content,
          mimeType: "text/markdown",
        }],
      })
    );
  }

  // ── Prompts: reusable workflow templates ──
  server.prompt(
    "troubleshoot-call",
    "Diagnose and fix a FreeSWITCH call issue",
    {
      issue: z.string().describe("Describe the call issue — e.g. 'calls drop after 32 seconds', 'no audio on bridged calls', 'USER_NOT_REGISTERED'"),
    },
    async ({ issue }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `I'm experiencing a FreeSWITCH issue: ${issue}

Please help me diagnose and fix this. Steps:
1. Search the FreeSWITCH docs for relevant troubleshooting information
2. Identify the most likely root cause
3. Provide specific configuration changes or commands to fix it
4. Suggest how to verify the fix works`,
        },
      }],
    })
  );

  server.prompt(
    "setup-sip-trunk",
    "Configure a SIP trunk with an ITSP or carrier",
    {
      provider: z.string().describe("SIP provider name — e.g. 'Twilio', 'Telnyx', 'generic ITSP'"),
    },
    async ({ provider }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Help me configure a SIP trunk with ${provider} on FreeSWITCH.

Please search the docs for relevant SIP profile, gateway, and dialplan configuration. Provide:
1. Gateway XML configuration for the provider
2. Dialplan rules for inbound DID routing
3. Outbound routing through the trunk
4. ACL and security settings
5. NAT considerations if applicable
6. Codec and DTMF settings`,
        },
      }],
    })
  );

  server.prompt(
    "build-ivr",
    "Design an IVR (Interactive Voice Response) system",
    {
      description: z.string().describe("Describe the IVR flow — e.g. 'main menu with 3 options: sales, support, billing'"),
    },
    async ({ description }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Help me build an IVR in FreeSWITCH: ${description}

Search the docs for dialplan applications, DTMF handling, and Lua scripting. Provide:
1. Dialplan XML for the IVR flow
2. Audio prompts needed (with playback/say applications)
3. DTMF collection and routing logic
4. Timeout and invalid-input handling
5. Optional: Lua script if the logic is complex enough to warrant it`,
        },
      }],
    })
  );

  server.prompt(
    "configure-webrtc",
    "Set up WebRTC calling with mod_verto",
    {
      useCase: z.string().describe("What you're building — e.g. 'browser softphone', 'click-to-call widget', 'video conferencing'"),
    },
    async ({ useCase }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Help me set up WebRTC with FreeSWITCH mod_verto for: ${useCase}

Search the docs for Verto configuration, TLS setup, and client integration. Provide:
1. verto.conf.xml configuration
2. TLS/WSS certificate setup
3. Client-side JavaScript integration
4. Directory user configuration for Verto
5. Codec and media settings for WebRTC
6. NAT/firewall considerations`,
        },
      }],
    })
  );

  server.prompt(
    "esl-application",
    "Build an ESL (Event Socket) application",
    {
      language: z.string().describe("Programming language — 'node', 'python', 'lua', or 'go'"),
      purpose: z.string().describe("What the application does — e.g. 'call routing engine', 'IVR with database lookup', 'real-time call monitoring'"),
    },
    async ({ language, purpose }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Help me build an ESL application in ${language} for: ${purpose}

Search the docs for ESL protocol details, event handling, and API commands. Provide:
1. Connection setup (inbound ESL)
2. Event subscription and handling
3. Key API/bgapi commands needed
4. Error handling and reconnection logic
5. Code structure and patterns for ${language}`,
        },
      }],
    })
  );
}
