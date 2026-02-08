# Cival Systems Dashboard (v9)

## What It Is
Full-stack autonomous agent trading platform built with Next.js 15, Supabase, and real blockchain connections on Arbitrum mainnet.

## Status: Active — In Production Development

## Location
`C:\TradingFarm\Cival-Dashboard-v9`

## Tech Stack
- **Frontend:** Next.js 15.4.3, React 18, inline styles (dark theme)
- **Backend:** Next.js API routes, Supabase PostgreSQL
- **Blockchain:** Arbitrum One mainnet, Alchemy RPC
- **AI:** K2.5 (moonshotai/kimi-k2.5) via OpenRouter for agent decisions
- **Auth:** Custom auth provider (currently stubbed)
- **Deployment:** Vercel (civallabs.vercel.app)

## Architecture
```
Dashboard (Next.js) → API Routes → Supabase DB
                    → Arbitrum RPC (Alchemy)
                    → OpenRouter (K2.5 LLM)
                    → Hyperliquid API
                    → Binance API
```

## Key Tabs/Pages
1. **Overview** — Main dashboard summary
2. **Live Trading** — Real-time trading view
3. **Agents** — Agent management, hierarchy, creation
4. **Farms** — Farm management (groups of agents)
5. **Goals** — Profit targets, allocation, auto-compound (REBUILT 2026-01-29)
6. **Vault/Bank** — Cival Systems Bank, full treasury management (REBUILT 2026-01-29)
7. **DeFi Lending** — DeFi protocol connections
8. **Flash Loans** — Flash loan arbitrage with agent system (BUILT 2026-01-29)
9. **Performance** — P&L and performance metrics
10. **Analytics** — Trading analytics
11. **Trades** — Trade history
12. **Settings** — System configuration

## Database (Supabase)
Key tables: farms, agents, goals, wallets, wallet_transactions, vault, fund_flows, flash_loan_executions, trades, positions, market_data, agent_thoughts, agent_trades

## Wallet System (Built 2026-01-29)
Full pipeline: Farm → Agent → Wallet → Goal → Vault → DeFi
- 7 Supabase tables for fund tracking
- On-chain balance reading (ETH/USDC/WETH)
- Fund flow tracking for all capital movements
- Auto-compound profits to goals

## Flash Loan Arbitrage Agent (Built 2026-01-29)
- Scans Uniswap V3 + SushiSwap on Arbitrum
- Real DEX price fetching via raw RPC (no ethers.js)
- K2.5 LLM validates opportunities
- Logs to Supabase, profits pipe to wallet system

## Known Issues (from audit 2026-01-29)
- ~507 files are empty stubs (.backup files contain real code)
- Portfolio values hardcoded at $125K
- Dashboard metrics use Math.random()
- Order placement is console.log('[MOCK]')
- Auth is fake JWT
- Flash loans default to simulation mode

## What Works (Real)
- Hyperliquid & Binance exchange connectors
- Supabase CRUD for all entities
- Agent manager with trading strategies
- Alchemy SDK blockchain integration
- Grid bot calculator
- Flash loan DEX price fetching
- Wallet system + fund flows

## Env Vars
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
- ARBITRUM_RPC_URL (Alchemy)
- OPENROUTER_API_KEY (K2.5)
- HYPERLIQUID credentials
- BINANCE credentials
- ALCHEMY_API_KEY
- ANTHROPIC_API_KEY

## Next Steps
- [ ] Restore 507 .backup files to bring back real implementations
- [ ] Wire real exchange API keys for live trading
- [ ] Switch flash loans from simulation to mainnet execution
- [ ] Replace all hardcoded/mock data with real values
- [ ] Build real authentication
- [ ] Deploy smart contracts for flash loan execution
