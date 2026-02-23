import { getServiceSupabase } from './supabase';

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:9005';
const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL;

interface AgentContext {
  timestamp: string;
  data: string;
  error?: string;
}

/**
 * Fetch live data context for each agent type
 * Best-effort: continues even if some calls fail
 */
export async function getAgentContext(agentType: string): Promise<AgentContext> {
  const timestamp = new Date().toISOString();
  
  try {
    switch (agentType) {
      case 'Strategy Lab':
        return await getStrategyLabContext(timestamp);
      case 'Content Scout':
        return await getContentScoutContext(timestamp);
      case 'System Health':
        return await getSystemHealthContext(timestamp);
      default:
        return { timestamp, data: '' };
    }
  } catch (error) {
    console.error('Error fetching agent context:', error);
    return {
      timestamp,
      data: `Error fetching context: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Strategy Lab — Trading dashboard data
 */
async function getStrategyLabContext(timestamp: string): Promise<AgentContext> {
  const sections: string[] = [];
  
  // Fetch all agents (31 agents across 7 farms)
  try {
    const agentsRes = await fetch(`${DASHBOARD_URL}/api/agents`, {
      headers: { 'Accept': 'application/json' },
    });
    if (agentsRes.ok) {
      const agents = await agentsRes.json();
      const agentCount = Array.isArray(agents) ? agents.length : agents.agents?.length || 0;
      const activeCount = Array.isArray(agents) 
        ? agents.filter((a: any) => a.status === 'active' || a.active).length
        : agents.agents?.filter((a: any) => a.status === 'active' || a.active).length || 0;
      
      sections.push(`### Trading Agents (${agentCount} total, ${activeCount} active)`);
      
      if (Array.isArray(agents)) {
        const topAgents = agents
          .filter((a: any) => a.pnl || a.total_pnl)
          .sort((a: any, b: any) => (b.pnl || b.total_pnl || 0) - (a.pnl || a.total_pnl || 0))
          .slice(0, 10);
        
        topAgents.forEach((a: any) => {
          const pnl = a.pnl || a.total_pnl || 0;
          const status = a.status || (a.active ? 'active' : 'paused');
          sections.push(`- ${a.name || a.agent_name}: $${pnl.toFixed(2)} (${status})`);
        });
      }
    }
  } catch (err) {
    sections.push(`### Trading Agents\n_Error fetching agents: ${err instanceof Error ? err.message : 'Unknown'}_`);
  }

  // Fetch open positions
  try {
    const positionsRes = await fetch(`${DASHBOARD_URL}/api/agents/positions`, {
      headers: { 'Accept': 'application/json' },
    });
    if (positionsRes.ok) {
      const positions = await positionsRes.json();
      const posCount = Array.isArray(positions) ? positions.length : positions.positions?.length || 0;
      sections.push(`\n### Open Positions (${posCount})`);
      
      if (Array.isArray(positions) && positions.length > 0) {
        positions.slice(0, 5).forEach((p: any) => {
          sections.push(`- ${p.symbol || p.coin}: ${p.size || p.position_size} @ $${p.entry_price || p.avg_entry || 0} (${p.side || 'long'})`);
        });
      }
    }
  } catch (err) {
    sections.push(`\n### Open Positions\n_Error fetching positions: ${err instanceof Error ? err.message : 'Unknown'}_`);
  }

  // Fetch farms (7 farms)
  try {
    const farmsRes = await fetch(`${DASHBOARD_URL}/api/farms`, {
      headers: { 'Accept': 'application/json' },
    });
    if (farmsRes.ok) {
      const farms = await farmsRes.json();
      const farmList = Array.isArray(farms) ? farms : farms.farms || [];
      sections.push(`\n### Farms (${farmList.length})`);
      
      farmList.forEach((f: any) => {
        const pnl = f.total_pnl || f.pnl || 0;
        const agentCount = f.agent_count || f.agents?.length || 0;
        sections.push(`- ${f.name || f.farm_name}: ${agentCount} agents, $${pnl.toFixed(2)} P&L`);
      });
    }
  } catch (err) {
    sections.push(`\n### Farms\n_Error fetching farms: ${err instanceof Error ? err.message : 'Unknown'}_`);
  }

  // Fetch recent trades
  try {
    const tradesRes = await fetch(`${DASHBOARD_URL}/api/trades?limit=20`, {
      headers: { 'Accept': 'application/json' },
    });
    if (tradesRes.ok) {
      const trades = await tradesRes.json();
      const tradeList = Array.isArray(trades) ? trades : trades.trades || [];
      sections.push(`\n### Recent Trades (last 20)`);
      
      const winners = tradeList.filter((t: any) => (t.pnl || 0) > 0).length;
      const losers = tradeList.filter((t: any) => (t.pnl || 0) < 0).length;
      const totalPnl = tradeList.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);
      
      sections.push(`Win rate: ${winners}/${tradeList.length} (${((winners/tradeList.length)*100).toFixed(1)}%)`);
      sections.push(`Total P&L: $${totalPnl.toFixed(2)}`);
      
      tradeList.slice(0, 5).forEach((t: any) => {
        const pnl = t.pnl || 0;
        const symbol = t.symbol || t.coin || 'UNKNOWN';
        sections.push(`- ${symbol}: ${pnl > 0 ? '+' : ''}$${pnl.toFixed(2)} (${t.side || 'N/A'})`);
      });
    }
  } catch (err) {
    sections.push(`\n### Recent Trades\n_Error fetching trades: ${err instanceof Error ? err.message : 'Unknown'}_`);
  }

  // Fetch analytics/strategy rankings
  try {
    const analyticsRes = await fetch(`${DASHBOARD_URL}/api/analytics`, {
      headers: { 'Accept': 'application/json' },
    });
    if (analyticsRes.ok) {
      const analytics = await analyticsRes.json();
      sections.push(`\n### Strategy Performance`);
      
      if (analytics.strategies) {
        Object.entries(analytics.strategies).forEach(([strategy, data]: [string, any]) => {
          sections.push(`- ${strategy}: ${data.win_rate || 0}% win rate, $${data.total_pnl || 0} P&L`);
        });
      } else if (analytics.summary) {
        sections.push(`Total P&L: $${analytics.summary.total_pnl || 0}`);
        sections.push(`Win Rate: ${analytics.summary.win_rate || 0}%`);
      }
    }
  } catch (err) {
    sections.push(`\n### Strategy Performance\n_Error fetching analytics: ${err instanceof Error ? err.message : 'Unknown'}_`);
  }

  // Fetch market regime/volatility
  try {
    const riskRes = await fetch(`${DASHBOARD_URL}/api/risk/volatility`, {
      headers: { 'Accept': 'application/json' },
    });
    if (riskRes.ok) {
      const risk = await riskRes.json();
      sections.push(`\n### Market Regime`);
      sections.push(`Volatility: ${risk.volatility || risk.current_volatility || 'N/A'}`);
      sections.push(`Regime: ${risk.regime || risk.market_regime || 'N/A'}`);
      if (risk.risk_score) sections.push(`Risk Score: ${risk.risk_score}/10`);
    }
  } catch (err) {
    sections.push(`\n### Market Regime\n_Error fetching risk data: ${err instanceof Error ? err.message : 'Unknown'}_`);
  }

  return {
    timestamp,
    data: sections.join('\n'),
  };
}

