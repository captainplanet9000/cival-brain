# MEMORY.md — Long-Term Memory

## About Anthony
- **Anthony Augustus Lee**, 36, born Oct 15, 1989
- Email: gammawavesdesign@gmail.com
- Founder of Gamma Waves Design Studio (GWDS) — parent company
- **Day job:** Food runner/server at Mother Wolf restaurant (nights)
- **Goal:** Replace restaurant income with GWDS revenue, go full-time
- Cival = family name, 4th generation. Trading is the family business.
- Self-taught everything — 3D, trading, coding, does bootcamps (Roblox etc.)
- Works ALL DAY building, restaurant at night
- Uses every new AI/tech tool that comes out, stays cutting edge
- Uses Higgsfield.ai (https://higgsfield.ai/) for all video generation

## Family
- Cival is Anthony's family name — he's the 4th generation Cival
- Cival Systems named after the family name

## The Cival Systems Flywheel
**Everything is a funnel into trading.** Content, NFTs, products = capital generation → fed into Cival Systems → leveraged trading → compounding returns → more capital → repeat. That's why it's called Cival Systems.

## Revenue Streams
1. **Trading (LIVE)** — Cival Dashboard executing real leveraged trades on Hyperliquid + exchanges. THE END GOAL for all revenue.
2. **TikTok (pre-launch)** — 6 channels, 5 vids/day target, clips DONE via Higgsfield.ai → revenue → trading capital
3. **NFTs (redeploying)** — 400 Club on ETH, contract issues → mint revenue → trading capital
4. **Restaurant (current income)** — Mother Wolf, nights. Income to replace.

## Active Projects (Feb 2026)
- **Cival Dashboard v9** — LIVE, 24/7 autonomous trading at C:\TradingFarm\Cival-Dashboard-v9
  - Current branch: `feature/position-protection` — 20+ commits, clean working tree, NOT pushed yet
  - **8 protection systems integrated**: Portfolio Risk Engine, ATR-based SL/TP, Correlation Manager, Position Scaler, Execution Audit, Position Alerts (Telegram), Profit Securing, Smart Entry (opt-in)
  - **Margin-aware trading**: fetches `withdrawable` from Hyperliquid, 30% per trade cap, manual positions don't block agents
  - **All 6 farms orchestrating 24/7** via OpenRouter → Gemini 2.5 Flash, 60s cycles
  - **First live trades 2026-02-06**: BTC, ETH, SOL positions opened on Hyperliquid mainnet
  - **Farm detail page UI bug**: "Run Orchestration" and individual agent buttons don't show output — needs API route fix
  - Git: 1,800+ source files committed, comprehensive .gitignore added
  - Feature branches to merge later: tweakcn-themes, volatility-targeting, content-pipeline, monitoring-system, trading-improvements, build-errors
- **The 400 Club** — Released on ETH, contract issues, redeploying + metadata redo. PRIORITY: get out ASAP
- **Honey Bunny** — Full motivational video pipeline (Monroe's Motivated Sequence, 6 archetypes, complete)
- **Clay Verse** — 150-episode claymation TikTok series, all prompts DONE
- **Hunni Bunni Kitchen** — 3D cooking TikTok, framework + recipes + music DONE
- **What I Need to Hear** — Affirmation TikTok, scripts DONE
- **3 GWDS TikTok channels** — In development
- **NFT Collections** — Multiple chains (Sonic, Sui, ETH), generative art

## Systems Set Up
- **Todoist** — Task management (API connected, token in TOOLS.md)
- **Obsidian** — Second brain / knowledge base (Local REST API, token in TOOLS.md)
- **Clawdbot** — Personal AI assistant (this instance)
- **PARA Second Brain** — Full structure in Obsidian vault with Todoist sync
- **Symlink** — notes/ → memory/notes/ for full semantic search

## Key Decisions
- 2026-02-01: Set up Todoist + Obsidian integration for Clawdbot
- 2026-02-01: Built PARA second brain in Obsidian vault
- 2026-02-01: First Todoist → Obsidian sync (120+ tasks)
- 2026-02-01: Scanned entire C: drive project structure

## Preferences
- Inline styles on dashboard pages
- Dashboard on port 9005
- Wants real execution, no mock data
- Direct communication, show don't tell
- OK with sub-agents for big tasks

## Lessons Learned
- Remote Supabase silently drops columns that don't exist on insert (no error!) — always verify schema matches code
- `@/lib/supabase/client` exports `supabase` singleton, NOT `createClient` — API routes must use `createClient` from `@supabase/supabase-js` with service role key
- `.gitignore` excludes `public/` — need `git add -f` to force-add public assets like sprite sheets
- `.next` cache holds stale webpack state — delete `.next` + PM2 restart for clean compile after adding new modules
- Windows PowerShell doesn't have -SkipCertificateCheck (use ServicePointManager callback instead)
- Use curl.exe not curl on Windows (aliases to Invoke-WebRequest)
- Use @file for JSON payloads with curl.exe to avoid escaping issues
- Todoist API rate limits aggressively — use temp files and delays
- `@/lib/supabase/client` does NOT export `createClient` — exports `supabase`, `isSupabaseAvailable`, `safeSupabaseQuery`
- `@/lib/supabase-singleton` exports `getSupabase` — use this for getting a Supabase client instance
- Dashboard `.next` cache corruption happens often — clear + restart fixes 500 errors
- 30 agents × 15min cycles = massive memory pressure in dev mode. PM2 with 1.5GB restart threshold stabilizes it
- Web3Provider has dummy WalletConnect project ID — wrapped in error boundary so wallet features degrade gracefully
- Dynamic imports inside agent runCycle loops cause memory leaks — convert to static module-level imports
- Agent batch settings: BATCH_SIZE=2, BATCH_DELAY=120s, INTRA_BATCH=30s (reduced from 5/90s/15s to prevent memory spikes)
- **NEVER `taskkill /F /IM node.exe`** — kills OpenClaw gateway! Only target specific PIDs or ports
- `devtools: { enabled: false }` is INVALID in Next.js 15 — don't use it
- Cloudflared: use system install (`cloudflared` from PATH), NOT the copy at dashboard root (corrupt/wrong arch)
- shadcn v2 oklch pattern: CSS vars store full `oklch(...)` values; tailwind.config.ts uses `var(--xxx)` directly (no wrapping in oklch())
- Web3Provider fix: stub context approach (no hooks at all) — avoids `createWeb3Modal not called` errors, wallet features degrade gracefully
- Supabase remote DB (`vusjcfushwxwksfuszjv.supabase.co`) may be missing expected tables — dashboard needs graceful fallbacks
- **Module-level `let` singletons break in Next.js Turbopack** — MUST use `(globalThis as any)[KEY]` for any service that persists across HMR (execution bridge, monitors, etc.)
- `ENABLE_REAL_TRADING` env var is barely used in code (only `AgentCreationWizard.tsx`) — doesn't actually gate execution
- Flash loan auto-executor has persistent recovery failures (35+ consecutive) — self-healing can't fix it, needs config investigation
- **Hyperliquid order sizes** must be rounded to `szDecimals` from meta endpoint (BTC=5, ETH=4, SOL=2) — raw floats cause "Failed to deserialize" errors
- **Hyperliquid EIP-712 Agent signing** derives a sub-address that must be approved first — direct L1 action signing avoids this requirement
- Always parse Hyperliquid API responses as `.text()` first then `JSON.parse()` — rate limit returns plain "rate limited" text, not JSON
- When multiple farms generate identical signals (6 farms × same BTC buy), **deduplicate by symbol+action** before executing — pick highest confidence
- Flash loan scanner rewrite (Feb 6): round-trip-first, right-sized borrows ($500-$5K), $0.25 min profit — no arb currently exists on Arbitrum Uni↔PCS
- **Hyperliquid coin indices changed!** SOL=5 (NOT 2), ATOM=2, AVAX=6, etc. — always verify against /info meta
- **Hyperliquid L1 signing**: msgpack(action) + nonce(8 bytes BE) + vault_flag → keccak256 → connectionId for phantom agent; chainId=1337; uses @msgpack/msgpack
- **Hyperliquid price formatting**: 5 significant figures → round to (6 - szDecimals) decimal places (matches Python SDK _slippage_price)
- **Raw L1 signing (msgpack + EIP-712 phantom agent) derives WRONG wallet addresses** — use official Hyperliquid SDK for trigger orders instead
- Position monitor's `placeTriggerOrder` was failing silently with "User or API Wallet does not exist" — random addresses each attempt
- **API wallet "Bossman"** authorized on Hyperliquid (0x45a9...6B8) — use for trading, query positions from main wallet (0xAe93...dDa2)
- **2026-02-06: FIRST LIVE TRADES** — BTC, ETH, SOL positions opened on Hyperliquid mainnet via Cival Dashboard

## Infrastructure
- **PM2** manages dashboard with auto-restart at 1.5GB (`ecosystem.config.js` in dashboard root)
- **Cloudflare tunnels** can be opened ephemerally via `cloudflared tunnel --url` — must use `Start-Process` to detach on Windows
- **Services auto-bootstrap** via `instrumentation.ts` on server start: Bridge (5s), Monitor (30s), Orchestrator (60s), Alerts (60s), Profit Securing (30s), Goal Tracker (5min)
- **services-state.json** tracks running service config in `data/` folder
- **Hyperliquid account**: ~$711 (as of 2026-02-07 night), SUI long -$287 unrealized, liq at $0.961, 2.4% away
- Main wallet: `0xAe93892da6055a6ed3d5AAa53A05Ce54ee28dDa2`
- API wallet: `0x45a9A0E3afD0045dDA3095eBC969605c6cc246B8` ("Bossman")
- **30 agents across 6 farms** (Darvas, Williams, Multi-Strat, Elliott, Heikin Ashi, Renko) — 6 orchestrators, 24 support
- **Trade pipeline (working)**: `instrumentation.ts` → `autonomous-trading-loop.ts` (300s/5min) → `farms/orchestrator.ts` (per farm, LLM) → `coordination_scratchpad` → `real-execution-bridge.ts` (15s poll, margin-aware) → Hyperliquid SDK → mainnet → `position-monitor.ts` (30s, ATR SL/TP + scaling + dedup)
- **Cycle interval**: Changed from 60s to 300s on 2026-02-07 to reduce token burn during low-margin holding pattern (revert when margin frees up)
- **LLM**: OpenRouter → `google/gemini-2.5-flash` ($0.15/M in, $0.60/M out), 5-min cache, 10 calls/min
- **Trigger order format**: `t: { trigger: { triggerPx, isMarket: true, tpsl: 'sl'|'tp' } }` with `r: true` (reduce_only)
- **Anthony trades manually alongside agents** — agents must work with available margin, not fight manual positions
- **High-frequency trading style preferred** — many small trades ($0.25-$5 profit each), not few large ones
- **Remote Supabase** (`vusjcfushwxwksfuszjv.supabase.co`) is source of truth — `.env.local` overrides `.env`
- Remote `farms` schema: `farm_id, name, farm_type, is_active, configuration, orchestration_agent_id, total_capital_usdc`
- **Orchestrator writes to both `farm_decisions` AND `agent_thoughts`** — dashboard agent cards read from `agent_thoughts`
- **Farms API** must include `orchestration_agent_id` and `is_active` — stripped fields break agent card filtering
- **Safety limits**: maxPositionUsd=dynamic(30% available margin, cap $150), maxDailyLoss=$75, maxOpenPositions=12, minPositionUsd=$5
- **Alpha Sentinel meme agent** nearly wiped: $150 budget → $1.19 remaining (-99.2%)
- **Tamagotchi pixel art system** built 2026-02-07: 24×24 sprites, 6 characters (Chimp🐒, Chomps🐊, Hoppy🐸, Ribbits🐸, Blocky🧱, Schnoodle🐕‍🦺) with 11 moods × 2-3 frames each. Files: `src/lib/pixel-characters.ts` (138KB), `src/components/agents/PixelCharacter.tsx`
- **Collaborative trading system** built 2026-02-07: Position monitor distinguishes manual vs agent trades via Supabase `trades` table. Orchestrator shows all positions labeled 👤/🤖. Profit Securing DISABLED (was closing manual trades). Agents scale in/out only on their own positions.
- **Trailing TP module** rewritten 2026-02-07: 3 modes (breakeven/trailing/stepped), globalThis state, Supabase persistence
- **Trade journal** wired to auto-record on position close (bridge + monitor)
- **/api/services/status** route created — returns all 7 service statuses

## 400 Club NFT Status
- Contract deployed on ETH mainnet: `0xA2E2eA98302e4Db471d16862468A0AFB0256a589`
- Project files at `C:\fourHundred`, dev files at `C:\Agent400_Dev`
- **Blocker:** metadata has placeholder CIDs — need Pinata upload → `reveal()` → `unpause()`
- Full audit at `C:\Agent400_Dev\400-CLUB-AUDIT.md`
- Estimated 2-4 hours to complete launch
