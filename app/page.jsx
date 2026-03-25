export default function Home() {
  return (
    <div style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1>FreeSWITCH Docs MCP Server</h1>
      <p>This is a Model Context Protocol server providing FreeSWITCH, Kamailio, Verto, and SIP documentation.</p>
      <h2>Connect</h2>
      <p>Add this MCP server in Claude.ai or Claude Code:</p>
      <code style={{ display: "block", background: "#f3f4f6", padding: "1rem", borderRadius: "8px", marginTop: "0.5rem" }}>
        {typeof window !== "undefined" ? `${window.location.origin}/api/mcp` : "/api/mcp"}
      </code>
      <h2>Available Tools</h2>
      <ul>
        <li><strong>search_freeswitch_docs</strong> — Keyword search across all documentation</li>
        <li><strong>get_freeswitch_topic</strong> — Get docs by topic (ESL, SIP, Dialplan, Verto, etc.)</li>
        <li><strong>list_freeswitch_docs</strong> — List all available topics</li>
      </ul>
      <h2>Topics Covered</h2>
      <ul>
        <li>ESL (Event Socket Layer) — commands, api, bgapi, sendmsg</li>
        <li>SIP Profiles — external/internal, NAT, ext-rtp-ip, ext-sip-ip</li>
        <li>Dialplan — contexts, applications, park, bridge, eavesdrop</li>
        <li>mod_verto — WebRTC, JSON-RPC protocol, force-register-domain</li>
        <li>User Directory — dial-string, sofia_contact, verto_contact</li>
        <li>Kamailio — Record-Route, topology hiding, UA spoofing</li>
        <li>Media Handling — RTP, codecs, WAV format, recording, MOH</li>
        <li>Twilio Integration — SIP trunking, ACLs, common issues</li>
        <li>Troubleshooting — 32s drops, no audio, USER_NOT_REGISTERED</li>
        <li>Channel Variables — caller ID, bridge control, media, SIP headers</li>
      </ul>
    </div>
  );
}
