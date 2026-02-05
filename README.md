#  System Dynamics Model Factory

**A repeatable, AI-augmented system for building system dynamics models**

Built for the AIvancity Industrial AI Course - Final Project

---

##  Project Overview

This project demonstrates a **"model factory"** approach to system dynamics - not just one model, but a systematic, repeatable process for generating models from unstructured inputs.

### Key Question
> How can we build a system that enables rapid, trustworthy generation of system dynamics models for strategic decision-making?

### Target Clients
1. **AeroDyn Systems** (Defense) - AI-enabled lethal weapons strategy
2. **EuroMotion Automotive** - Chip supply chain resilience

---

##  Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MODEL FACTORY PIPELINE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │
│  │   INGEST     │───▶│   EXTRACT    │───▶│   MODEL      │───▶│  SIMULATE │ │
│  │              │    │   (LLM)      │    │              │    │           │ │
│  │ • Documents  │    │ • Variables  │    │ • CLD Gen    │    │ • PySD    │ │
│  │ • Interviews │    │ • Relations  │    │ • Stock-Flow │    │ • Scenarios│ │
│  │ • Reports    │    │ • Loops      │    │ • Validation │    │ • Monte C │ │
│  └──────────────┘    └──────────────┘    └──────────────┘    └───────────┘ │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                      CEO DASHBOARD (Streamlit)                          ││
│  │  • Causal Loop Diagrams • Scenario Explorer • Executive Insights        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

##  Quick Start

### 1. Install Dependencies

```bash
cd model_factory
pip install -r requirements.txt
```

### 2. Run the Dashboard

```bash
streamlit run dashboard/app.py
```

### 3. (Optional) Set API Key for LLM Extraction

```bash
export ANTHROPIC_API_KEY=your_key_here
```

Without the API key, the system runs in demo mode with pre-built models.

---

##  Project Structure

```
model_factory/
├── models.py                    # Core data structures
├── visualization.py             # CLD and chart generation
├── requirements.txt             
│
├── extraction/
│   └── engine.py               # LLM-powered extraction
│
├── simulation/
│   └── engine.py               # Numerical simulation
│
├── dashboard/
│   └── app.py                  # Streamlit main app
│
├── clients/
│   ├── aerodyn/
│   │   └── model.py            # AeroDyn pre-built model
│   └── euromotion/
│       └── model.py            # EuroMotion pre-built model
│
└── data/
    ├── models/                 # Saved models
    └── extractions/            # LLM outputs
```

---

##  Core Components

### 1. Data Models (`models.py`)

```python
@dataclass
class Variable:
    name: str
    var_type: VariableType  # stock, flow, auxiliary, constant
    description: str
    initial_value: float
    ...

@dataclass
class CausalLink:
    source_var: str
    target_var: str
    polarity: Literal["+", "-"]
    mechanism: str
    ...

@dataclass
class FeedbackLoop:
    name: str
    loop_type: LoopType  # reinforcing, balancing
    variables: list[str]
    strategic_implications: str
    ...
```

### 2. LLM Extraction (`extraction/engine.py`)

Four key extraction points:
- **Variable extraction** - Identify stocks, flows, auxiliaries from text
- **Relationship extraction** - Find causal links with polarity
- **Loop detection** - Graph analysis + LLM narrative generation
- **Insight generation** - Executive summaries from simulation results

### 3. Simulation Engine (`simulation/engine.py`)

- Built-in numerical solver (Euler integration)
- Scenario comparison
- Monte Carlo uncertainty analysis
- Pre-defined scenarios for each client

### 4. Dashboard (`dashboard/app.py`)

- Interactive Causal Loop Diagram visualization
- Scenario parameter controls
- Real-time simulation results
- AI-generated insights

---

##  Pre-Built Models

### AeroDyn Systems - Lethal AI Strategy

**Strategic Question:** What happens to long-term business if AeroDyn heavily invests in lethal AI?

**Key Variables:**
- AI Capability (Stock)
- Public Opinion (Stock)
- Regulatory Pressure (Stock)
- Revenue (Stock)
- Market Access (Auxiliary)

**Key Loops:**
- **R1: Growth Engine** - Investment → Capability → Revenue → Investment
- **B1: Regulatory Brake** - Capability → Media → Opinion → Regulation → Market Access ↓

### EuroMotion Automotive - Supply Chain Resilience

**Strategic Question:** How do different safety-stock policies affect production stability and delivery performance?

**Key Variables:**
- Chip Inventory (Stock)
- OEM Satisfaction (Stock)
- Delivery Performance (Auxiliary)
- Backlog (Stock)

**Key Loops:**
- **B1: Inventory Control** - Classic reorder point loop
- **R1: Customer Growth** - Delivery → Satisfaction → Orders → Production
- **B2: Backlog Pressure** - Self-correcting mechanism

---

##  Grading Alignment

| Criterion | Points | Implementation |
|-----------|--------|----------------|
| Architecture & Data Structures | 7 | Clean dataclasses, modular pipeline, JSON serialization |
| GenAI Integration | 7 | 4 LLM touchpoints: extraction, relationships, narratives, insights |
| System Dynamics Adequacy | 4 | Proper CLD, stock-flow distinction, loop classification |
| Trade-off Reflection | 2 | Documented assumptions, limitations, human judgment points |

---

##  Key Trade-offs Documented

### 1. Automation vs. Expert Judgment
LLMs can extract patterns but may miss domain nuances. Human review is essential for:
- Polarity decisions in ambiguous cases
- Loop interpretation and naming
- Boundary decisions (what to include/exclude)

### 2. Model Complexity vs. Usability
- CEOs need 5-10 key variables, not 50
- More variables = more realistic but harder to explain
- Trade-off: insight clarity vs. model fidelity

### 3. Quantification Speed vs. Accuracy
- Quick models with estimated parameters enable fast iteration
- Data-driven calibration takes time but improves reliability
- Trade-off: insights now vs. precision later

### 4. Generalization vs. Specificity
- Generic extraction prompts work across domains
- Domain-specific fine-tuning improves accuracy
- Factory approach sacrifices some depth for repeatability

---

##  Demo Script

1. **"Here's a report about AI ethics in defense"** → Show document upload
2. **"Watch the system extract variables"** → LLM extraction demo
3. **"It identified 3 feedback loops"** → Show CLD visualization
4. **"Let's simulate aggressive AI investment"** → Run scenario
5. **"Here's what the model predicts"** → Show time series graphs
6. **"And the executive summary"** → AI-generated insights
7. **"Now let's try EuroMotion"** → Switch clients, show repeatability

---

##  References

- Sterman, J. (2000). *Business Dynamics: Systems Thinking and Modeling for a Complex World*
- Meadows, D. (2008). *Thinking in Systems: A Primer*


---

##  Author

**Grace Esther** - AI Engineer, AIvancity Paris-Cachan


