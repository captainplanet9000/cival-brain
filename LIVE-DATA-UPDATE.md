# 🔥 LIVE DATA INTEGRATION — Multi-Agent Chat Update

## What Changed

The 3 specialist agents now fetch **REAL, LIVE DATA** before every message and inject it as context. No more generic responses — every answer is backed by current, actual data from your systems.

## How It Works

### Before (System Prompts Only)
```
User: "How are my trades doing?"
Agent: "I can help analyze your trades..." (generic)
```

### After (Live Data Injected)
```
User: "How are my trades doing?"

[Agent fetches live data from dashboard APIs]
[Injects: 31 agents, 12 positions, $2,345 total P&L, 65% win rate on last 20 trades]

Agent: "Your 31 agents are currently managing 12 positions with a total P&L of $2,345. 
Win rate on your last 20 trades is 65% (13 wins, 7 losses). Your top performer is 
Agent_Darvas_BTC with +$890 today. Let me break down the key stats..."
```

## Data Sources by Agent

### 🔬 Strategy Lab (Trading Dashboard)
**Fetches from `http://localhost:9005/api/` before EVERY message:**

| Endpoint | Data |
|----------|------|
| `/agents` | All 31 agents, status, individual P&L |
| `/agents/positions` | Current open positions (symbol, size, entry, PnL) |
| `/farms` | 7 farms, performance, agent counts |
| `/trades?limit=20` | Recent trade history, win rate, total P&L |
| `/analytics` | Strategy rankings, performance by type |
| `/risk/volatility` | Market regime, volatility, risk scores |

**Example context injected:**
```markdown
## LIVE DATA (as of 2026-02-23T00:35:12.345Z)

### Trading Agents (31 total, 28 active)
- Agent_Darvas_BTC: $890.50 (active)
- Agent_Williams_ETH: $654.20 (active)
- Agent_Renko_SOL: $432.10 (active)
...

### Open Positions (12)
- BTC: 0.5 @ $45,230 (long)
- ETH: 2.0 @ $2,340 (long)
...

### Recent Trades (last 20)
Win rate: 13/20 (65.0%)
Total P&L: $2,345.67
```

### 📡 Content Scout (Content Pipeline)
**Queries Supabase directly before EVERY message:**

| Table | Data |
|-------|------|
| `scripts` | Count by category, recent 10 scripts |
| `content_pipeline` | Status distribution (draft/review/published) |
| `business_units` | All 6 TikTok channels, descriptions |
| `marketing_campaigns` | Active campaigns, platforms, status |

**Example context injected:**
```markdown
## LIVE DATA (as of 2026-02-23T00:35:12.345Z)

### Scripts (47 total)
- tiktok: 23
- youtube: 15
- instagram: 9

### Recent Scripts (last 10)
- "Honey Bunny Morning Routine" (tiktok) — published
- "Clay Verse Tutorial #5" (youtube) — review
...

### Content Pipeline (32 items)
- draft: 18
- review: 8
- published: 6

### Business Units / Channels (6)
- Honey Bunny: Lifestyle & wellness content
- Clay Verse: Art & creativity tutorials
...
```

### 🏥 System Health (Infrastructure Monitoring)
**Checks infrastructure before EVERY message:**

| Source | Data |
|--------|------|
| Dashboard `/api/services/status` | 7 service statuses, uptimes |
| Dashboard `/api/health` | Memory, CPU, uptime |
| Dashboard `/api/overview` | System-wide metrics |
| OpenClaw gateway | Gateway status, version |
| Supabase | DB connectivity, response time |

**Example context injected:**
```markdown
## LIVE DATA (as of 2026-02-23T00:35:12.345Z)

### Service Status (7 services)
- trading-engine: online (uptime: 3600s)
- risk-manager: online (uptime: 3600s)
- data-pipeline: online (uptime: 3600s)
...

### Dashboard Health
Status: online
Uptime: 3600s
Memory: 256/512 MB
CPU: 12%

### OpenClaw Gateway
Status: online
Version: 2.1.0
```

## Implementation Details

### New File: `src/lib/agent-context.ts`
Contains `getAgentContext(agentType: string)` function that:
1. Identifies agent type (Strategy Lab, Content Scout, System Health)
2. Fetches relevant data from multiple sources
3. Formats as markdown
4. Returns timestamped context string

**Error handling**: Best-effort. If a call fails, shows error message but continues with other data.

### Modified: `src/app/api/brain-agents/[id]/chat/route.ts`
Now calls `getAgentContext()` before proxying to OpenClaw:

```typescript
// Fetch live data for this agent
const context = await getAgentContext(agent.name);

// Inject into system prompt
const enhancedSystemPrompt = `${agent.system_prompt}

## LIVE DATA (as of ${context.timestamp})

${context.data}

---

Use this live data to provide accurate, current answers.`;
```

### Environment Variable Required

Add to `.env.local`:
```bash
DASHBOARD_URL=http://localhost:9005
```

**Default**: Falls back to `http://localhost:9005` if not set.

## Benefits

✅ **Accurate Answers** — Agents reference REAL numbers, not generic advice
✅ **Current State** — Data fetched fresh before every message
✅ **No Hallucination** — AI has actual data to work with
✅ **Specific Insights** — "Your Darvas strategy is outperforming Williams by 23%"
✅ **Actionable** — "Your top 3 agents are using 80% of capital — consider rebalancing"

