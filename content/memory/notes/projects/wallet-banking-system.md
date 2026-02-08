# Wallet & Banking System

## What It Is
Complete fund flow backend connecting farms → agents → wallets → goals → vaults → DeFi lending. The "Cival Systems Bank" is the central treasury for all capital management.

## Status: Active — Backend built 2026-01-29, UI built 2026-01-29

## Components

### Backend (15 files)
- **Migration:** `src/lib/database/wallet-system-migration.ts`
- **Blockchain reader:** `src/lib/blockchain/wallet-reader.ts` (raw RPC, no ethers.js)
- **Wallet service:** `src/lib/services/wallet-service.ts`
- **Fund flow service:** `src/lib/services/fund-flow-service.ts`
- **API routes:** 12 endpoints under `/api/wallets/`, `/api/fund-flows/`, `/api/goals/`, `/api/vaults/`

### Frontend
- **Bank page:** `src/app/dashboard/vault/page.tsx` (45KB, 8 sections)
- Tabs: Accounts, Allocation, Fund Flows, DeFi Yield, Ledger
- Quick Actions: Deposit, Transfer, Deploy to Aave, Emergency Withdraw

### Database Tables
- `wallets` — address, chain, type (hot/cold/vault), ETH/USDC/WETH balances
- `wallet_transactions` — full transaction history
- `fund_flows` — capital movement tracking between all entities
- `vault` — DeFi lending positions (Aave/Compound/Yearn)
- Extended: `farms` (capital fields), `agents` (profit tracking), `goals` (USDC targets, auto-compound)

## Fund Flow Pipeline
```
Farm (capital pool)
  → Agent (allocated capital, executes trades)
    → Wallet (holds assets on-chain)
      → Goal (profit target with allocation %)
        → Vault (DeFi lending for yield)
```

## On-Chain Integration
- Reads ETH balance: `eth_getBalance` via RPC
- Reads ERC20 balances: `balanceOf` for USDC (0xaf88d065e77c8cC2239327C5EDb3A432268e5831) and WETH (0x82aF49447D8a07e3bd95BD0d56f35241523fBab1)
- All on Arbitrum mainnet via Alchemy RPC
- Arbiscan links for transaction hashes

## Wallets in System
- Main wallet: 0xAe93892da6055a6ed3d5AAa53A05Ce54ee28dDa2
- API/Trading wallet: 0x77D66CF22F7F071Cec7524ff7C7e8F9e2d889866

## Next Steps
- [ ] Sync real on-chain balances for both wallets
- [ ] Wire deposit/withdraw to actual on-chain transactions
- [ ] Connect Aave V3 for real DeFi deposits
- [ ] Build auto-compound logic (profits → goals → vaults)
- [ ] Add multi-sig support for large withdrawals
