# Multi-Agent Coordination Patterns for Autonomous Trading Systems

**Research Report — February 3, 2026**
*Category: Agent Systems / Architecture*

---

## Executive Summary

You just built an autonomous trading orchestrator. It works, agents execute, the system runs 24/7. But here's the gap: **your agents are working in parallel, not together**. They don't share insights, don't learn from each other's wins and losses, and can't coordinate on market-wide opportunities.

This report covers the cutting-edge patterns for making multi-agent systems *actually* intelligent — not just concurrent. The goal: transform your orchestrator from "multiple independent agents" into "a trading team that learns and adapts collectively."

---

## The Current State: What You Have

Based on your `autonomous-trading-coordinator.ts`:
- ✅ Master orchestration with start/stop control
- ✅ Farm signal broadcasting to agents
- ✅ Individual agent loops with decision cycles
- ✅ Health checks and auto-recovery
- ✅ Goal tracking with milestones

What's missing:
- ❌ Agents can't ask each other questions
- ❌ No shared memory of what's working across agents
- ❌ No specialization hierarchy (all agents are peers)
- ❌ Agents don't learn from collective experience
- ❌ No market-wide coordination (agents might take opposing positions)

---

## Pattern 1: Shared Scratchpad Architecture

**The Concept:** All agents write to and read from a shared "scratchpad" — a real-time feed of decisions, observations, and outcomes.

**How It Works:**
```typescript
interface SharedScratchpad {
  observations: MarketObservation[];      // "BTC forming higher lows"
  decisions: AgentDecision[];             // "I'm going long BTC with 70% confidence"
  outcomes: TradeOutcome[];               // "Long BTC hit TP at +4.2%"
  signals: CrossAgentSignal[];            // "WARNING: I see divergence on ETH"
}
```

**Benefits:**
- Agent A sees that Agent B just took a BTC long → can avoid doubling exposure
- Agent C sees Agent A's observation about BTC higher lows → factors it into ETH correlation analysis
- Failed trades immediately visible to all agents → collective learning

**Implementation for Cival:**
Add a `coordinator.scratchpad` that agents read/write to during their decision loops. Broadcast new entries via your existing farm sync mechanism.

---

## Pattern 2: Delegation and Question-Asking

**The Concept:** Agents can delegate work and ask questions to teammates with specific expertise.

From CrewAI's collaboration system (now widely adopted):
- **Delegate Work Tool**: Assign subtasks to specialists
- **Ask Question Tool**: Query another agent's expertise

**Trading Application:**
```typescript
// Before entering a trade, agent asks the correlation specialist
const correlationCheck = await askAgent('correlation-agent', {
  question: 'What is current BTC/ETH correlation and net directional exposure?',
  context: { proposedTrade: { symbol: 'ETH', side: 'long', size: 0.1 } }
});

if (correlationCheck.warning) {
  // Reduce size or skip trade
}
```

**Why This Matters:**
Your `correlation-manager.ts` is currently rule-based (max 60% net directional). But what if agents could *negotiate*? "Hey correlation agent, I have a high-conviction ETH signal, can I exceed the limit if I reduce my BTC position?"

**Implementation:**
Add `askAgent(agentId, query)` and `delegateTask(agentId, task)` methods to your agent interface. Route through the coordinator.

---

## Pattern 3: Hierarchical vs. Flat Organization

**Flat (Current):**
```
Orchestrator
    ├── Agent A (BTC)
    ├── Agent B (ETH)
    ├── Agent C (SOL)
    └── Agent D (MEME)
```
Every agent is a peer. Orchestrator just starts/stops them.

**Hierarchical (Upgraded):**
```
Portfolio Manager (Supervisor Agent)
    ├── Macro Team Lead
    │   ├── BTC Agent
    │   └── ETH Agent
    ├── Alt Team Lead
    │   ├── SOL Agent
    │   └── High-Cap Alts
    └── Degen Team Lead
        ├── MEME Agent
        └── New Listings Scout
```

**Why Hierarchical Works:**
- **Supervisor agents** can override individuals ("Stop all longs, macro is risk-off")
- **Team leads** coordinate within their domain (Alt Team Lead balances SOL vs AVAX exposure)
- **Specialists** focus on execution without worrying about portfolio-level concerns

**The Meta-Insight from LangGraph:**
> "A supervisor can also be thought of as an agent whose tools are other agents."

Your `autonomous-trading-coordinator.ts` is already a proto-supervisor. Upgrade it to make decisions, not just orchestrate.

---

## Pattern 4: Collective Memory and Learning

**The Problem:** Each agent has its own scratchpad. When Agent A learns that "fading FOMC moves works," that knowledge dies with its session.

**Solution: Shared Episodic Memory**

```typescript
interface CollectiveMemory {
  patterns: {
    pattern: string;           // "FOMC fade"
    confidence: number;        // 0.73
    lastTested: Date;
    outcomes: { win: number; loss: number; };
    contributingAgents: string[];
  }[];
  
  marketRegimes: {
    detected: string;          // "risk-off"
    since: Date;
    winningStrategies: string[];
    losingStrategies: string[];
  };
}
```

