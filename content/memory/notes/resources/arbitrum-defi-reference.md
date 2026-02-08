# Arbitrum DeFi Reference

## Why Arbitrum
- L2 on Ethereum — fast, cheap gas (~$0.01-0.10 per tx)
- Full EVM compatibility
- Massive DeFi ecosystem
- Flash loans available via Aave V3

## Key Contracts

### Aave V3
- Pool: 0x794a61358D6845594F94dc1DB02A252b5b4814aD
- Flash loan fee: 0.05%
- Supports: USDC, WETH, WBTC, DAI, USDT, ARB

### Uniswap V3
- QuoterV2: 0x61fFE014bA17989E743c5F6cB21bF9697530B21e
- SwapRouter02: 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45
- Factory: 0x1F98431c8aD98523631AE4a59f267346ea31F984
- Fee tiers: 100 (0.01%), 500 (0.05%), 3000 (0.3%), 10000 (1%)

### SushiSwap
- Router: 0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506
- Factory: 0xc35DADB65012eC5796536bD9864eD8773aBc74C4

## Flash Loan Arbitrage Pattern
```
1. Borrow X from Aave V3 (flash loan)
2. Swap X → Y on DEX A (higher price)
3. Swap Y → X on DEX B (lower price)
4. Repay X + 0.05% fee to Aave
5. Keep profit
```

## Gas Estimates (Arbitrum)
- Simple transfer: ~21k gas
- ERC20 transfer: ~65k gas
- Uniswap V3 swap: ~150k gas
- Flash loan + 2 swaps: ~300k gas
- Typical gas price: 0.01-0.1 Gwei

## Useful Links
- Arbiscan: https://arbiscan.io
- Aave V3 Arbitrum: https://app.aave.com/?marketName=proto_arbitrum_v3
- Uniswap on Arbitrum: https://app.uniswap.org