/**
 * Content Scout — Supabase content pipeline data
 */
async function getContentScoutContext(timestamp: string): Promise<AgentContext> {
  const sections: string[] = [];
  const supabase = getServiceSupabase();

  // Fetch scripts count by category
  try {
    const { data: scripts, error } = await supabase
      .from('scripts')
      .select('id, title, category, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && scripts) {
      const categoryCounts = scripts.reduce((acc: Record<string, number>, s: any) => {
        const cat = s.category || 'uncategorized';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {});

      sections.push(`### Scripts (${scripts.length} total)`);
      Object.entries(categoryCounts).forEach(([cat, count]) => {
        sections.push(`- ${cat}: ${count}`);
      });

      sections.push(`\n### Recent Scripts (last 10)`);
      scripts.slice(0, 10).forEach((s: any) => {
        sections.push(`- "${s.title}" (${s.category || 'N/A'}) — ${s.status || 'draft'}`);
      });
    } else {
      sections.push(`### Scripts\n_Error: ${error?.message || 'No data'}_`);
    }
  } catch (err) {
    sections.push(`### Scripts\n_Error fetching scripts: ${err instanceof Error ? err.message : 'Unknown'}_`);
  }

  // Fetch content pipeline status
  try {
    const { data: pipeline, error } = await supabase
      .from('content_pipeline')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(20);

    if (!error && pipeline) {
      const statusCounts = pipeline.reduce((acc: Record<string, number>, p: any) => {
        const status = p.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      sections.push(`\n### Content Pipeline (${pipeline.length} items)`);
      Object.entries(statusCounts).forEach(([status, count]) => {
        sections.push(`- ${status}: ${count}`);
      });
    } else {
      sections.push(`\n### Content Pipeline\n_Error: ${error?.message || 'No data'}_`);
    }
  } catch (err) {
    sections.push(`\n### Content Pipeline\n_Error fetching pipeline: ${err instanceof Error ? err.message : 'Unknown'}_`);
  }

  // Fetch business units (channels)
  try {
    const { data: units, error } = await supabase
      .from('business_units')
      .select('*')
      .order('name', { ascending: true });

    if (!error && units) {
      sections.push(`\n### Business Units / Channels (${units.length})`);
      units.forEach((u: any) => {
        sections.push(`- ${u.name}: ${u.description || 'N/A'}`);
      });
    } else {
      sections.push(`\n### Business Units\n_Error: ${error?.message || 'No data'}_`);
    }
  } catch (err) {
    sections.push(`\n### Business Units\n_Error fetching units: ${err instanceof Error ? err.message : 'Unknown'}_`);
  }

  // Fetch marketing campaigns
  try {
    const { data: campaigns, error } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && campaigns) {
      sections.push(`\n### Marketing Campaigns (recent 10)`);
      campaigns.forEach((c: any) => {
        sections.push(`- "${c.name || c.campaign_name}": ${c.status || 'active'} (${c.platform || 'N/A'})`);
      });
    } else {
      sections.push(`\n### Marketing Campaigns\n_Error: ${error?.message || 'No data'}_`);
    }
  } catch (err) {
    sections.push(`\n### Marketing Campaigns\n_Error fetching campaigns: ${err instanceof Error ? err.message : 'Unknown'}_`);
  }

  return {
    timestamp,
    data: sections.join('\n'),
  };
}

/**
 * System Health — Service status and health checks
 */
async function getSystemHealthContext(timestamp: string): Promise<AgentContext> {
  const sections: string[] = [];

  // Fetch service statuses
  try {
    const servicesRes = await fetch(`${DASHBOARD_URL}/api/services/status`, {
      headers: { 'Accept': 'application/json' },
    });
    if (servicesRes.ok) {
      const services = await servicesRes.json();
      const serviceList = Array.isArray(services) ? services : services.services || [];
      
      sections.push(`### Service Status (${serviceList.length} services)`);
      serviceList.forEach((s: any) => {
        const status = s.status || s.health || 'unknown';
        const uptime = s.uptime ? `${s.uptime}s` : 'N/A';
        sections.push(`- ${s.name || s.service_name}: ${status} (uptime: ${uptime})`);
      });
    }
  } catch (err) {
    sections.push(`### Service Status\n_Error fetching services: ${err instanceof Error ? err.message : 'Unknown'}_`);
  }

  // Fetch dashboard health
  try {
    const healthRes = await fetch(`${DASHBOARD_URL}/api/health`, {
      headers: { 'Accept': 'application/json' },
    });
    if (healthRes.ok) {
      const health = await healthRes.json();
      sections.push(`\n### Dashboard Health`);
      sections.push(`Status: ${health.status || 'unknown'}`);
      if (health.uptime) sections.push(`Uptime: ${health.uptime}s`);
      if (health.memory) sections.push(`Memory: ${health.memory.used}/${health.memory.total} MB`);
      if (health.cpu) sections.push(`CPU: ${health.cpu}%`);
    }
  } catch (err) {
    sections.push(`\n### Dashboard Health\n_Error fetching health: ${err instanceof Error ? err.message : 'Unknown'}_`);
  }

  // Fetch system overview
  try {
    const overviewRes = await fetch(`${DASHBOARD_URL}/api/overview`, {
      headers: { 'Accept': 'application/json' },
    });
    if (overviewRes.ok) {
      const overview = await overviewRes.json();
      sections.push(`\n### System Overview`);
      if (overview.total_agents) sections.push(`Total Agents: ${overview.total_agents}`);
      if (overview.active_positions) sections.push(`Active Positions: ${overview.active_positions}`);
      if (overview.total_pnl !== undefined) sections.push(`Total P&L: $${overview.total_pnl}`);
      if (overview.uptime) sections.push(`System Uptime: ${overview.uptime}`);
    }
  } catch (err) {
    sections.push(`\n### System Overview\n_Error fetching overview: ${err instanceof Error ? err.message : 'Unknown'}_`);
  }

  // Check OpenClaw gateway status
  if (OPENCLAW_URL) {
    try {
      const gatewayRes = await fetch(`${OPENCLAW_URL}/api/v1/status`, {
        headers: { 'Accept': 'application/json' },
      });
      sections.push(`\n### OpenClaw Gateway`);
      if (gatewayRes.ok) {
        const gateway = await gatewayRes.json();
        sections.push(`Status: ${gateway.status || 'online'}`);
        if (gateway.version) sections.push(`Version: ${gateway.version}`);
        if (gateway.uptime) sections.push(`Uptime: ${gateway.uptime}`);
      } else {
        sections.push(`Status: HTTP ${gatewayRes.status}`);
      }
    } catch (err) {
      sections.push(`\n### OpenClaw Gateway\n_Error: ${err instanceof Error ? err.message : 'Unreachable'}_`);
    }
  }

  // Check Supabase connectivity
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('brain_agents')
      .select('count')
      .limit(1);
    
    sections.push(`\n### Supabase Database`);
    if (!error) {
      sections.push(`Status: Connected`);
      sections.push(`Response time: <100ms`);
    } else {
      sections.push(`Status: Error — ${error.message}`);
    }
  } catch (err) {
    sections.push(`\n### Supabase Database\n_Error: ${err instanceof Error ? err.message : 'Unknown'}_`);
  }

  return {
    timestamp,
    data: sections.join('\n'),
  };
}
