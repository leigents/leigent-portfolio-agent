/**
 * Agent Brain — Natural Language Understanding & Response Generation
 * 
 * Uses keyword + pattern matching to classify user intent
 * and generate intelligent portfolio responses.
 */

class AgentBrain {
  constructor() {
    this.strategies = {
      income: {
        name: 'Stable Income',
        description: 'Focus on yield-generating assets like USDC/USDT liquidity provision, lending, or staking OKB for validator rewards.',
        risk: 'Low',
        expectedYield: '3-8% APY',
        allocation: { USDC: 50, USDT: 30, OKB: 20 },
      },
      growth: {
        name: 'Aggressive Growth',
        description: 'Higher exposure to OKB and emerging tokens with compounding potential. Higher risk but higher reward.',
        risk: 'High',
        expectedYield: '20-100%+ APY',
        allocation: { OKB: 60, ETH: 20, USDC: 20 },
      },
      balanced: {
        name: 'Balanced Growth',
        description: 'Mix of stable assets (50%) and growth assets (50%). Good for medium-term holds.',
        risk: 'Medium',
        expectedYield: '8-20% APY',
        allocation: { USDC: 30, OKB: 40, ETH: 20, USDT: 10 },
      },
      safety: {
        name: 'Capital Preservation',
        description: 'Almost entirely in stablecoins to protect principal. Minimal risk, low yield.',
        risk: 'Very Low',
        expectedYield: '2-5% APY',
        allocation: { USDC: 70, USDT: 30 },
      },
    };
  }

  /**
   * Classify user message into intent types
   */
  async understand(message) {
    const msg = message.toLowerCase();

    // ── Status queries ────────────────────────────────────────────────────
    if (this.match(msg, ['portfolio', 'balance', 'worth', 'value', '持仓', '资产', '多少钱'])) {
      return { type: 'status' };
    }

    // ── Goal: Income ──────────────────────────────────────────────────────
    if (this.match(msg, ['income', 'yield', 'stable', 'steady', '利息', '收益', '稳定收入', '赚利息'])) {
      return { type: 'goal_income', params: this.extractAmount(msg) };
    }

    // ── Goal: Growth ──────────────────────────────────────────────────────
    if (this.match(msg, ['grow', 'growth', 'increase', 'multiply', '堆仓', '增长', '放大', '激进'])) {
      return { type: 'goal_growth', params: this.extractAmount(msg) };
    }

    // ── Goal: Safety ──────────────────────────────────────────────────────
    if (this.match(msg, ['safe', 'security', 'preserve', 'protect', '安全', '保守', '保本'])) {
      return { type: 'goal_safety', params: this.extractAmount(msg) };
    }

    // ── Rebalance ─────────────────────────────────────────────────────────
    if (this.match(msg, ['rebalance', '调整', '再平衡', '分配'])) {
      const allocations = this.extractAllocations(msg);
      return { type: 'rebalance', targetAllocations: allocations };
    }

    // ── Swap ──────────────────────────────────────────────────────────────
    if (this.match(msg, ['swap', 'exchange', 'convert', '换', '兑换', '买', '卖'])) {
      const swapParams = this.extractSwapParams(msg);
      return { type: 'swap', params: swapParams };
    }

    // ── Question ──────────────────────────────────────────────────────────
    if (this.match(msg, ['what', 'how', 'why', 'should', 'can i', 'which', '什么', '怎么', '如何', '为什么', '我应该'])) {
      return { type: 'question', raw: message };
    }

    return { type: 'unknown' };
  }

