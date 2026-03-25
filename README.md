# FreeSWITCH Docs MCP Server

A Model Context Protocol server that provides FreeSWITCH, Kamailio, Verto, and SIP documentation to AI coding assistants.

## Deploy to Vercel

1. Push this repo to GitHub
2. Import in Vercel (vercel.com/new)
3. Deploy — no environment variables needed

The MCP endpoint will be at: `https://your-app.vercel.app/api/mcp`

## Connect to Claude.ai

1. Go to Claude.ai → Settings → Integrations
2. Add custom MCP server
3. Enter URL: `https://your-app.vercel.app/api/mcp`

## Connect to Claude Code

Add to `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "freeswitch-docs": {
      "type": "url",
      "url": "https://your-app.vercel.app/api/mcp"
    }
  }
}
```

Or for local development (stdio mode), use the original `index.mjs` with StdioTransport.

## Topics Covered

- **ESL** — Event Socket Layer commands, api/bgapi, sendmsg, events
- **SIP Profiles** — external/internal, NAT traversal, ext-rtp-ip, ext-sip-ip, Contact headers
- **Dialplan** — XML dialplan, contexts, applications (park, bridge, eavesdrop, record, read)
- **mod_verto** — WebRTC, JSON-RPC protocol, force-register-domain, CONN_REG
- **User Directory** — dial-string, sofia_contact, verto_contact, domain matching
- **Kamailio** — Record-Route, topology hiding, User-Agent spoofing, NAT handling
- **Media Handling** — RTP, codecs, WAV format, recording, MOH, uuid_audio_fork
- **Twilio Integration** — Elastic SIP Trunking, ACLs, gateways, common issues
- **Troubleshooting** — 32-second drops, no audio, USER_NOT_REGISTERED, debugging
- **Channel Variables** — caller ID, bridge control, media, recording, SIP headers

## Adding Documentation

Edit `lib/docs.mjs` to add new documentation entries. Each entry has:
- `id`: Unique identifier
- `topic`: Category for topic-based retrieval
- `title`: Human-readable title
- `keywords`: Array of search keywords
- `content`: The full documentation content (Markdown)
