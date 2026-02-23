# Advanced Agent Chat Features

This branch adds 7 major feature upgrades to the Cival Brain agent chat system.

## 🚀 Features Implemented

### 1. **Graph Memory** 🕸️
Knowledge graph system for agent memories. Entities and concepts are automatically extracted and linked.

- **API Routes:**
  - `POST /api/brain-memories/graph/setup` - Create schema
  - `GET /api/brain-memories/graph` - Retrieve nodes & edges
  - `POST /api/brain-memories/graph` - Create nodes & edges

- **Database:**
  - `memory_nodes` table: id, label, type, metadata, embedding_text
  - `memory_edges` table: id, source_node_id, target_node_id, relationship, weight

- **UI:**
  - Memory Graph sidebar (click 🕸️ button)
  - Force-directed graph visualization (canvas 2D, no dependencies)

- **Behavior:**
  - After each assistant response, entities are auto-extracted
  - Entities are linked based on relationships
  - Runs in background, doesn't block chat

### 2. **Message Coalescing** ✍️
Buffer rapid messages into single LLM calls to save tokens and improve context.

- **Behavior:**
  - Messages sent within 30 seconds are buffered
  - Auto-sends after 3-second pause
  - Explicit Enter sends immediately
  - Visual "typing more..." indicator
  - Coalesced messages show with divider indicator

### 3. **Multi-Agent Tasks** 👥
Tag multiple agents for diverse perspectives or enable Council Mode.

- **Features:**
  - Type `@` to see agent picker
  - Mention multiple agents: `@DataScientist @ContentMarketer what's trending?`
  - Council Mode toggle sends to ALL agents simultaneously
  - Responses shown side-by-side with agent name/emoji
  - Each agent's response is independent

### 4. **Shell Execution** ⚡
Agents can suggest shell commands with one-click execution.

- **API Route:**
  - `POST /api/brain-agents/execute` - Execute commands

- **Security:**
  - Whitelist: git, npm, node, cat, ls, dir, type, echo, pwd, etc.
  - Blacklist: rm -rf, del /s, format, shutdown, etc.
  - Confirmation dialog before execution
  - 30-second timeout, 1MB output buffer

- **Usage:**
  - Agent returns ` ```shell:execute` blocks
  - "Run" button appears with confirmation
  - Output shown in terminal-styled block

### 5. **Headless Browsing** 🌐
Agents fetch and summarize web content on demand.

- **API Route:**
  - `POST /api/brain-agents/browse` - Fetch URL, extract text

- **Features:**
  - Simple HTML-to-text extraction
  - 15-second timeout
  - 10k character limit (truncates longer content)
  - Shows title, URL, content

- **Usage:**
  - Agent returns ` ```browse:url` blocks
  - Auto-fetches and injects content
  - Displayed in collapsible card

### 6. **Smart Model Routing** 🧠
Route questions to different models based on complexity.

- **Models Available:**
  - `anthropic/claude-opus-4-6` - Complex reasoning, code, analysis
  - `anthropic/claude-sonnet-4` - Creative tasks, writing
  - `google/gemini-2.5-flash` - Simple queries, fast responses

- **Auto Mode Logic:**
  - Complex/code/reasoning → Opus
  - Creative/writing → Sonnet
  - Simple/short → Flash

- **UI:**
  - Model selector dropdown in chat header
  - Shows which model answered each message
  - Per-conversation model preference saved

### 7. **Never Forgets** (Persistent Memory) 🧠
Enhanced memory system with importance scoring and auto-extraction.

- **Features:**
  - After each turn, key facts auto-extracted
  - Importance scoring (1-5), only stores 3+
  - Memories tagged with conversation_id and agent_id
  - Pre-loaded into context for relevant conversations
  - "🧠 X memories" indicator in header

- **Behavior:**
  - Extracts facts, decisions, preferences, context
  - Uses fast model (Gemini Flash) for extraction
  - Stored in existing `brain_memories` table
  - Auto-linked to agent and conversation

## 📦 Database Schema Updates

Run setup endpoint to create new tables/columns:

```bash
POST /api/brain-agents/setup-advanced
```

This adds:
- `brain_conversations.model_preference` (TEXT, default 'auto')
- `brain_messages.metadata` (JSONB, stores model info)
- `memory_nodes` table
- `memory_edges` table

## 🎨 UI/UX Highlights

- **Message coalescing**: Shows "typing more..." indicator
- **Memory graph**: Collapsible sidebar with live force-directed graph
- **Model indicator**: Shows which model answered in message metadata
- **Agent mentions**: @-mention system with autocomplete picker
- **Council mode**: One toggle to consult all agents
- **Shell/Browse blocks**: Interactive with run/fetch buttons
- **Memory count**: Shows "🧠 X memories" badge in header

## 🔧 Technical Notes

- All new API routes follow existing patterns
- Uses OpenClaw gateway for LLM calls (`OPENCLAW_GATEWAY_URL`)
- Entity/memory extraction runs in background (doesn't block responses)
- Inline styles only (no new component library dependencies)
- Shell execution uses child_process with security whitelist
- Browsing uses native fetch + simple HTML-to-text parsing

## 🚦 Testing

1. Start app: `npm run dev`
2. Run setup: `POST /api/brain-agents/setup-advanced`
3. Test features:
   - Send multiple rapid messages → should coalesce
   - Type `@` → agent picker appears
   - Toggle Council Mode → all agents respond
   - Ask agent to run `git status` → shell block appears
   - Ask agent to fetch a URL → browse block appears
   - Change model selector → affects next responses
   - Check header → memory count increases

## 🎯 All Features Are Additive

Existing functionality remains unchanged. These features layer on top:
- Original chat works as before
- Memory system enhanced, not replaced
- New API endpoints don't affect existing ones
- UI gracefully degrades if features unavailable

---

**Ready for review!** No breaking changes, fully backwards compatible.