  /**
   * Generate a portfolio status description
   */
  async describePortfolio(positions, balances) {
    const totalValue = parseFloat(balances.totalValueUsd || 0);
    
    if (totalValue === 0) {
      return `Your portfolio is empty (${balances.totalValueUsd || '$0.00'}).\n\nTo get started:\n• Deposit USDC or USDT to your wallet\n• Say "I want to invest $100 in stable income" to begin\n\nYour X Layer wallet: \`${balances.walletAddress || 'unknown'}\``;
    }

    const lines = [`📊 **Portfolio Value: $${totalValue.toFixed(2)}**\n`];
    lines.push('| Asset | Balance | Value |');
    lines.push('|-------|---------|-------|');
    
    for (const asset of balances.assets || []) {
      const name = asset.tokenSymbol || asset.tokenContractAddress?.slice(0, 8) || '?';
      const bal = parseFloat(asset.balance || 0).toFixed(4);
      const val = parseFloat(asset.valueUsd || 0).toFixed(2);
      lines.push(`| ${name} | ${bal} | $${val} |`);
    }

    if (positions.length > 0) {
      lines.push(`\n🏦 **DeFi Positions:** ${positions.length}`);
      for (const pos of positions.slice(0, 3)) {
        lines.push(`  • ${pos.platform || 'Unknown'}: $${parseFloat(pos.valueUsd || 0).toFixed(2)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Suggest an income strategy
   */
  suggestIncomeStrategy(positions, balances, params = {}) {
    const strategy = this.strategies.income;
    return `💰 **Stable Income Strategy**
    
${strategy.description}

**Expected yield:** ${strategy.expectedYield}
**Risk level:** ${strategy.risk}

**Suggested allocation:**
${Object.entries(strategy.allocation).map(([k, v]) => `  • ${v}% ${k}`).join('\n')}

To execute this strategy, I would:
1. Move 50% → USDC (lending/stablecoin LP on X Layer DEX)
2. Move 30% → USDT (secondary stable)  
3. Move 20% → OKB (staking or validator rewards)

Say **"execute this strategy"** to begin.`;
  }

  /**
   * Suggest a growth strategy
   */
  suggestGrowthStrategy(positions, balances, params = {}) {
    const strategy = this.strategies.growth;
    return `🚀 **Aggressive Growth Strategy**
    
${strategy.description}

**Expected yield:** ${strategy.expectedYield}
**Risk level:** ${strategy.risk}

**Suggested allocation:**
${Object.entries(strategy.allocation).map(([k, v]) => `  • ${v}% ${k}`).join('\n')}

⚠️ **Warning:** This strategy carries high risk. Only invest what you can afford to lose.

To execute this strategy, I would:
1. Swap 60% → OKB (high conviction, exchange gas token)
2. Monitor X Layer emerging DeFi opportunities
3. Keep 20% in ETH for Ethereum ecosystem exposure

Say **"execute this strategy"** to begin.`;
  }

  /**
   * Suggest a safety strategy
   */
  suggestSafetyStrategy(positions, balances, params = {}) {
    const strategy = this.strategies.safety;
    return `🛡️ **Capital Preservation Strategy**
    
${strategy.description}

**Expected yield:** ${strategy.expectedYield}
**Risk level:** ${strategy.risk}

**Suggested allocation:**
${Object.entries(strategy.allocation).map(([k, v]) => `  • ${v}% ${k}`).join('\n')}

This strategy minimizes volatility by staying in stablecoins.

To execute this strategy, I would:
1. Convert all assets → USDC/USDT
2. Provide liquidity on X Layer OKX DEX for yield
3. Keep minimal OKB (<5%) for gas fee coverage

Say **"execute this strategy"** to begin.`;
  }

  /**
   * Answer free-form questions
   */
  async answerQuestion(question, positions, balances) {
    const q = question.toLowerCase();
    
    if (q.includes('better') || q.includes('哪个好') || q.includes('recommend')) {
      return `Based on current X Layer conditions:

**OKB** — Best for growth. It's the native gas token with staking yield (~5-10% APY from validators). High utility on X Layer.

**USDC/USDT** — Best for stability. Most liquid stablecoins on X Layer. Good for earning yield without volatility.

**My recommendation:** A 40/40/20 split (OKB/USDC/ETH) gives you growth potential with downside protection.`;
    }

    if (q.includes('gas') || q.includes('fee') || q.includes('手续费')) {
      return `X Layer gas fees are extremely low:
• Average: **~$0.0005 per transaction**
• Swap: ~$0.001-0.01 depending on complexity
• Native x402 payments can cover fees with token rewards

Compare this to Ethereum mainnet ($2-10+) or even Arbitrum ($0.10-0.50).`;
    }

    return `Good question! I don't have a specific answer for "${question}" yet, but I'm learning.

For now, I can help you with:
• Checking your portfolio balance and positions
• Recommending strategy based on your goals
• Executing token swaps on X Layer
• Auto-rebalancing when allocations drift

Try: "What's my portfolio worth?" or "I want stable income"`;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  match(msg, patterns) {
    return patterns.some(p => msg.includes(p));
  }

  extractAmount(msg) {
    // Simple regex for dollar amounts
    const match = msg.match(/\$?(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  }

  extractSwapParams(msg) {
    // "swap 10 USDC to OKB" → { fromToken: 'USDC', amount: '10000000', toToken: 'OKB' }
    const match = msg.match(/(\d+(?:\.\d+)?)\s*(?:USDC|USDT|OKB|ETH|WOKB)/i);
    const tokens = msg.match(/(USDC|USDT|OKB|ETH|WOKB)/gi) || [];
    
    return {
      fromToken: tokens[0]?.toUpperCase() || 'USDC',
      toToken: tokens[1]?.toUpperCase() || 'OKB',
      amount: match ? match[1] : '1',
    };
  }

  extractAllocations(msg) {
    // "rebalance to 60% OKB, 40% USDC" → { OKB: 60, USDC: 40 }
    const alloc = {};
    const matches = msg.matchAll(/(\d+)\s*%\s*(USDC|USDT|OKB|ETH|WOKB)/gi);
    for (const [, pct, token] of matches) {
      alloc[token.toUpperCase()] = parseInt(pct);
    }
    return alloc;
  }
}

module.exports = { AgentBrain };
