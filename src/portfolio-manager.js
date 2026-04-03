/**
 * Portfolio Manager — manages on-chain positions and executes trades
 */

const { OnchainOSClient } = require('./onchainos-client');

// Well-known X Layer token addresses
const TOKENS = {
  USDC:  '0x74b7f16337b8972027f6196a17a631ac6de26d22',
  USDT:  '0x779ded0c9e1022225f8e0630b35a9b54be713736',
  WOKB:  '0xe538905cf8410324e03a5a23c1c177a474d59b2b',
  OKB:   '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // native
  WETH:  '0x5e8蟹...', // need to look up
  XLAYER_USDT: '0x1e4a5963abfd975d8c9021ce480b42188849d41d',
};

const DEFAULT_SLIPPAGE = 0.5; // 0.5%

class PortfolioManager {
  constructor(client, walletAddress) {
    this.client = client;
    this.walletAddress = walletAddress;
    this.positions = [];
    this.lastUpdate = null;
  }

  /**
   * Get all token balances for the wallet
   */
  async getBalances() {
    const result = await this.client.getBalance();
    if (!result.ok) return { totalValueUsd: '0', assets: [] };
    
    const data = result.data;
    return {
      totalValueUsd: data.totalValueUsd || '0',
      assets: data.details?.[0]?.tokenAssets || [],
    };
  }

  /**
   * Get all DeFi positions (lending, staking, LP, etc.)
   */
  async getPositions() {
    const result = await this.client.getDeFiPositions(this.walletAddress, [196]);
    if (!result.ok) return [];
    
    const positions = result.data?.details || [];
    this.positions = positions;
    this.lastUpdate = new Date();
    return positions;
  }

  /**
   * Get current allocation percentages
   */
  async getAllocation() {
    const balances = await this.getBalances();
    const total = parseFloat(balances.totalValueUsd);
    if (total === 0) return {};

    const alloc = {};
    for (const asset of balances.assets) {
      const pct = (parseFloat(asset.valueUsd) / total) * 100;
      alloc[asset.tokenSymbol] = parseFloat(pct.toFixed(2));
    }
    return alloc;
  }

  /**
   * Execute a swap between two tokens
   */
  async swap({ fromToken, toToken, amount, slippage = DEFAULT_SLIPPAGE }) {
    const fromAddress = TOKENS[fromToken.toUpperCase()] || fromToken;
    const toAddress = TOKENS[toToken.toUpperCase()] || toToken;

    // Step 1: Get quote
    const quote = await this.client.getSwapQuote({
      fromAddress, toAddress, amount,
    });

    if (!quote.ok) {
      throw new Error(`Quote failed: ${quote.error}`);
    }

    const quoteData = quote.data[0];

    // Step 2: Execute swap
    const exec = await this.client.executeSwap({
      fromAddress, toAddress, amount,
      slippage,
    });

    if (!exec.ok) {
      throw new Error(`Swap execution failed: ${exec.error}`);
    }

    return {
      fromToken,
      toToken,
      fromAmount: amount,
      toAmount: quoteData?.toTokenAmount || 'unknown',
      estimatedGas: quoteData?.estimateGasFee || 'unknown',
      priceImpact: quoteData?.priceImpactPercent || '0',
      txHash: exec.data?.orderId || exec.data?.txHash || 'pending',
      route: quoteData?.router || 'unknown',
    };
  }

  /**
   * Detect allocations that have drifted beyond threshold
   */
  detectImbalances(positions, targetAllocations = {}) {
    // Default targets if not specified
    const defaults = { OKB: 50, USDC: 30, USDT: 20 };
    const targets = { ...defaults, ...targetAllocations };
    
    const imbalances = [];
    const currentAlloc = positions.reduce((acc, p) => {
      const symbol = p.tokenSymbol || 'UNKNOWN';
      acc[symbol] = (acc[symbol] || 0) + parseFloat(p.valueUsd || 0);
      return acc;
    }, {});

    const total = Object.values(currentAlloc).reduce((a, b) => a + b, 0);

    for (const [symbol, targetPct] of Object.entries(targets)) {
      const currentPct = total > 0 ? ((currentAlloc[symbol] || 0) / total) * 100 : 0;
      const drift = Math.abs(currentPct - targetPct);
      
      if (drift > 5) { // 5% threshold
        imbalances.push({ asset: symbol, current: currentPct, target: targetPct, drift });
      }
    }

    return imbalances;
  }

  /**
   * Auto-rebalance: sell overweight, buy underweight
   */
  async autoRebalance(positions, imbalances, threshold = 0.05) {
    const actions = [];
    const balances = await this.getBalances();
    const totalValue = parseFloat(balances.totalValueUsd);
    if (totalValue === 0) return actions;

    const currentAlloc = {};
    for (const asset of balances.assets) {
      currentAlloc[asset.tokenSymbol] = parseFloat(asset.valueUsd || 0);
    }

    for (const imb of imbalances) {
      if (imb.drift * totalValue / 100 < 1) continue; // skip if < $1 drift

      const targetValue = totalValue * (imb.target / 100);
      const currentValue = currentAlloc[imb.asset] || 0;
      const diff = targetValue - currentValue;

      if (Math.abs(diff) < 0.50) continue; // skip tiny adjustments

      // Determine swap needed
      if (diff > 0) {
        // Need more of this asset — find which to sell
        const overAssets = Object.entries(currentAlloc)
          .filter(([sym]) => sym !== imb.asset && currentAlloc[sym] > 0);
        
        if (overAssets.length > 0) {
          const [sellSymbol] = overAssets[0];
          const sellAmount = Math.min(diff * 1.01, currentAlloc[sellSymbol]);
          if (sellAmount > 0.5) {
            const result = await this.swap({
              fromToken: sellSymbol,
              toToken: imb.asset,
              amount: this.usdToTokenAmount(sellSymbol, sellAmount),
            });
            actions.push({ type: 'swap', description: `${sellSymbol} → ${imb.asset}`, result });
          }
        }
      }
    }

    return actions;
  }

  /**
   * Convert USD value to raw token amount (approximate)
   */
  usdToTokenAmount(tokenSymbol, usdValue) {
    // This is approximate; real implementation would fetch live price
    const prices = { USDC: 1, USDT: 1, OKB: 83, WOKB: 83, WETH: 3300 };
    const price = prices[tokenSymbol] || 1;
    const decimals = tokenSymbol === 'USDC' || tokenSymbol === 'USDT' ? 6 : 18;
    return Math.floor((usdValue / price) * Math.pow(10, decimals)).toString();
  }

  /**
   * Execute a complete rebalance to target allocation
   */
  async rebalance(targetAllocations) {
    const positions = await this.getPositions();
    const actions = [];
    
    for (const [symbol, targetPct] of Object.entries(targetAllocations)) {
      const imbalance = positions.find(p => 
        p.tokenSymbol === symbol || p.tokenSymbol === symbol + '(...)'
      );
      
      if (imbalance) {
        const result = await this.swap(imbalance);
        actions.push({ type: 'rebalance', asset: symbol, result });
      }
    }

    return actions;
  }
}

module.exports = { PortfolioManager };
