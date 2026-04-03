/**
 * Leigent — Autonomous DeFi Portfolio Builder on X Layer
 * 
 * Natural language-driven AI agent that:
 * - Understands portfolio goals (income, growth, safety)
 * - Monitors on-chain positions via OnchainOS
 * - Executes intelligent swaps and rebalancing via OnchainOS DEX
 * - Reports back in plain English
 * 
 * Run: node src/index.js
 */

const { PortfolioManager } = require('./portfolio-manager');
const { AgentBrain } = require('./agent-brain');
const { OnchainOSClient } = require('./onchainos-client');

class LeigentPortfolioAgent {
  constructor(walletAddress) {
    this.walletAddress = walletAddress;
    this.client = new OnchainOSClient();
    this.portfolio = new PortfolioManager(this.client, walletAddress);
    this.brain = new AgentBrain();
    this.conversationHistory = [];
  }

  /**
   * Main loop: listen to user input and respond
   */
  async chat(userMessage) {
    this.conversationHistory.push({ role: 'user', content: userMessage });

    // 1. Understand intent
    const intent = await this.brain.understand(userMessage);
    
    // 2. Fetch current portfolio state
    const positions = await this.portfolio.getPositions();
    const balances = await this.portfolio.getBalances();
    
    // 3. Generate response/action based on intent
    let response;
    let actions = [];

    switch (intent.type) {
      case 'status':
        response = await this.brain.describePortfolio(positions, balances);
        break;
        
      case 'goal_income':
        response = await this.brain.suggestIncomeStrategy(positions, balances, intent.params);
        break;
        
      case 'goal_growth':
        response = await this.brain.suggestGrowthStrategy(positions, balances, intent.params);
        break;
        
      case 'goal_safety':
        response = await this.brain.suggestSafetyStrategy(positions, balances, intent.params);
        break;
        
      case 'rebalance':
        actions = await this.portfolio.rebalance(intent.targetAllocations);
        response = `Executing rebalancing:\n${actions.map(a => `  • ${a.description}`).join('\n')}`;
        break;
        
      case 'swap':
        const result = await this.portfolio.swap(intent.params);
        response = `Swap executed:\n  From: ${result.fromAmount} ${result.fromToken}\n  To: ${result.toAmount} ${result.toToken}\n  TxHash: ${result.txHash}`;
        break;
        
      case 'question':
        response = await this.brain.answerQuestion(userMessage, positions, balances);
        break;
        
      default:
        response = "I'm not sure what you mean. Try saying things like:\n• 'What's my portfolio worth?'\n• 'I want stable income'\n• 'Rebalance to 60% OKB, 40% USDC'\n• 'Swap 10 USDC to OKB'";
    }

    this.conversationHistory.push({ role: 'assistant', content: response });
    return { intent, response, actions };
  }

  /**
   * Autonomous mode: run periodic portfolio management
   */
  async runAutonomous(intervalMs = 300000) { // every 5 min
    console.log(`[Leigent] Autonomous mode started. Checking every ${intervalMs/1000}s`);
    
    setInterval(async () => {
      try {
        console.log(`[${new Date().toISOString()}] Running portfolio check...`);
        const positions = await this.portfolio.getPositions();
        const imbalances = this.portfolio.detectImbalances(positions);
        
        if (imbalances.length > 0) {
          console.log(`[Leigent] Detected ${imbalances.length} imbalances:`);
          for (const imb of imbalances) {
            console.log(`  • ${imb.asset}: ${imb.current}% vs target ${imb.target}%`);
          }
          // Auto-rebalance if drift > 5%
          const rebalanceActions = await this.portfolio.autoRebalance(positions, imbalances, 0.05);
          console.log(`[Leigent] Auto-rebalanced: ${rebalanceActions.length} actions taken`);
        } else {
          console.log(`[Leigent] Portfolio balanced.`);
        }
      } catch (err) {
        console.error(`[Leigent] Error in autonomous loop: ${err.message}`);
      }
    }, intervalMs);
  }
}

module.exports = { LeigentPortfolioAgent };
