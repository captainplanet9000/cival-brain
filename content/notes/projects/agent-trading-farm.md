# Agent Trading Farm System

## What It Is
Multi-agent trading system where autonomous AI agents execute trading strategies, organized into "farms" (groups of agents with shared goals and capital allocation).

## Status: Active — Core infrastructure exists, agents need real execution wiring

## Architecture
```
Farm (strategy group)
├── Orchestration Agent (coordinates)
├── Strategy Agent (decides what to trade)
├── Execution Agent (places orders)
└── Shared wallet + goals
```

## Existing Farms (in Supabase)
1. **Darvas Box Farm Alpha** — Darvas breakout strategy
2. **Williams Alligator Farm** — Williams Alligator indicator
3. **Multi-Strategy Farm** — Combined strategies

## Existing Agents
1. **Darvas Agent Alpha** — trading, active, Farm Alpha
2. **Williams Agent Beta** — trading, active, Williams Farm
3. **Multi-Strat Agent Gamma** — trading, active, Multi-Strategy Farm

## Exchange Connections (Real)
- **Hyperliquid** — API + WebSocket connected, mainnet
- **Binance** — API connected

## Agent Capabilities (from DB schema)
- `agent_capability_profiles` — what each agent can do
- `agent_decisions` — decision history
- `agent_goals` — per-agent goals
- `agent_indicators` — technical indicators used
- `agent_market_data_subscriptions` — what data each agent follows
- `agent_performance` — performance metrics
- `agent_positions` — current positions
- `agent_state` — runtime state
- `agent_thoughts` — LLM reasoning logs
- `agent_trades` — trade execution history
- `agent_trading_permissions` — what they're allowed to trade

## What's Real
- Agent CRUD in Supabase
- Farm-agent relationships
- Hyperliquid/Binance connectors
- Agent state management
- Basic strategy logic (grid bot, etc.)

## What's Mock
- Order execution (console.log)
- P&L calculations (hardcoded)
- Market data on dashboard (Math.random)
- Agent decisions (stubbed)

## Next Steps
- [ ] Wire real order execution via Hyperliquid
- [ ] Implement real P&L tracking from exchange fills
- [ ] Build agent decision loop with LLM
- [ ] Real-time position tracking
- [ ] Risk management / stop losses
