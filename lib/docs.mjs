// FreeSWITCH, Kamailio, and Verto documentation knowledge base
// Organized by topic for searchable retrieval

export const docs = [
  // ============================================================
  // ESL (Event Socket Layer)
  // ============================================================
  {
    id: "esl-overview",
    topic: "ESL",
    title: "Event Socket Layer Overview",
    keywords: ["esl", "event socket", "tcp", "connection", "inbound", "outbound"],
    content: `# FreeSWITCH Event Socket Layer (ESL)

ESL is a TCP-based protocol for controlling FreeSWITCH externally. Two modes:

## Inbound Mode (most common for applications)
Your application connects TO FreeSWITCH on port 8021 (default).
- Send commands, receive events
- Control any call on the system
- Used by contact center applications, IVRs, call routing engines

## Outbound Mode
FreeSWITCH connects TO your application when a call hits a dialplan socket action.
- One connection per call
- Application controls only that call

## Protocol Format
Text-based, header/body pairs separated by \\n\\n:
- Headers: "Key: Value\\n" lines
- Body length indicated by Content-Length header
- Auth: FS sends "Content-Type: auth/request", you reply "auth <password>\\n\\n"
- Commands: "api <cmd>\\n\\n" or "sendmsg <uuid>\\nheaders\\n\\n"
- Events: "event json EVENT1 EVENT2\\n\\n"

## Authentication
\`\`\`
auth ClueCon\\n\\n
\`\`\`
Default password is "ClueCon", configured in event_socket.conf.xml.

## Event Subscription
\`\`\`
event json CHANNEL_CREATE CHANNEL_ANSWER CHANNEL_HANGUP CHANNEL_PARK CHANNEL_BRIDGE DTMF\\n\\n
\`\`\`
Use JSON format (not plain) to avoid XML parsing overhead.

## Key Event Types
- CHANNEL_CREATE: New channel created
- CHANNEL_ANSWER: Channel answered
- CHANNEL_PARK: Channel parked (waiting for control)
- CHANNEL_BRIDGE: Two channels bridged together
- CHANNEL_UNBRIDGE: Bridge broken
- CHANNEL_HANGUP: Channel hanging up
- CHANNEL_HANGUP_COMPLETE: Hangup fully processed
- CHANNEL_EXECUTE_COMPLETE: Dialplan app finished executing
- DTMF: DTMF digit received
- BACKGROUND_JOB: Async command completed`
  },
  {
    id: "esl-api-commands",
    topic: "ESL",
    title: "ESL API Commands Reference",
    keywords: ["api", "bgapi", "originate", "bridge", "uuid_kill", "uuid_hold", "uuid_record", "uuid_broadcast", "uuid_audio", "uuid_setvar", "uuid_getvar", "uuid_audio_fork"],
    content: `# ESL API Commands

## Synchronous vs Asynchronous
- \`api <command>\` — Synchronous. Blocks until complete. Response in api/response.
- \`bgapi <command>\` — Asynchronous. Returns Job-UUID immediately. Result in BACKGROUND_JOB event.

Use bgapi for long-running operations (originate, conference) to avoid blocking.

## Call Control Commands

### originate
Create a new outbound call.
\`\`\`
originate <dial_string> <application> [app_arg]
originate {var1=val1,var2=val2}user/1001@default &bridge(target-uuid)
originate {origination_timeout=30}verto.rtc/user@domain &park
originate user/1001@default &echo
originate sofia/external/+15551234567@gateway &park
\`\`\`
Channel variables in {} are set on the originated channel.
Returns +OK <uuid> on success, -ERR <reason> on failure.

### uuid_bridge
Bridge two existing channels.
\`\`\`
uuid_bridge <uuid1> <uuid2>
\`\`\`
Both channels must exist and be in a state that allows bridging.

### uuid_kill
Terminate a channel.
\`\`\`
uuid_kill <uuid> [cause]
\`\`\`
Causes: NORMAL_CLEARING, CALL_REJECTED, NO_ANSWER, USER_BUSY, ORIGINATOR_CANCEL

### uuid_hold / uuid_hold off
\`\`\`
uuid_hold <uuid>           -- Put on hold (plays MOH to other party)
uuid_hold off <uuid>       -- Resume from hold
\`\`\`

### uuid_audio
Control audio on a channel.
\`\`\`
uuid_audio <uuid> start write mute    -- Mute outgoing audio (other party can't hear you)
uuid_audio <uuid> start read mute     -- Mute incoming audio (you can't hear other party)
uuid_audio <uuid> stop                -- Unmute / stop audio manipulation
\`\`\`

### uuid_broadcast
Play audio or execute app on a live channel (interrupts current audio).
\`\`\`
uuid_broadcast <uuid> <path> [aleg|bleg|both]
uuid_broadcast <uuid> playback::/path/to/file.wav aleg
uuid_broadcast <uuid> say::en\\snumber\\spronounced\\s12345 both
\`\`\`

### uuid_record
Record a channel to a file.
\`\`\`
uuid_record <uuid> start /path/to/file.wav    -- Start recording (both legs mixed)
uuid_record <uuid> stop /path/to/file.wav      -- Stop recording
uuid_record <uuid> start /path/file.wav 3600   -- Record with max duration (seconds)
\`\`\`

### uuid_audio_fork
Stream audio from a channel to a WebSocket (for real-time STT, analytics).
\`\`\`
uuid_audio_fork <uuid> start ws://host:port/path mono 8000
uuid_audio_fork <uuid> start ws://host:port/path stereo 16000
uuid_audio_fork <uuid> stop
\`\`\`
Requires mod_audio_fork. Streams raw PCM audio over WebSocket.
- mono: Mix both legs into single stream
- stereo: Left=read (incoming), Right=write (outgoing)
- Sample rates: 8000 or 16000

### uuid_setvar / uuid_getvar
\`\`\`
uuid_setvar <uuid> <variable_name> <value>
uuid_getvar <uuid> <variable_name>
\`\`\`

### uuid_transfer
Transfer a channel to a new dialplan destination.
\`\`\`
uuid_transfer <uuid> <destination> [dialplan] [context]
\`\`\`

## Information Commands
\`\`\`
show channels              -- List active channels
show calls                 -- List active calls
sofia status               -- Show all SIP profiles
sofia status profile <name> -- Show profile details
verto status               -- Show Verto connections
eval \\$\\{verto_contact(user@domain)\\} -- Resolve Verto contact
eval \\$\\{sofia_contact(*/user@domain)\\} -- Resolve SIP contact
user_data user@domain attr dial-string -- Get user's dial string
global_getvar domain       -- Get global variable
\`\`\`

## Module Commands
\`\`\`
reload mod_verto           -- Reload Verto module
sofia profile external restart -- Restart external SIP profile
sofia profile internal restart -- Restart internal SIP profile
sofia global siptrace on   -- Enable SIP trace
sofia global siptrace off  -- Disable SIP trace
\`\`\``
  },
  {
    id: "esl-sendmsg",
    topic: "ESL",
    title: "ESL sendmsg — Execute Dialplan Apps on Channels",
    keywords: ["sendmsg", "execute", "app", "dialplan", "channel"],
    content: `# ESL sendmsg — Execute Dialplan Applications

sendmsg allows executing dialplan applications on a specific channel via ESL.

## Format
\`\`\`
sendmsg <uuid>
call-command: execute
execute-app-name: <application>
execute-app-arg: <arguments>

\`\`\`
Note: Must end with two newlines.

## Common Applications via sendmsg

### answer
Answer an unanswered channel.
\`\`\`
sendmsg <uuid>
call-command: execute
execute-app-name: answer

\`\`\`

### playback
Play an audio file.
\`\`\`
sendmsg <uuid>
call-command: execute
execute-app-name: playback
execute-app-arg: /path/to/file.wav

\`\`\`
Generates CHANNEL_EXECUTE_COMPLETE event when done.

### record
Record audio from the channel.
\`\`\`
sendmsg <uuid>
call-command: execute
execute-app-name: record
execute-app-arg: /path/to/file.wav 30 200 3

\`\`\`
Arguments: <path> <max_seconds> <silence_thresh> <silence_secs>
- max_seconds: Maximum recording duration
- silence_thresh: Energy level below which is "silence" (0-65535, typical 200-500)
- silence_secs: Seconds of silence before stopping

### bridge
Bridge to a destination.
\`\`\`
sendmsg <uuid>
call-command: execute
execute-app-name: bridge
execute-app-arg: user/1001@default

\`\`\`

### park
Park the channel (holds in place waiting for commands).
\`\`\`
sendmsg <uuid>
call-command: execute
execute-app-name: park

\`\`\`

### read
Collect DTMF digits.
\`\`\`
sendmsg <uuid>
call-command: execute
execute-app-name: read
execute-app-arg: 1 4 /path/to/prompt.wav var_name 5000 #

\`\`\`
Arguments: <min_digits> <max_digits> <audio_file> <variable_name> <timeout_ms> <terminators>

### sleep
Pause execution for milliseconds.
\`\`\`
sendmsg <uuid>
call-command: execute
execute-app-name: sleep
execute-app-arg: 1000

\`\`\`

### set
Set a channel variable.
\`\`\`
sendmsg <uuid>
call-command: execute
execute-app-name: set
execute-app-arg: my_variable=my_value

\`\`\`

## Event-Based Completion
After execute, FreeSWITCH sends CHANNEL_EXECUTE_COMPLETE event:
- Application: The app that finished
- Application-Data: The arguments
- Application-Response: Return value (if any)

Use this to know when playback finishes, recording completes, etc. instead of sleep-based polling.`
  },
  // ============================================================
  // SIP Profiles
  // ============================================================
  {
    id: "sip-profiles",
    topic: "SIP",
    title: "FreeSWITCH SIP Profiles (Sofia)",
    keywords: ["sofia", "sip", "profile", "external", "internal", "nat", "ext-rtp-ip", "ext-sip-ip", "contact"],
    content: `# FreeSWITCH SIP Profiles

SIP profiles are managed by mod_sofia. Each profile listens on a specific port and handles SIP traffic for that context.

## Typical Setup
- external profile (port 5060): SIP trunk facing (carrier/PSTN)
- internal profile (port 5062): Agent/endpoint facing

## Critical NAT Parameters

### ext-rtp-ip
The IP address advertised in SDP for RTP media. MUST be reachable by the remote party.
\`\`\`xml
<!-- For servers with public IP: -->
<param name="ext-rtp-ip" value="1.2.3.4"/>

<!-- Auto-detect via STUN: -->
<param name="ext-rtp-ip" value="stun:stun.freeswitch.org"/>

<!-- Auto-detect via UPnP/NAT-PMP (UNRELIABLE in Docker/cloud): -->
<param name="ext-rtp-ip" value="auto-nat"/>

<!-- Use local IP (only for LAN-only deployments): -->
<param name="ext-rtp-ip" value="$\${local_ip_v4}"/>
\`\`\`

### ext-sip-ip
The IP address in SIP Contact/Via headers. MUST be reachable by the remote party.
Same options as ext-rtp-ip.

### CRITICAL: Docker and Cloud
In Docker containers or cloud VMs (AWS, Azure, GCP):
- auto-nat DOES NOT WORK — it detects the Docker bridge IP (172.17.x.x) or internal VPC IP
- MUST set ext-rtp-ip and ext-sip-ip to the PUBLIC IP explicitly
- Or use STUN (but adds startup latency)
- The 32-second call drop is the classic symptom of wrong ext-rtp-ip/ext-sip-ip

### sip-ip / sip-port
The local bind address:
\`\`\`xml
<param name="sip-ip" value="$\${local_ip_v4}"/>
<param name="sip-port" value="5060"/>
\`\`\`

### Contact Header
FreeSWITCH puts ext-sip-ip:sip-port in the Contact header of SIP responses.
If this is wrong (private IP, wrong port), the remote party sends ACK/BYE to the wrong address → call drops at 32 seconds (SIP Timer B = 64 * T1 = 32s).

## Auth and ACL
\`\`\`xml
<param name="auth-calls" value="false"/>  <!-- No auth for trunk ingress -->
<param name="apply-inbound-acl" value="domains"/>  <!-- ACL filter -->
\`\`\`

## Session Timers
\`\`\`xml
<param name="enable-timer" value="false"/>  <!-- Disable SIP session timers -->
<param name="session-timeout" value="1800"/>  <!-- 30 min timeout if enabled -->
<param name="minimum-session-expires" value="90"/>
\`\`\`

## Codec Configuration
\`\`\`xml
<param name="inbound-codec-prefs" value="PCMU,PCMA,OPUS"/>
<param name="outbound-codec-prefs" value="PCMU,PCMA,OPUS"/>
\`\`\``
  },
  // ============================================================
  // Dialplan
  // ============================================================
  {
    id: "dialplan",
    topic: "Dialplan",
    title: "FreeSWITCH XML Dialplan",
    keywords: ["dialplan", "extension", "condition", "action", "context", "public", "default", "park", "bridge", "answer", "playback", "record", "sleep", "read", "eavesdrop"],
    content: `# FreeSWITCH XML Dialplan

## Structure
\`\`\`xml
<include>
  <context name="public">      <!-- Context for external/trunk calls -->
    <extension name="inbound">
      <condition field="destination_number" expression="^(\\+?1?\\d{10})$">
        <action application="answer"/>
        <action application="park"/>
      </condition>
    </extension>
  </context>

  <context name="default">     <!-- Context for internal/agent calls -->
    <extension name="agent_extensions">
      <condition field="destination_number" expression="^(10\\d{2})$">
        <action application="bridge" data="user/$1@$\${domain_name}"/>
      </condition>
    </extension>
  </context>
</include>
\`\`\`

## Contexts
- public: Typically for calls from SIP trunks (external profile)
- default: Typically for calls from registered endpoints (internal profile, Verto)

## Condition Fields
- destination_number: The dialed number
- caller_id_number: Caller's ANI
- \${variable_name}: Any channel variable

## Key Dialplan Applications

### answer
Answer the call (send 200 OK).
\`\`\`xml
<action application="answer"/>
\`\`\`

### park
Park the channel — holds it in place for ESL control.
\`\`\`xml
<action application="park"/>
\`\`\`
When a call is parked, ESL receives CHANNEL_PARK event and can take control.

### bridge
Connect to another endpoint.
\`\`\`xml
<action application="bridge" data="user/1001@default"/>
<action application="bridge" data="sofia/external/+15551234567@trunk.example.com"/>
<action application="bridge" data="verto.rtc/user@domain"/>
\`\`\`

### playback
Play an audio file.
\`\`\`xml
<action application="playback" data="/path/to/file.wav"/>
<action application="playback" data="local_stream://moh"/>  <!-- Music on hold -->
<action application="playback" data="silence_stream://1000"/>  <!-- 1 second silence -->
\`\`\`

### record
Record the caller.
\`\`\`xml
<action application="record" data="/path/to/file.wav 30 200 3"/>
\`\`\`
Arguments: <path> <max_secs> <silence_thresh> <silence_secs>

### sleep
Pause in milliseconds.
\`\`\`xml
<action application="sleep" data="1000"/>
\`\`\`

### read
Collect DTMF digits.
\`\`\`xml
<action application="read" data="1 4 /path/prompt.wav myvar 5000 #"/>
\`\`\`

### eavesdrop
Listen to another call (for supervisor monitoring).
\`\`\`xml
<action application="eavesdrop" data="\${target_uuid}"/>
\`\`\`
Variables that control eavesdrop behavior:
- eavesdrop_enable_dtmf: true/false — allow DTMF to switch modes
- eavesdrop_whisper_aleg: true/false — supervisor audio goes to A-leg (caller)
- eavesdrop_whisper_bleg: true/false — supervisor audio goes to B-leg (agent)

Modes via DTMF (when enabled):
- 0: Mute (silent listen)
- 1: Whisper to A-leg
- 2: Whisper to B-leg
- 3: Barge (talk to both)

### set
Set a channel variable.
\`\`\`xml
<action application="set" data="my_var=my_value"/>
\`\`\``
  },
  // ============================================================
  // mod_verto
  // ============================================================
  {
    id: "verto-overview",
    topic: "Verto",
    title: "mod_verto — WebRTC for FreeSWITCH",
    keywords: ["verto", "webrtc", "websocket", "browser", "softphone", "register", "invite", "answer", "bye", "media"],
    content: `# mod_verto — WebRTC Support for FreeSWITCH

mod_verto provides WebRTC connectivity via a JSON-RPC over WebSocket protocol.

## Architecture
\`\`\`
Browser (WebRTC) ←→ WebSocket ←→ mod_verto ←→ FreeSWITCH core
\`\`\`

## Configuration (verto.conf.xml)
\`\`\`xml
<configuration name="verto.conf" description="WebRTC Verto Endpoint">
  <settings>
    <param name="debug" value="10"/>
  </settings>
  <profiles>
    <profile name="default-v4">
      <param name="bind-local" value="0.0.0.0:8081"/>           <!-- WS -->
      <param name="bind-local" value="0.0.0.0:8082" secure="true"/> <!-- WSS -->
      <param name="force-register-domain" value="default"/>      <!-- CRITICAL: Must match directory domain -->
      <param name="userauth" value="true"/>
      <param name="context" value="default"/>
      <param name="dialplan" value="XML"/>
      <param name="rtp-ip" value="$\${local_ip_v4}"/>
      <param name="ext-rtp-ip" value="auto-nat"/>
      <param name="outbound-codec-string" value="OPUS,PCMU,PCMA"/>
      <param name="inbound-codec-string" value="OPUS,PCMU,PCMA"/>
      <param name="apply-candidate-acl" value="localnet.auto"/>
      <param name="apply-candidate-acl" value="wan_v4.auto"/>
      <param name="enable-3pcc" value="true"/>
    </profile>
  </profiles>
</configuration>
\`\`\`

## CRITICAL: force-register-domain
This parameter determines the domain part of Verto registrations.
- If set to \`$\${local_ip_v4}\`: Clients register as user@172.20.90.36 (or whatever the IP is)
- If set to \`default\`: Clients register as user@default

This MUST MATCH the domain in your user directory. If your directory has:
\`\`\`xml
<domain name="default">
  <user id="agent">...</user>
</domain>
\`\`\`
Then force-register-domain MUST be "default". Otherwise originate to the user will fail with USER_NOT_REGISTERED because FreeSWITCH looks up the user in the wrong domain.

## Verto JSON-RPC Protocol

### Login
\`\`\`json
{"jsonrpc":"2.0","id":1,"method":"login","params":{"login":"agent","passwd":"1234","sessid":"uuid"}}
\`\`\`
Response: {"result":{"message":"logged in"}}

### Incoming Call (server → client)
\`\`\`json
{"jsonrpc":"2.0","method":"verto.invite","params":{"callID":"uuid","sdp":"...","callerIdName":"...","callerIdNumber":"..."}}
\`\`\`

### Answer Call (client → server)
\`\`\`json
{"jsonrpc":"2.0","id":2,"method":"verto.answer","params":{"callID":"uuid","sdp":"...","sessid":"uuid"}}
\`\`\`

### Hang Up
\`\`\`json
{"jsonrpc":"2.0","id":3,"method":"verto.bye","params":{"callID":"uuid","sessid":"uuid"}}
\`\`\`

### Media Update
\`\`\`json
{"jsonrpc":"2.0","method":"verto.media","params":{"callID":"uuid","sdp":"..."}}
\`\`\`

## Originating Calls to Verto Clients
\`\`\`
originate verto.rtc/user@domain &application(args)
\`\`\`
Or via the user/ endpoint (tries both SIP and Verto):
\`\`\`
originate user/agent@default &park
\`\`\`
The user/ endpoint uses the dial-string from the directory, which can include both sofia_contact and verto_contact.

## Checking Verto Status
\`\`\`
verto status                              -- Show all connections
eval \${verto_contact(user@domain)}       -- Resolve a user's Verto contact
\`\`\`

## Common Issues
1. USER_NOT_REGISTERED: force-register-domain doesn't match directory domain
2. Multiple CONN_REG entries: Page refreshes create new connections without closing old ones
3. NO_ANSWER: Invite reaches client but WebRTC negotiation fails (STUN/TURN/ICE issues)
4. WSS required: Browsers on HTTPS pages require WSS, not WS`
  },
  // ============================================================
  // User Directory
  // ============================================================
  {
    id: "directory",
    topic: "Directory",
    title: "FreeSWITCH User Directory",
    keywords: ["directory", "domain", "user", "dial-string", "sofia_contact", "verto_contact", "registration", "password"],
    content: `# FreeSWITCH User Directory

The directory defines users, their credentials, and how to reach them.

## Structure
\`\`\`xml
<include>
  <domain name="default">
    <params>
      <!-- dial-string: How FreeSWITCH reaches a user. Tries SIP first, then Verto. -->
      <param name="dial-string" value="{^^:sip_invite_domain=\${dialed_domain}:presence_id=\${dialed_user}@\${dialed_domain}}\${sofia_contact(*/\${dialed_user}@\${dialed_domain})},\${verto_contact(\${dialed_user}@\${dialed_domain})}"/>
    </params>
    <groups>
      <group name="default">
        <users>
          <!-- SIP phone user -->
          <user id="1001">
            <params>
              <param name="password" value="1234"/>
            </params>
            <variables>
              <variable name="user_context" value="default"/>
            </variables>
          </user>

          <!-- Verto WebRTC user -->
          <user id="agent">
            <params>
              <param name="password" value="1234"/>
              <param name="jsonrpc-allowed-methods" value="verto"/>
              <param name="jsonrpc-allowed-event-channels" value="demo,conference,presence"/>
            </params>
            <variables>
              <variable name="user_context" value="default"/>
              <variable name="effective_caller_id_name" value="Agent Name"/>
              <variable name="effective_caller_id_number" value="1001"/>
            </variables>
          </user>
        </users>
      </group>
    </groups>
  </domain>
</include>
\`\`\`

## The dial-string Parameter (CRITICAL)
The dial-string in the domain params controls what happens when you call \`user/agent@default\`:
1. \${sofia_contact(*/agent@default)} — Tries SIP registration first
2. \${verto_contact(agent@default)} — Falls back to Verto connection

The comma between them means "try first, if fails try second" (serial hunting).
This is why \`user/\` is preferred over \`verto.rtc/\` — it works with BOTH SIP phones and WebRTC.

## Domain Name
The domain name in the directory MUST match:
- verto.conf.xml: force-register-domain
- SIP profile context
- The domain used in originate/bridge commands

## Resolving Users
\`\`\`
user_data agent@default attr dial-string    -- Get the resolved dial string
eval \${sofia_contact(*/agent@default)}     -- SIP contact (empty if not registered)
eval \${verto_contact(agent@default)}       -- Verto contact (empty if not connected)
\`\`\``
  },
  // ============================================================
  // Kamailio
  // ============================================================
  {
    id: "kamailio-basics",
    topic: "Kamailio",
    title: "Kamailio SIP Proxy Basics",
    keywords: ["kamailio", "proxy", "record_route", "topology_hiding", "nat", "ua_spoofing", "user-agent"],
    content: `# Kamailio as SIP Proxy for FreeSWITCH

Kamailio sits in front of FreeSWITCH to handle SIP routing, NAT traversal, topology hiding, and User-Agent spoofing.

## Architecture
\`\`\`
SIP Trunk (Twilio) ←→ Kamailio (:5060) ←→ FreeSWITCH (:5062)
SIP Phones         ←→ Kamailio (:5060) ←→ FreeSWITCH (:5062)
\`\`\`

## Critical: Record-Route
Kamailio MUST insert itself into the Record-Route for SIP dialogs. Without this:
- The ACK after 200 OK goes directly to FreeSWITCH's Contact address
- If that address is unreachable (Docker IP, wrong port), the ACK never arrives
- Call drops at exactly 32 seconds (SIP Timer B)

\`\`\`
# In kamailio.cfg:
if (is_method("INVITE")) {
    record_route();     # Insert Kamailio into the dialog path
    # OR with explicit IP:
    record_route_preset("PUBLIC_IP:5060");
}
\`\`\`

## ACK Handling
\`\`\`
if (is_method("ACK")) {
    if (t_check_trans()) {
        t_relay();      # Relay ACK through Kamailio
        exit;
    }
    exit;
}
\`\`\`

## User-Agent Spoofing for Mitel 6940
Mitel 6940 phones check the User-Agent header to verify they're talking to a Mitel system.
Kamailio can rewrite this in responses:
\`\`\`
# In onreply_route or reply_route:
if ($ua =~ "Mitel") {
    remove_hf("User-Agent");
    insert_hf("User-Agent: Mitel-3300-ICP\\r\\n");
}

# Or use header manipulation:
onreply_route[MANAGE_REPLY] {
    if (is_present_hf("User-Agent")) {
        remove_hf("User-Agent");
    }
    append_hf("User-Agent: Mitel-3300-ICP\\r\\n");
}
\`\`\`

## Topology Hiding
Hide FreeSWITCH behind Kamailio so external parties only see Kamailio's address:
\`\`\`
loadmodule "topology_hiding.so"

# In INVITE handling:
if (is_method("INVITE") && !has_totag()) {
    topology_hiding("UC");   # U=User-Agent, C=Contact
}

onreply_route {
    topology_hiding_match();
}
\`\`\`

## NAT Handling
\`\`\`
loadmodule "nathelper.so"
loadmodule "rtpproxy.so"   # or rtpengine

# Detect NAT:
if (nat_uac_test("19")) {
    fix_nated_contact();
    fix_nated_sdp("7");
    force_rport();
}
\`\`\``
  },
  // ============================================================
  // Media Handling
  // ============================================================
  {
    id: "media-handling",
    topic: "Media",
    title: "FreeSWITCH Media Handling — RTP, Codecs, Recording",
    keywords: ["rtp", "media", "codec", "recording", "playback", "wav", "pcm", "sample rate", "moh", "music on hold"],
    content: `# FreeSWITCH Media Handling

## Audio Formats
FreeSWITCH internal format: 16-bit signed PCM, mono
Default sample rate: 8000 Hz (narrowband telephony)
Can operate at 16000 Hz, 32000 Hz, 48000 Hz for wideband

## WAV File Format for Playback/Recording
- Must be: PCM, 16-bit, mono
- Sample rate should match the channel (typically 8000 or 16000 Hz)
- WAV header: 44 bytes standard RIFF header

## Creating WAV from Raw PCM
\`\`\`
Raw PCM (16-bit, 16kHz, mono) + 44-byte WAV header = playable WAV file
\`\`\`
WAV header fields:
- Bytes 0-3: "RIFF"
- Bytes 4-7: File size - 8 (little-endian uint32)
- Bytes 8-11: "WAVE"
- Bytes 12-15: "fmt "
- Bytes 16-19: 16 (PCM format chunk size)
- Bytes 20-21: 1 (audio format = PCM)
- Bytes 22-23: 1 (channels = mono)
- Bytes 24-27: sample rate (e.g., 16000)
- Bytes 28-31: byte rate (sample_rate * channels * bits/8)
- Bytes 32-33: block align (channels * bits/8)
- Bytes 34-35: bits per sample (16)
- Bytes 36-39: "data"
- Bytes 40-43: data length (little-endian uint32)

## Music on Hold
\`\`\`xml
<!-- Play MOH on a parked/held call: -->
<action application="playback" data="local_stream://moh"/>
\`\`\`
Or via ESL:
\`\`\`
sendmsg <uuid>
call-command: execute
execute-app-name: playback
execute-app-arg: local_stream://moh
\`\`\`

## RTP Port Range
Default: 16384-32768
Configure in SIP profile:
\`\`\`xml
<param name="rtp-start-port" value="16384"/>
<param name="rtp-end-port" value="32767"/>
\`\`\`
NSG/firewall must allow UDP on this range.

## Codec Negotiation
Common codecs:
- PCMU (G.711 μ-law): 64kbps, 8kHz, universal compatibility
- PCMA (G.711 A-law): 64kbps, 8kHz, common in Europe
- OPUS: Variable bitrate, 8-48kHz, best quality, used by WebRTC
- G.722: 64kbps, 16kHz wideband

For WebRTC (Verto): OPUS preferred, with PCMU/PCMA fallback
For SIP trunks: PCMU/PCMA (Twilio uses PCMU by default)`
  },
  // ============================================================
  // Common Issues and Debugging
  // ============================================================
  {
    id: "troubleshooting",
    topic: "Troubleshooting",
    title: "Common FreeSWITCH Issues and Debugging",
    keywords: ["debug", "troubleshoot", "32 seconds", "call drop", "no audio", "one way audio", "user not registered", "no answer", "siptrace", "loglevel"],
    content: `# Common FreeSWITCH Issues

## Call Drops at 32 Seconds
Cause: ACK not received after 200 OK. SIP Timer B expires (64 * T1 = 32s).
Debug:
\`\`\`
sofia global siptrace on    -- Capture SIP messages
\`\`\`
Look for: Is ACK being sent? Is it going to the right IP:port?
Common fixes:
- ext-sip-ip/ext-rtp-ip wrong (Docker/cloud IP issue)
- Firewall blocking the port FreeSWITCH advertises in Contact header
- Kamailio not Record-Routing, so ACK bypasses proxy
- If FreeSWITCH is on port 5062 but Contact says :5062, make sure that port is reachable

## No Audio / One-Way Audio
Cause: RTP packets not flowing in one or both directions.
Debug:
\`\`\`
uuid_debug_media <uuid> read on    -- Show incoming RTP
uuid_debug_media <uuid> write on   -- Show outgoing RTP
\`\`\`
Common fixes:
- ext-rtp-ip wrong (SDP advertises unreachable IP)
- Firewall blocking RTP ports (UDP 16384-32767)
- Codec mismatch between endpoints
- Enable Symmetric RTP on Twilio if behind NAT

## USER_NOT_REGISTERED
When originating to a user that should be registered.
Debug:
\`\`\`
sofia status profile internal reg   -- Show SIP registrations
verto status                         -- Show Verto connections
eval \${sofia_contact(*/user@domain)}
eval \${verto_contact(user@domain)}
\`\`\`
Common fixes:
- Domain mismatch: Verto force-register-domain doesn't match directory domain
- User not in directory XML
- User registered on different profile than expected
- Stale registrations (page refresh without proper cleanup)

## NO_ANSWER
Originate succeeds but nobody answers.
For Verto: The invite reached the browser but:
- WebRTC negotiation failed (ICE/STUN/TURN)
- Softphone code didn't send verto.answer
- autoAnswer not enabled
- SDP incompatible

## Debugging Commands
\`\`\`
sofia global siptrace on                    -- SIP message trace
sofia loglevel all 9                        -- Maximum Sofia logging
verto loglevel debug                        -- Verto debug logging
console loglevel debug                      -- Console debug output
show channels                               -- Active channels
show calls                                  -- Active bridged calls
uuid_dump <uuid>                            -- Dump all variables on a channel
\`\`\``
  },
  // ============================================================
  // Twilio SIP Trunking
  // ============================================================
  {
    id: "twilio-integration",
    topic: "Twilio",
    title: "Twilio Elastic SIP Trunk with FreeSWITCH",
    keywords: ["twilio", "sip trunk", "elastic", "origination", "termination", "did", "acl", "credential"],
    content: `# Twilio Elastic SIP Trunk + FreeSWITCH

## Inbound (Twilio → FreeSWITCH)
1. Configure Origination URI in Twilio Console: sip:your-public-ip:5060
2. Twilio sends INVITE to your IP when the DID is called
3. FreeSWITCH's external profile receives it in the "public" context

## Outbound (FreeSWITCH → Twilio)
1. Configure Termination URI in Twilio: your-trunk.pstn.twilio.com
2. Set up Credential List or IP ACL in Twilio
3. Create a gateway in FreeSWITCH:
\`\`\`xml
<gateway name="twilio">
  <param name="username" value="twilio-username"/>
  <param name="password" value="twilio-password"/>
  <param name="proxy" value="your-trunk.pstn.twilio.com"/>
  <param name="register" value="false"/>
</gateway>
\`\`\`

## Twilio IP Ranges
Twilio uses many IP ranges for signaling and media. Your firewall MUST allow ALL of them.
Check: https://www.twilio.com/docs/sip-trunking/ip-addresses

## ACL Configuration
Whitelist Twilio's signaling IPs in FreeSWITCH ACL:
\`\`\`xml
<configuration name="acl.conf">
  <network-lists>
    <list name="twilio" default="deny">
      <node type="allow" cidr="54.172.60.0/30"/>
      <node type="allow" cidr="54.244.51.0/30"/>
      <!-- Add all Twilio IP ranges -->
    </list>
  </network-lists>
</configuration>
\`\`\`

## Common Twilio + FreeSWITCH Issues
1. 32-second drops: ACK not reaching FreeSWITCH (wrong Contact header IP/port, firewall)
2. 403 Forbidden: IP not in Twilio ACL, or credentials wrong
3. No audio: ext-rtp-ip wrong, RTP ports blocked, or Symmetric RTP needed
4. DTMF not working: Set dtmf-type to rfc2833 in the gateway

## Twilio Debugger
Check Twilio Console → Debugger for SIP-level errors (32xxx series).
Call Logs show call duration, BYE reason, and SDP details.`
  },
  // ============================================================
  // Channel Variables
  // ============================================================
  {
    id: "channel-variables",
    topic: "Variables",
    title: "Important FreeSWITCH Channel Variables",
    keywords: ["variable", "caller_id", "destination_number", "hangup_cause", "bridge", "originate", "timeout"],
    content: `# Key FreeSWITCH Channel Variables

## Call Info
- caller_id_number: Caller's phone number (ANI)
- caller_id_name: Caller's name (CNAM)
- destination_number: Dialed number (DNIS)
- call_direction: "inbound" or "outbound"
- Unique-ID: Channel UUID

## Bridge/Originate Control
- origination_timeout: Seconds to wait for answer on originate (default: 60)
- call_timeout: Seconds to wait for answer on bridge
- leg_timeout: Per-leg timeout in bridge with multiple destinations
- origination_caller_id_name: Set caller ID name on originated call
- origination_caller_id_number: Set caller ID number on originated call
- bridge_early_media: Play early media from B-leg to A-leg
- ignore_early_media: Don't pass early media

## Call State
- hangup_cause: Reason for hangup (NORMAL_CLEARING, USER_BUSY, etc.)
- bridge_hangup_cause: Hangup cause from the bridge
- read_codec: Current read (incoming) codec
- write_codec: Current write (outgoing) codec

## Media Control
- hold_music: Path to hold music file/stream
- transfer_ringback: Audio to play while transferring
- playback_terminators: DTMF digits that stop playback (e.g., "any" or "123#")

## Recording
- record_file_prefix: Prefix for record app files
- RECORD_STEREO: true = record legs separately (left/right channels)
- RECORD_ANSWER_REQ: true = only record after answer

## SIP-Specific
- sip_h_X-Custom: Set custom SIP header (prefix with sip_h_)
- sip_invite_domain: Domain in INVITE request
- sip_contact_user: User in Contact header
- sip_from_display: Display name in From header`
  },

  // ============================================================
  // Lessons Learned — Real-world production issues
  // ============================================================
  {
    id: "execute-vs-api-threading",
    topic: "ESL",
    title: "Critical: execute (sendmsg) vs api Threading Model",
    keywords: ["execute", "sendmsg", "api", "threading", "depth", "queue", "park", "CS_PARK", "CS_EXECUTE", "media_ready"],
    content: `# execute (sendmsg) vs api — Threading Model

This is the most important thing to understand about ESL. Getting it wrong causes
silent failures, "Cannot record session" errors, and phantom audio.

## Two Different Threads

- \`api <command>\` runs on the **API thread** (the ESL connection's thread)
- \`sendmsg <uuid>\\ncall-command: execute\\n...\` runs on the **channel's session thread**

They are completely independent. An \`api\` command that checks channel state
may see a DIFFERENT state than what the channel thread is currently processing.

## Channel States That Matter

- **CS_PARK**: Channel is parked (waiting for ESL commands). NO active media session.
  \`switch_channel_media_ready()\` returns FALSE in this state.
- **CS_EXECUTE**: Channel is executing a dialplan app (playback, record, bridge).
  Media IS active. \`switch_channel_media_ready()\` returns TRUE.

## The uuid_record Problem

\`uuid_record\` is an \`api\` command. It calls \`switch_ivr_record_session()\` which
checks \`switch_channel_media_ready()\`. If the channel is in CS_PARK, this returns
FALSE and you get: \`-ERR Cannot record session!\`

This happens EVEN IF you just sent a \`sendmsg execute playback\` to the channel,
because the sendmsg queues on the channel thread while the api runs on the API thread.
The channel thread may not have started the playback yet.

### What Does NOT Work
\`\`\`
sendmsg <uuid>           ← queues playback on channel thread
call-command: execute
execute-app-name: playback
execute-app-arg: silence_stream://60000

api uuid_record <uuid> start /path  ← runs on API thread, checks media_ready
                                       channel thread hasn't started playback yet
                                       → -ERR Cannot record session!
\`\`\`

### What DOES Work
\`\`\`
# Record DURING an active execute (e.g., during IVR greeting playback)
# The playback must already be RUNNING on the channel (not just queued)
api uuid_record <uuid> start /path   ← media IS ready because playback is active
\`\`\`

### Also: File Permissions
If FreeSWITCH runs as user \`freeswitch\` (common with \`-u freeswitch -g freeswitch\`),
it cannot write to directories owned by root with mode 0700 (e.g., Docker temp dirs).
\`uuid_record\` will fail with "Cannot record session!" even if media is ready.

**Fix:** \`chmod 0o777\` on the directory, \`0o644\` on files.

## Execute Queue Depth

Each \`sendmsg execute\` to a parked channel runs at depth+1. If you send multiple
before the first finishes, they QUEUE at increasing depths:

\`\`\`
EXECUTE [depth=0] park()                    ← dialplan
EXECUTE [depth=1] playback(greeting.wav)    ← first sendmsg
EXECUTE [depth=2] playback(response.wav)    ← second sendmsg (queued!)
\`\`\`

This causes audio to pile up and play out of order. The command/reply +OK comes
immediately for each sendmsg, but the actual execution is sequential on the channel.

**Prefer uuid_broadcast over execute playback** for IVR-style sequential playback
from ESL. uuid_broadcast is an api command but internally queues similarly.`
  },
  {
    id: "verto-webrtc-gotchas",
    topic: "Verto",
    title: "Verto/WebRTC Production Gotchas",
    keywords: ["verto", "webrtc", "ice", "uuid_hold", "mute", "uuid_audio", "ext-rtp-ip", "stun", "registration", "DESTINATION_OUT_OF_ORDER"],
    content: `# Verto/WebRTC Production Gotchas

## ext-rtp-ip Must Match Network Topology

The ext-rtp-ip in verto.conf.xml controls what IP is advertised in SDP to WebRTC clients.

- If browser and FS are on the **same corporate LAN**: use FS's internal IP (e.g., 172.20.90.36)
- If browser is on the **internet**: use FS's public IP
- If ext-rtp-ip is wrong, ICE will fail: \`ICE connection state: failed\`

The external SIP profile (for carriers like Twilio) needs the PUBLIC IP.
Verto needs the IP reachable by the browser. These are often different.

## STUN May Be Blocked

Corporate firewalls often block STUN (UDP 3478 to stun.l.google.com:19302).
Without STUN, the browser only has host candidates (private IPs).

**If browser and FS are on the same network**, STUN isn't needed:
\`\`\`javascript
new RTCPeerConnection({ iceServers: [] })
\`\`\`
Host candidates work fine for same-network connectivity.

## uuid_hold Breaks Verto ICE

\`uuid_hold\` on a Verto channel sends a SIP re-INVITE with a=sendonly.
This causes the WebRTC ICE connection to renegotiate and often FAIL:
\`\`\`
ICE connection state: connected → disconnected → failed
\`\`\`

**Do NOT use uuid_hold on Verto channels.** Instead:
- Play MOH explicitly: \`execute playback local_stream://moh\` on the CALLER's channel
- Resume: \`uuid_break\` to stop the MOH
- The Verto WebRTC connection stays intact

## uuid_audio Doesn't Work on Verto

\`uuid_audio <uuid> start write mute\` on a Verto channel returns +OK but
has NO EFFECT on the WebRTC audio path. The audio goes through DTLS/SRTP
which uuid_audio doesn't intercept.

**Use browser-side muting instead:**
\`\`\`javascript
localStream.getAudioTracks().forEach(track => track.enabled = false);
\`\`\`
This immediately silences the agent's mic without any ESL command.

## Verto Registration and DESTINATION_OUT_OF_ORDER

\`originate verto.rtc/user@domain &park\` fails with DESTINATION_OUT_OF_ORDER if:
1. The Verto client is not registered (\`verto_contact user@domain\` returns error)
2. The registration is stale (browser refreshed but old session lingers)
3. The domain in the originate doesn't match force-register-domain

**Always check registration first:**
\`\`\`
fs_cli -x "verto_contact user@domain"
\`\`\`

If it returns \`error/user_not_registered\`, the browser needs to reconnect.

## Softphone Must Stay Mounted

If a React SPA unmounts the Verto WebSocket component during call state transitions,
it sends \`verto.unregister\`, and subsequent \`originate verto.rtc/user@domain\` fails.

**Keep the softphone component mounted at all times** — use CSS \`display: none\`
instead of conditional rendering to hide it.`
  },
  {
    id: "stereo-recording",
    topic: "Media",
    title: "Stereo Call Recording with Speaker Separation",
    keywords: ["RECORD_STEREO", "stereo", "recording", "speaker", "channel", "left", "right", "deinterleave", "uuid_record", "WAV"],
    content: `# Stereo Call Recording with Speaker Separation

## Enable Stereo Recording

Set the channel variable before starting uuid_record:
\`\`\`
uuid_setvar <uuid> RECORD_STEREO true
uuid_record <uuid> start /path/to/file.wav
\`\`\`

## Channel Layout

The resulting WAV file is 2-channel (stereo) PCM:
- **Left channel (ch1)** = READ direction = what FS receives FROM the endpoint
  - For the caller's channel: this is the CALLER's voice
- **Right channel (ch2)** = WRITE direction = what FS sends TO the endpoint
  - For the caller's channel: this is what the caller HEARS (IVR TTS, MOH, agent audio)

## Deinterleaving Stereo PCM

For 16-bit stereo at 8kHz, each frame is 4 bytes: [L_lo, L_hi, R_lo, R_hi]

To extract left channel (caller): take bytes 0-1 of each 4-byte frame
To extract right channel (what caller hears): take bytes 2-3 of each 4-byte frame

\`\`\`javascript
const frameSize = 4; // 2 bytes per sample * 2 channels
const channelOffset = channel === 'right' ? 2 : 0;
for (let i = 0; i < frames; i++) {
  input.copy(mono, i * 2, i * frameSize + channelOffset, i * frameSize + channelOffset + 2);
}
\`\`\`

## File Tailing for Real-Time STT

\`uuid_record\` writes to the file continuously. You can tail it in real-time:
1. Open the file with \`fs.openSync(path, 'r')\`
2. Skip 44-byte WAV header
3. Poll with \`fs.fstatSync\` + \`fs.readSync\` every 50ms
4. Deinterleave to extract the desired channel
5. Push mono PCM to streaming STT (e.g., Azure Speech push stream)

**Important:** The WAV header's data-size field is only correct AFTER recording stops.
While recording is active, ignore the header — just skip 44 bytes and read raw PCM.

## Recording Continues Through Bridge

\`uuid_record\` attaches as a media bug. It persists through \`uuid_bridge\` and
other state changes. After the IVR transfers to an agent, the same recording
captures both the caller and agent audio (agent audio appears on ch2 since
it's sent to the caller).

**Do NOT stop uuid_record in the IVR cleanup.** Let it run through the agent
phase. Stop it in the call:ended handler.`
  },
  {
    id: "esl-security",
    topic: "ESL",
    title: "ESL Security — Restrict Access",
    keywords: ["security", "listen-ip", "password", "ClueCon", "0.0.0.0", "acl", "event_socket"],
    content: `# ESL Security

## Default Config is DANGEROUS

The default event_socket.conf.xml listens on 0.0.0.0:8021 with password "ClueCon".
Anyone on the network can connect and control ALL calls.

**Real-world incident:** An Azure Container App on the same VNet connected to ESL
and was sending \`execute playback local_stream://moh\` to active calls every ~24 seconds,
causing phantom music-on-hold during IVR conversations. This took hours to diagnose
because the commands appeared as legitimate \`Command Execute\` in FS logs.

## Fix: Restrict to Localhost

In \`/etc/freeswitch/autoload_configs/event_socket.conf.xml\`:
\`\`\`xml
<param name="listen-ip" value="127.0.0.1"/>
<param name="listen-port" value="8021"/>
<param name="password" value="YourStrongPassword"/>
\`\`\`

If your API runs in Docker with \`--network host\`, it connects via localhost.
No need for external access.

## Also: iptables Backup

\`\`\`bash
iptables -A INPUT -p tcp --dport 8021 -s 127.0.0.1 -j ACCEPT
iptables -A INPUT -p tcp --dport 8021 -j DROP
\`\`\`

## Fresh ESL Connections

For commands that need clean response ordering (like \`originate\` which takes
seconds to complete), use a fresh TCP connection instead of the persistent one.
This avoids response queue desync under event load.

Connect → auth → send one api command → read response → disconnect.`
  },
  {
    id: "dialplan-moh-interference",
    topic: "Dialplan",
    title: "Dialplan MOH Interference with ESL-Controlled Calls",
    keywords: ["moh", "hold_music", "park", "dialplan", "execute", "depth", "local_stream", "silence_stream", "phantom"],
    content: `# Dialplan MOH Interference

## The Problem

When ESL controls a call via \`park()\`, the dialplan may still have pending actions
or the global \`hold_music\` variable may trigger unexpected music-on-hold.

FreeSWITCH has a global variable in vars.xml:
\`\`\`xml
<X-PRE-PROCESS cmd="set" data="hold_music=local_stream://moh"/>
\`\`\`

This is used by \`uuid_hold\`, SIP re-INVITE holds, and some internal mechanisms.

## Symptoms

- Music plays between IVR turns when it shouldn't
- Caller hears MOH during AI processing pauses
- MOH appears as \`Command Execute [depth=N] playback(local_stream://moh)\` in FS logs
- The MOH is NOT sent by your application code

## Causes

1. **Global hold_music variable**: FS uses this when certain events trigger hold behavior
2. **Dialplan actions after park()**: If the dialplan context has extensions that match
   after \`park()\` returns (e.g., from uuid_break), those actions execute
3. **External ESL connections**: Other applications connected to ESL sending commands
4. **SIP re-INVITE from carrier**: Carrier puts call on hold, FS responds with MOH

## Fixes

### Set hold_music to silence in your dialplan
\`\`\`xml
<extension name="inbound">
  <condition field="destination_number" expression="^(\\+?1?\\d{10})$">
    <action application="set" data="hold_music=silence_stream://0"/>
    <action application="answer"/>
    <action application="park"/>
  </condition>
</extension>
\`\`\`

### Change the global default
In \`/etc/freeswitch/vars.xml\`:
\`\`\`xml
<X-PRE-PROCESS cmd="set" data="hold_music=silence_stream://0"/>
\`\`\`

### For explicit hold (when you WANT MOH)
Use \`execute playback local_stream://moh\` directly instead of relying on
the hold_music variable. Stop with \`uuid_break\`.

### Check for rogue ESL connections
\`\`\`bash
ss -tnp | grep 8021
\`\`\`
Any connection other than your application is suspicious.`
  },
  {
    id: "docker-freeswitch-integration",
    topic: "Troubleshooting",
    title: "Docker + FreeSWITCH Integration Issues",
    keywords: ["docker", "permissions", "tmp", "freeswitch user", "volume", "0700", "0777", "chmod", "Cannot record", "playback silent"],
    content: `# Docker + FreeSWITCH Integration

## File Permission Mismatch

When your application runs in Docker (as root) and FreeSWITCH runs on the host
(as user \`freeswitch\`), shared files have permission problems.

### Symptoms
- \`uuid_record\` returns \`-ERR Cannot record session!\` (can't write to directory)
- \`execute playback /path/to/file.wav\` plays silence (can't read file)
- No error messages — FS fails silently on file access

### Root Cause
Node.js \`fs.mkdtemp()\` creates directories with mode 0700 (owner-only).
\`fs.writeFile()\` with \`{ mode: 0o600 }\` creates owner-only files.

Docker root (UID 0) owns these. FreeSWITCH user \`freeswitch\` (UID != 0) can't access them.

### Fix
\`\`\`javascript
// After mkdtemp, make directory world-accessible
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'prefix-'));
await fs.chmod(dir, 0o777);

// Write files as world-readable
await fs.writeFile(filePath, data, { mode: 0o644 });
\`\`\`

## Shared /tmp Volume

If FS is on the host and the API is in Docker, they need a shared filesystem
for TTS audio files and recordings:
\`\`\`bash
docker run -v /tmp:/tmp ...
\`\`\`

## Network Mode

For ESL access, the Docker container needs to reach localhost:8021.
Use \`--network host\`:
\`\`\`bash
docker run --network host -v /tmp:/tmp ...
\`\`\`

## Checking FS User
\`\`\`bash
ps aux | grep freeswitch
# freeswi+  249815 /usr/bin/freeswitch -u freeswitch -g freeswitch
\`\`\`

The \`-u freeswitch -g freeswitch\` flags mean FS drops root privileges after startup.`
  },
  {
    id: "uuid-broadcast-vs-execute",
    topic: "ESL",
    title: "uuid_broadcast vs execute playback — When to Use Which",
    keywords: ["uuid_broadcast", "execute", "playback", "sendmsg", "aleg", "bleg", "queue", "depth", "IVR"],
    content: `# uuid_broadcast vs execute playback

## execute playback (sendmsg)

\`\`\`
sendmsg <uuid>
call-command: execute
execute-app-name: playback
execute-app-arg: /path/to/file.wav
\`\`\`

- Runs on the **channel thread**
- Queues behind other pending executes
- Increments execute depth
- Channel transitions from CS_PARK to CS_EXECUTE
- The \`command/reply +OK\` returns IMMEDIATELY (before playback starts)
- Other execute commands queue at depth+1

## uuid_broadcast (api)

\`\`\`
api uuid_broadcast <uuid> /path/to/file.wav aleg
\`\`\`

- Is an **api command** but internally creates an execute on the channel
- Specifies which leg: \`aleg\` (read side) or \`bleg\` (write side) or \`both\`
- Returns +OK immediately
- Functionally similar to execute playback but accessible via api syntax

## When to Use Which

### For IVR TTS playback: uuid_broadcast
When you need sequential TTS playback from ESL-controlled code, use uuid_broadcast.
It avoids the sendmsg execute queue depth piling issue.

### For hold music: execute playback
\`execute playback local_stream://moh\` keeps playing until interrupted.
Stop with \`uuid_break\`.

### For recording: uuid_record (api)
\`uuid_record\` is always an api command. It attaches as a media bug and persists
independently of the execute queue.

## The Sleep Problem

After sending any playback command, your application needs to wait for the
audio to finish before sending the next one. But:

- \`execute playback\`: the command/reply comes immediately, not when playback ends
- \`uuid_broadcast\`: same — returns immediately

**You must sleep for the audio duration** (calculated from PCM size + sample rate).
Add a generous buffer (500ms) to account for codec resampling and FS processing.

\`\`\`javascript
const durationMs = (audioData.length / (sampleRate * bytesPerSample)) * 1000;
await sleep(durationMs + 500);
\`\`\``
  }
];
