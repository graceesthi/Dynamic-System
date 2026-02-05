# Model Factory - React App

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Features

- 🔧 **Model Editor** - Add/edit/delete variables and relationships
- 🔄 **Loop Detection** - Automatic feedback loop identification (R/B)
- 📊 **Simulation** - Run scenarios with deterministic results
- ⚖️ **Compare** - Side-by-side scenario comparison
- 🎲 **Monte Carlo** - Uncertainty analysis
- 🤖 **AI Extract** - Extract mechanisms from text (simulated)

## Architecture

See `ARCHITECTURE_DEEP_DIVE.md` for design decisions and trade-offs.

## Key Principles

1. **Determinism**: Same model + same params = same results
2. **Change Isolation**: Edit one element, others stay identical
3. **GenAI Boundaries**: AI for extraction/explanation, never simulation
