# Signal Quality Filtering + Kelly Criterion for Trading Agents

**Date:** February 2, 2026  
**Category:** Technical Deep Dive — Trading Agent Optimization  
**Relevance:** Direct application to Cival Systems' 4 Hyperliquid agents

---

## The Problem You're Sitting On

Your Hyperliquid trading data tells a specific story: **32% win rate, 2.7x reward-to-risk ratio, positive expected value — but net negative after fees.** That's not a broken strategy. That's a profitable edge being eaten alive by two things: (1) taking too many low-confidence trades, and (2) sizing positions without regard to signal strength.

You're essentially running four agents that fire on every signal equally. Darvas, Williams, Elliott Wave, Multi-Strat — each one treats a weak setup the same as a strong one. Same position size, same conviction. That's like a poker player going all-in on every hand where they have *any* edge.

## The Fix: Confidence-Weighted Kelly Sizing

### What Is Kelly Criterion?

The Kelly formula tells you the mathematically optimal fraction of your bankroll to bet on each opportunity:

```
f* = (bp - q) / b
```

Where:
- **b** = ratio of average win to average loss (your 2.7x R:R)
- **p** = probability of winning (your 0.32)
- **q** = probability of losing (1 - p = 0.68)

**Your Kelly fraction:** (2.7 × 0.32 - 0.68) / 2.7 = **0.068 (6.8%)**

That means the math says risk ~6.8% of your account per trade. On $700, that's ~$48 max risk per position. But here's where it gets interesting.

### Kelly Is Only as Good as Your Inputs

The formula above uses your *aggregate* win rate. But not all signals are equal. Your Elliott Wave agent probably has different accuracy on strong 5-wave completions vs. ambiguous corrective patterns. Your Darvas agent fires differently on a clean box breakout vs. a messy consolidation.

**The upgrade: give each agent a confidence score per signal, then scale Kelly accordingly.**

### How to Implement This in Cival

#### Step 1: Add a Confidence Classifier to Each Agent

Each of your 4 agents already generates trade signals. Add a `confidence` field (0.0 to 1.0) based on signal characteristics:

**Darvas Agent Alpha:**
- Box duration > 10 candles: +0.2
- Volume spike > 2x average on breakout: +0.3
- Clean box (no false breakouts): +0.2
- Trending market (ADX > 25): +0.2
- Multiple timeframe alignment: +0.1

**Williams Agent Beta:**
- %R divergence present: +0.3
- Confirmation from Williams Alligator: +0.2
- Volume confirmation: +0.2
- Prior support/resistance nearby: +0.2
- No major news event pending: +0.1

**Elliott Wave Trader:**
- Clear 5-wave count (Fibonacci ratios match): +0.3
- Wave 3 is longest: +0.2
- Volume pattern matches wave theory: +0.2
- Timeframe alignment: +0.2
- Not in complex correction: +0.1

**Multi-Strat Gamma:**
- Number of confirming strategies (out of total): proportional score
- All strategies agree: 1.0
- Majority agree: 0.6-0.8
- Split decision: skip trade entirely

#### Step 2: Scale Position Size by Confidence

Instead of flat sizing, use **fractional Kelly**:

```typescript
function calculatePositionSize(
  balance: number,
  confidence: number,  // 0.0 - 1.0
  agentWinRate: number,
  agentRR: number
): number {
  // Agent-specific Kelly
  const kelly = (agentRR * agentWinRate - (1 - agentWinRate)) / agentRR;
  
  // Scale by confidence, use half-Kelly for safety
  const fraction = kelly * confidence * 0.5;
  
  // Floor at 0 (don't trade negative expectancy)
  const safeFraction = Math.max(0, fraction);
  
  // Cap at 10% per trade regardless
  const cappedFraction = Math.min(safeFraction, 0.10);
  
  return balance * cappedFraction;
}
```

**Half-Kelly** is standard practice — full Kelly is mathematically optimal but produces stomach-churning drawdowns. Half-Kelly gives you ~75% of the growth with ~50% of the variance.

#### Step 3: The Signal Filter — Skip Low-Confidence Trades

This is where fees stop eating your edge. Set a **minimum confidence threshold**:

```typescript
const MIN_CONFIDENCE = 0.5;  // Skip anything below this

if (signal.confidence < MIN_CONFIDENCE) {
  logSkippedTrade(signal);  // Track for analysis
  return;  // Don't trade
}
```

**Why this matters for your numbers:** If your 32% win rate is dragged down by marginal trades, filtering to only high-confidence setups could push it to 40-50%. Even at 40% with 2.7x R:R:

```
New Kelly: (2.7 × 0.40 - 0.60) / 2.7 = 0.177 (17.7%)
```

That's a dramatically different edge — and with fewer trades, your fee burden drops proportionally.

#### Step 4: Track and Iterate

Add a `signal_confidence` column to your `trades` table in Supabase. After 100+ trades with confidence data, you can:

1. **Validate the confidence model:** Do high-confidence trades actually win more often?
2. **Optimize the threshold:** Maybe 0.6 is better than 0.5
3. **Per-agent Kelly:** Each agent gets its own win rate and R:R, not the aggregate
4. **Regime awareness:** If an agent's recent win rate drops (last 20 trades), reduce its Kelly allocation automatically

## The Fee Problem — Solved by Fewer, Better Trades

Your data: $807 gross profit, $865 in fees, -$57 net. You made ~2000 fills in 80 days — that's 25 fills/day.

If signal filtering cuts your trade count by 40% (keeping only confidence > 0.5), that's:
- **1,200 fills instead of 2,000**
- **~$519 in fees instead of $865** (proportional)
- **Gross profit likely stays similar or improves** (you're cutting losers disproportionately)
- **Estimated net: +$288** instead of -$57

That's a $345 swing from one change. On a $700 account, that's a 49% improvement in returns.

## Immediate Next Steps

1. **Add `signal_confidence` field** to your agent signal generation (start with simple rules, not ML)
2. **Add `signal_confidence` column** to the Supabase `trades` table
3. **Implement minimum confidence filter** — start at 0.4, raise to 0.5 after a week
4. **Implement Kelly sizing** — use half-Kelly scaled by confidence
5. **Build a confidence analytics view** on the dashboard — scatter plot of confidence vs. P&L per trade
6. **After 2-3 weeks of data:** refine the confidence rules per agent based on actual results

## The Bigger Picture

This is the foundation for something more sophisticated. Once you have confidence scores and outcomes logged, you can:

- Train a simple ML model (logistic regression, even) to predict win probability from signal features
- That model's output probability plugs directly into Kelly as `p`
- Now your agents are genuinely *learning* from their own history
- This is what separates a rule-based bot from an actual autonomous trading system

Your agents already have the strategies. They just need judgment about *when* to use them.

---

**TL;DR:** Your agents have a profitable edge (2.7x R:R) that fees are killing. Add confidence scoring to each signal, filter out weak setups, and size positions using Kelly criterion scaled by confidence. Fewer trades, bigger on the good ones, skip the marginal ones. Estimated impact: turning -$57 net into +$288 net with the same strategies.
