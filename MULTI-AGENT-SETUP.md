# Multi-Agent Chat System Setup

## Overview
The multi-agent chat system replaces the single chat page with a Slack/Discord-style interface featuring 3 specialized AI agents:

- **🔬 Strategy Lab** (Blue) — Trading strategy backtesting and analysis
- **📡 Content Scout** (Amber) — TikTok trend monitoring and content ideas
- **🏥 System Health** (Green) — Infrastructure monitoring and diagnostics

## Setup Steps

### 1. Create Database Tables

Go to Supabase SQL Editor:
https://supabase.com/dashboard/project/vusjcfushwxwksfuszjv/sql/new

Copy and paste the contents of `supabase-migration.sql` and click "Run".

This creates:
- `brain_agents` — The 3 specialist agents
- `brain_conversations` — Chat threads for each agent
- `brain_messages` — Message history

### 2. Seed the Agents

From your terminal or browser, call the seed endpoint:

```bash
curl -X POST http://localhost:3333/api/brain-agents/seed
```

Or open in browser:
http://localhost:3333/api/brain-agents/seed

This will insert the 3 agents into the database.

### 3. Test the Chat Interface

Navigate to:
http://localhost:3333/chat

You should see:
- **Left sidebar**: 3 agent cards (Strategy Lab, Content Scout, System Health)
- **Center panel**: Conversation list (empty at first) with "New Chat" button
- **Right panel**: Chat interface with suggested prompts

### 4. Start Chatting

1. Click on an agent in the left sidebar
2. Click "New Chat" to create a conversation
3. Use the suggested prompts or type your own message
4. Messages are stored in Supabase and persist across sessions

## Architecture

### API Routes Created
- `GET /api/brain-agents` — List all agents
- `GET /api/brain-agents/[id]/conversations` — Get conversations for an agent
- `POST /api/brain-agents/[id]/conversations` — Create new conversation
- `POST /api/brain-agents/[id]/chat` — Send message (proxies to OpenClaw with agent system prompt)
- `GET /api/brain-agents/conversations/[id]/messages` — Get message history
- `POST /api/brain-agents/seed` — Seed the 3 agents (one-time)

### How It Works
1. User selects an agent (left sidebar)
2. User creates or selects a conversation (center panel)
3. User sends a message (right panel)
4. Message is saved to `brain_messages`
5. API proxies to OpenClaw gateway with:
   - Agent's system prompt
   - Conversation history
   - User's message
6. AI response is saved and displayed

### System Prompts
Each agent has a specialized system prompt that defines their expertise:
- **Strategy Lab**: Trading system expert, references `trades` table
- **Content Scout**: Content pipeline expert, references `scripts` table
- **System Health**: Infrastructure monitoring expert

### Design
- Matches existing Cival Brain dark theme (oklch colors)
- Agent accent colors: Blue, Amber, Green
- Chat bubbles use agent color for user messages
- Inline styles (no Tailwind) per Anthony's preference
- Mobile-responsive (stacks vertically)

## Files Modified/Created

### Modified
- `src/app/chat/page.tsx` — Complete rewrite with 3-panel layout

### Created
- `src/app/api/brain-agents/route.ts` — List agents
- `src/app/api/brain-agents/[id]/conversations/route.ts` — Manage conversations
- `src/app/api/brain-agents/[id]/chat/route.ts` — Chat proxy
- `src/app/api/brain-agents/conversations/[id]/messages/route.ts` — Message history
- `src/app/api/brain-agents/seed/route.ts` — Seed agents
- `src/app/api/brain-agents/setup/route.ts` — Setup helper (unused)
- `supabase-migration.sql` — Database schema
- `MULTI-AGENT-SETUP.md` — This file

## Troubleshooting

### Tables not found error
Run `supabase-migration.sql` in Supabase SQL Editor.

### No agents showing up
Call the seed endpoint: `POST /api/brain-agents/seed`

### Gateway offline
Check that OpenClaw gateway is running and accessible at the URL in `.env.local`

### Chat not working
Check browser console and terminal logs. Verify:
- Tables exist in Supabase
- Agents are seeded
- OpenClaw gateway is online
- Service role key is correct in `.env.local`

## Next Steps

Once the basic system is working, you can:
- Add conversation renaming/deletion
- Add agent management (pause/activate agents)
- Add message editing/deletion
- Add file uploads
- Add voice input/output
- Deploy to Vercel (already configured)

## Deployment

The app is already deployed to Vercel. After tables are created and agents are seeded in production Supabase:

```bash
git add .
git commit -m "Add multi-agent chat system"
git push
```

Vercel will auto-deploy. Then call the seed endpoint on production:
https://second-brain-delta-two.vercel.app/api/brain-agents/seed
