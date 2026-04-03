# Leigent — Autonomous DeFi Portfolio Agent on X Layer

> Natural language-driven AI agent for intelligent DeFi portfolio management on X Layer.

## What It Does

**Leigent** is an autonomous portfolio manager that:

1. **Understands your financial goals** in plain English — "I want stable income", "grow my portfolio", "keep it safe"
2. **Monitors your X Layer positions** via OnchainOS APIs (wallet balance, DeFi positions, token prices)
3. **Executes intelligent swaps** on X Layer DEX using OnchainOS DEX aggregator (500+ liquidity sources)
4. **Auto-rebalances** when allocations drift beyond thresholds
5. **Reports back** with clear explanations of what it did and why

## Architecture

```
User: "I want stable income"
         │
         ▼
┌─────────────────────┐
│   Agent Brain        │ ← NL intent classification + strategy matching
│  (agent-brain.js)    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Portfolio Manager   │ ← Rebalancing logic + swap orchestration
│ (portfolio-manager.js)│
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  OnchainOS Client    │ ← CLI wrapper (DEX, Wallet, Portfolio APIs)
│ (onchainos-client.js)│
└─────────┬───────────┘
          │
          ▼
    OnchainOS APIs → X Layer DEX → On-chain execution
```

## Key Features

### Natural Language Interface
- `What's my portfolio worth?` → Shows current balances + DeFi positions
- `I want stable income` → Recommends yield strategy with expected APY
- `Swap 10 USDC to OKB` → Executes best-route swap via X Layer DEX
- `Rebalance to 60% OKB, 40% USDC` → Auto-adjusts allocations

### OnchainOS + Uniswap Integration
- **DEX Aggregator**: Routes through 500+ sources, finds best price
- **Agentic Wallet**: All transactions signed via OKX Agentic Wallet
- **Portfolio API**: Tracks cross-protocol DeFi positions
- **Security scanning**: Token safety + contract verification

### Auto-Rebalancing
- Monitors allocation drift every 5 minutes
- Auto-corrects when any asset drifts >5% from target
- Reports all actions to user

## Tech Stack

- **Runtime**: Node.js 18+
- **OnchainOS CLI**: `~/.local/bin/onchainos` ( DEX swap, wallet, portfolio)
- **X Layer**: EVM L2, ~$0.0005/tx, 1s block time
- **Skills**: OpenClaw skill system (`.agents/skills/okx-portfolio-agent/`)

## Quick Start

### Prerequisites
- Node.js 18+
- OnchainOS CLI installed (`curl -fsSL https://raw.githubusercontent.com/okx/onchainos-skills/main/install.sh | sh`)
- X Layer wallet with funds
- OnchainOS API credentials in `~/.config/onchainos.env`

### Install

```bash
git clone https://github.com/YOUR_GITHUB/leigent-portfolio-agent.git
cd leigent-portfolio-agent
npm install
```

### Configure

```bash
# Set your wallet address
export WALLET_ADDRESS=0xYourXLayerAddress

# Verify onchainos CLI works
onchainos wallet status
```

### Run

```bash
# Interactive chat mode
node src/index.js

# Or require it as a module
const { LeigentPortfolioAgent } = require('./src/index');
const agent = new LeigentPortfolioAgent('0xYourAddress');
await agent.chat('What is my portfolio worth?');
```

## Project Structure

```
leigent-portfolio-agent/
├── src/
│   ├── index.js              # Main agent entry point
│   ├── agent-brain.js        # NL understanding + strategy engine
│   ├── portfolio-manager.js  # Position management + rebalancing
│   └── onchainos-client.js   # OnchainOS CLI wrapper
├── skills/
│   └── leigent-portfolio-skill/   # OpenClaw-compatible skill
│       └── SKILL.md
├── scripts/
│   └── demo-swap.js          # Demo swap script
├── docs/
│   └── architecture.md
├── package.json
└── README.md
```

## X Layer Network Info

| Parameter | Value |
|-----------|-------|
| Chain ID | 196 |
| RPC | https://rpc.xlayer.tech |
| Explorer | https://web3.okx.com/explorer/x-layer |
| Gas token | OKB |
| Avg tx fee | ~$0.0005 |
| Block time | ~1s |
| Native swap routing | OKB ↔ USDC ↔ USDT ↔ WOKB |

## OnchainOS Commands Used

| Command | Purpose |
|---------|---------|
| `onchainos swap quote` | Get best swap route + price |
| `onchainos swap execute` | Execute swap end-to-end |
| `onchainos wallet balance` | Query wallet token balances |
| `onchainos defi positions` | Get DeFi lending/staking positions |
| `onchainos token search` | Find token contract addresses |
| `onchainos security token-scan` | Verify token safety |

## Strategy Examples

### Stable Income (3-8% APY)
- 50% USDC (lending/LP)
- 30% USDT (secondary stable)
- 20% OKB (validator staking)

### Balanced Growth (8-20% APY)
- 30% USDC (stable)
- 40% OKB (growth)
- 20% ETH (Ethereum exposure)
- 10% USDT (reserve)

### Aggressive Growth (20-100%+ APY)
- 60% OKB (max exposure)
- 20% ETH (altcoin exposure)
- 20% USDC (war chest for dips)

## License

MIT
