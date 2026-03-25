import { z } from "zod";
import { docs } from "./docs.mjs";

export function registerTools(server) {
  // Tool: Search documentation by keyword/topic
  server.tool(
    "search_freeswitch_docs",
    "Search FreeSWITCH, Kamailio, Verto, and SIP documentation. Use this when working with telephony code, ESL commands, SIP profiles, dialplan, WebRTC/Verto, media handling, or troubleshooting call issues.",
    {
      query: z.string().describe("Search query — e.g. 'originate verto', 'uuid_audio_fork', '32 second drop', 'kamailio record route', 'dialplan eavesdrop', 'WAV format'"),
    },
    async ({ query }) => {
      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(/\s+/);

      const scored = docs.map((doc) => {
        let score = 0;
        const searchable = `${doc.title} ${doc.keywords.join(" ")} ${doc.content}`.toLowerCase();

        for (const word of queryWords) {
          if (doc.title.toLowerCase().includes(word)) score += 10;
          if (doc.keywords.some((k) => k.includes(word))) score += 8;
          if (searchable.includes(word)) score += 3;
          if (searchable.includes(queryLower)) score += 15;
        }

        return { doc, score };
      });

      const results = scored
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      if (results.length === 0) {
        return {
          content: [{
            type: "text",
            text: `No documentation found for "${query}". Available topics: ESL commands, SIP profiles, dialplan, mod_verto, Kamailio proxy, user directory, media handling, Twilio integration, channel variables, troubleshooting.`,
          }],
        };
      }

      const text = results.map((r) => r.doc.content).join("\n\n---\n\n");
      return { content: [{ type: "text", text }] };
    }
  );

  // Tool: Get specific doc by topic
  server.tool(
    "get_freeswitch_topic",
    "Get documentation for a specific FreeSWITCH topic area.",
    {
      topic: z
        .enum(["ESL", "SIP", "Dialplan", "Verto", "Directory", "Kamailio", "Media", "Troubleshooting", "Twilio", "Variables"])
        .describe("The documentation topic to retrieve"),
    },
    async ({ topic }) => {
      const topicDocs = docs.filter((d) => d.topic === topic);
      if (topicDocs.length === 0) {
        return { content: [{ type: "text", text: `No docs found for topic: ${topic}` }] };
      }
      const text = topicDocs.map((d) => d.content).join("\n\n---\n\n");
      return { content: [{ type: "text", text }] };
    }
  );

  // Tool: List all available documentation
  server.tool(
    "list_freeswitch_docs",
    "List all available FreeSWITCH documentation topics and titles.",
    {},
    async () => {
      const list = docs
        .map((d) => `- [${d.topic}] ${d.title} (keywords: ${d.keywords.slice(0, 5).join(", ")})`)
        .join("\n");
      return {
        content: [{
          type: "text",
          text: `# Available FreeSWITCH Documentation\n\n${list}\n\nUse search_freeswitch_docs to search by keyword, or get_freeswitch_topic to get all docs for a topic area.`,
        }],
      };
    }
  );

}