## Testing

1. **Run both services**:
   ```bash
   # Terminal 1: Dashboard API
   cd dashboard && npm start  # Should run on port 9005
   
   # Terminal 2: Second Brain
   cd second-brain && npm run dev  # Runs on port 3333
   ```

2. **Chat with Strategy Lab**:
   - "Show me my top performing agents"
   - "What's my current P&L?"
   - "How's the Darvas strategy doing?"
   
   → Agent should cite specific numbers from live data

3. **Chat with Content Scout**:
   - "How many scripts are in the pipeline?"
   - "What's our most active channel?"
   - "Show me recent campaigns"
   
   → Agent should reference actual Supabase data

4. **Chat with System Health**:
   - "Is everything running?"
   - "Check dashboard health"
   - "What's our uptime?"
   
   → Agent should report real service statuses

## Error Handling

If dashboard API is down:
- Strategy Lab shows: `_Error fetching agents: ECONNREFUSED_`
- Agent still responds using available data
- User gets partial context instead of nothing

If Supabase is down:
- Content Scout shows: `_Error: relation "scripts" does not exist_`
- Agent explains the issue

**Best-effort approach**: Never crash, always try to respond.

## Performance

- **Latency**: Adds ~200-500ms per message (parallel fetches where possible)
- **Caching**: Could add Redis caching later if needed
- **Rate Limiting**: Dashboard API should handle ~1 req/sec easily

## Future Enhancements

- [ ] Cache data for 30s to reduce API calls
- [ ] Real-time streaming updates via WebSocket
- [ ] Historical data comparison ("P&L today vs yesterday")
- [ ] Proactive alerts ("Win rate dropped below 60%")
- [ ] Agent-triggered actions ("Deploy this strategy to production")

## Example Conversations

### Strategy Lab
```
User: What should I optimize next?

Agent: Based on your live data, here's what I recommend:

1. **Rebalance capital allocation** — Your top 3 agents (Darvas_BTC, Williams_ETH, 
   Renko_SOL) are using 80% of capital but generating 95% of profits. Consider 
   increasing their allocation.

2. **Pause underperformers** — Agent_Elliott_DOGE and Agent_Multi_LTC have -$156 
   combined P&L over 20 trades. Their win rates (35%, 40%) are below your 50% threshold.

3. **Volatility adjustment** — Current market regime shows HIGH volatility (risk score: 7/10). 
   Your Darvas and Williams strategies perform best in this environment, while Renko 
   struggles. Consider pausing Renko agents until volatility drops.

Current stats (as of 00:35:12 UTC):
- 31 agents, 28 active
- 12 open positions
- Total P&L: $2,345.67 (+12.3% today)
- Win rate: 65% (last 20 trades)
```

### Content Scout
```
User: What should we post today?

Agent: Based on your content pipeline, I suggest:

1. **Honey Bunny** (23 scripts total, 5 ready) — "Morning Routine" video is ready and 
   aligned with trending #morningroutine2026 hashtag (2.3M views this week). Post at 
   7 AM for max engagement.

2. **Clay Verse** (15 scripts, 3 in review) — Tutorial #5 is in review but missing 
   final edits. Rush this — clay art is trending up 40% on TikTok this week.

3. **Hunni Bunni Kitchen** (9 scripts, 2 published) — Last post was 3 days ago. 
   Engagement drops after 2 days of silence. Schedule "Quick Breakfast" video ASAP.

Pipeline status:
- 18 drafts (need review)
- 8 in review (need approval)
- 6 published this week
- Next campaign: Valentine's Day series (starts Feb 10)
```

### System Health
```
User: Is everything healthy?

Agent: System status: ✅ All nominal

**Services (7/7 online)**
- trading-engine: ✅ online (1h uptime)
- risk-manager: ✅ online (1h uptime)
- data-pipeline: ✅ online (1h uptime)
- market-data: ✅ online (1h uptime)
- execution-api: ✅ online (1h uptime)
- analytics: ✅ online (1h uptime)
- dashboard: ✅ online (1h uptime)

**Dashboard Health**
- Memory: 256/512 MB (50% utilization)
- CPU: 12% (well within limits)
- Uptime: 3600s (1 hour since last restart)

**OpenClaw Gateway**
- Status: ✅ online
- Version: 2.1.0
- Response time: <50ms

**Supabase Database**
- Status: ✅ Connected
- Response time: <100ms
- No errors in last hour

No issues detected. System performing normally.
```

---

## Git Commit

**Commit**: `b2e4efd` — Add live data integration for multi-agent chat system

**Files Changed**:
- `src/lib/agent-context.ts` (NEW, 460 lines) — Data fetching logic
- `src/app/api/brain-agents/[id]/chat/route.ts` (MODIFIED) — Inject live data
- `BUILD-SUMMARY.md` (UPDATED) — Document live data sources
- `MULTI-AGENT-SETUP.md` (UPDATED) — Explain data flow

## Environment Setup

**Required**: Add to `.env.local`:
```bash
DASHBOARD_URL=http://localhost:9005
```

**Optional**: If dashboard runs on different port, update the URL.

---

**Status**: ✅ Complete and ready to test with live dashboard data
