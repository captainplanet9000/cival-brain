# Flash Loan Arbitrage Agent

## What It Is
Autonomous agent that scans real DEX prices on Arbitrum mainnet (Uniswap V3 + SushiSwap), calculates net profit after fees, and uses K2.5 LLM to validate each opportunity before execution.

## Status: Active — Built 2026-01-29, needs mainnet execution wiring

## Location
- DEX prices: `src/lib/flash-loans/dex-prices.ts`
- Agent scan API: `src/app/api/flash-loans/agent-scan/route.ts`
- UI: `src/app/dashboard/flash-loans/page.tsx`
- Config: `src/lib/flash-loans/config.ts`

## How It Works
1. **Scan** — Fetches real prices from Uniswap V3 QuoterV2 + SushiSwap Router via raw RPC
2. **Detect** — Calculates spread across 8 configured pairs
3. **Analyze** — Estimates gas costs from real Arbitrum data
4. **LLM Decision** — K2.5 (moonshotai/kimi-k2.5) validates: execute/skip/wait with reasoning + confidence
5. **Execute** — Currently simulated; generates mock tx hash
6. **Log** — Records to Supabase `flash_loan_executions` table
7. **Profit Flow** — Pipes to wallet system via `recordAgentProfit()`

## Token Pairs Scanned
- WETH/USDC, WETH/USDT, WETH/DAI, WETH/WBTC
- ARB/USDC, ARB/WETH, GMX/WETH, LINK/WETH

## Key Technical Details
- Zero ethers.js dependency — all raw ABI encoding
- Arbitrum One mainnet RPC via Alchemy
- Gas estimate: ~300k gas per flash loan arb
- Min profit threshold: configurable (default $1)
- Max gas threshold: configurable (default $5)
- Scan interval: configurable (default 30s)

## What's Real
- DEX price fetching (real on-chain data)
- Gas price fetching (real)
- ETH price derivation (real from Uniswap WETH/USDC pool)
- Spread calculation (real math)
- K2.5 LLM validation (real API call)
- Supabase logging (real)

## What's Simulated
- Flash loan execution (generates fake tx hash)
- No actual smart contract deployed
- No actual token swaps happening

## To Make 100% Real
- [ ] Deploy flash loan smart contract on Arbitrum
- [ ] Wire contract execution via wallet private key
- [ ] Add slippage protection
- [ ] Add MEV protection (Flashbots/private mempool)
- [ ] Real profit tracking with on-chain verification
- [ ] Circuit breaker for losses

## Smart Contract Needed
Aave V3 FlashLoanSimpleReceiver on Arbitrum:
- Borrow from Aave → Swap on DEX A → Swap back on DEX B → Repay Aave + fee
- Aave V3 on Arbitrum: 0x794a61358D6845594F94dc1DB02A252b5b4814aD