**How Agents Use It:**
1. Before trading, agents query collective memory: "What patterns are working in this regime?"
2. After trades close, outcomes feed back into memory
3. Periodically (daily?), a "meta-learning" pass identifies new patterns from collective data

**Implementation:**
Your `self-evaluator.ts` already does this per-agent. Create a `collective-evaluator.ts` that:
- Aggregates all agent evaluations
- Identifies cross-agent patterns
- Updates shared memory
- Broadcasts learnings back to agents

---

## Pattern 5: Conflict Resolution and Consensus

**The Scenario:** Agent A wants to long BTC. Agent B (using different signals) wants to short BTC.

**Current Behavior:** Both execute. You end up with a net-zero position paying fees on both sides. Dumb.

**Better Approaches:**

**A. First-Mover Wins:**
```typescript
if (hasExistingPosition('BTC')) {
  // Don't allow opposing positions on same asset
  return null;
}
```

**B. Confidence-Weighted:**
```typescript
const existingPosition = getPosition('BTC');
if (existingPosition && proposedSide !== existingPosition.side) {
  if (myConfidence > existingPosition.agentConfidence + 0.2) {
    // Close existing, open new
    await closePosition(existingPosition);
    return executeNew();
  }
  return null; // Not confident enough to override
}
```

**C. Supervisor Decision:**
```typescript
const conflictResolution = await supervisor.resolveConflict({
  existing: existingPosition,
  proposed: { agent: myId, signal: mySignal, confidence: myConfidence },
  marketContext: getCurrentMarketContext()
});
// Supervisor weighs both arguments, makes final call
```

**Recommendation:** Start with (B) confidence-weighted, graduate to (C) when you add a supervisor agent.

---

## Pattern 6: Specialization and Comparative Advantage

**Current:** Every agent does technical analysis → decision → execution.

**Better:** Agents specialize.

```typescript
const agentRoles = {
  'signal-scout': {
    job: 'Scan markets for potential setups',
    outputs: ['potential_setup', 'no_setup'],
    doesNotExecute: true
  },
  'entry-specialist': {
    job: 'Convert setups into precise entry points with limit orders',
    inputs: ['potential_setup'],
    outputs: ['entry_order', 'pass']
  },
  'risk-manager': {
    job: 'Size positions, set stops, manage exposure',
    inputs: ['entry_order'],
    outputs: ['sized_order', 'reject']
  },
  'executor': {
    job: 'Execute orders, monitor fills, handle slippage',
    inputs: ['sized_order'],
    outputs: ['position', 'failed']
  }
};
```

**Why This Wins:**
- Each agent can be tuned for its specific job
- Signal generation is separated from execution (cleaner evaluation)
- Easy to upgrade one component without rewriting everything

This is essentially your existing pipeline (`agent-decision-loop.ts` → `smart-entry.ts` → `position-scaler.ts` → `agent-trading-service.ts`) but made explicit and agent-aware.

---

## Actionable Next Steps

### Immediate (This Week)
1. **Add a Scratchpad Table in Supabase**
   ```sql
   CREATE TABLE agent_scratchpad (
     id UUID PRIMARY KEY,
     agent_id TEXT,
     entry_type TEXT, -- 'observation', 'decision', 'outcome', 'signal'
     content JSONB,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
   Have agents write observations before and after trades.

2. **Add Conflict Detection to Orchestrator**
   Before an agent executes, check if another agent has an opposing position on the same asset. Log conflicts, start measuring frequency.

### Medium-Term (This Month)
3. **Build a Supervisor Agent**
   - Runs every 15 minutes
   - Reviews scratchpad, agent positions, market context
   - Can issue directives: "Reduce all long exposure by 30%"
   - Uses your existing decision loop but with portfolio-level inputs

4. **Collective Memory Service**
   - Aggregate daily outcomes across all agents
   - Identify winning/losing patterns per market regime
   - Feed learnings back into agent prompts/parameters

### Advanced (Q1)
5. **Full Hierarchical Structure**
   - Supervisor → Team Leads → Specialists
   - Team Leads coordinate within their domain
   - Specialists focus on execution quality

---

## Key Insight

Your current system is **multi-process** (multiple agents running in parallel).

The next level is **multi-agent** (multiple agents working as a coordinated team).

The difference is communication, shared memory, and hierarchy. These aren't nice-to-haves — they're the difference between "concurrent execution" and "emergent intelligence."

You've built the infrastructure. Now make it think together.

---

## References

- LangGraph Multi-Agent Workflows (LangChain, 2024)
- CrewAI Collaboration Patterns (docs.crewai.com)
- "Multi-Agent Systems for Finance" — various academic papers
- Anthropic research on agent coordination and tool use

---

*Filed to: notes/resources/*
*Tags: #agents #trading #architecture #multi-agent #coordination*
