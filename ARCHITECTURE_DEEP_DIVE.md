# Model Factory - Architecture & Design Decisions

## 🎯 Core Philosophy

> **"If I change one area of the model, untouched parts stay EXACTLY the same"**

This document explains the architectural choices, their trade-offs, and where GenAI fits (and doesn't).

---

## 1. Data Structure Design

### 1.1 Why This Structure?

```
SDModel
├── variables: Variable[]      # WHAT exists in the system
├── links: CausalLink[]        # HOW things connect
├── loops: FeedbackLoop[]      # EMERGENT patterns (derived, not stored)
└── metadata                   # WHO, WHEN, WHY
```

**Key Decision: Flat arrays, not nested objects**

```python
# ✅ CHOSEN: Flat structure with IDs
variables = [
    { "id": "v1", "name": "AI Capability", "type": "stock", ... },
    { "id": "v2", "name": "Revenue", "type": "stock", ... },
]
links = [
    { "id": "l1", "source": "v1", "target": "v2", "polarity": "+", ... },
]

# ❌ REJECTED: Nested structure
variables = {
    "AI Capability": {
        "influences": {
            "Revenue": { "polarity": "+", ... }
        }
    }
}
```

**Trade-offs:**

| Flat (Chosen) | Nested (Rejected) |
|---------------|-------------------|
| ✅ Easy to add/remove links without touching variables | ❌ Changing a link requires modifying variable object |
| ✅ Variables and links are independent concerns | ❌ Tight coupling |
| ✅ Serialization is trivial | ❌ Circular reference issues |
| ❌ Need to lookup by ID | ✅ Direct access |
| ❌ Referential integrity must be enforced | ✅ Structure enforces it |

**Why flat wins for us:** The professor's requirement - "change one area, others stay same" - is naturally satisfied. Editing a link NEVER touches the variables array.

---

### 1.2 Variable Structure

```python
@dataclass
class Variable:
    id: str                    # Immutable identifier
    name: str                  # Human-readable, can change
    var_type: VariableType     # stock | flow | auxiliary | constant
    
    # Quantification (optional - can be None for qualitative models)
    initial_value: float | None
    min_value: float | None
    max_value: float | None
    unit: str
    
    # Provenance (WHERE did this come from?)
    sources: list[str]         # Document IDs
    confidence: float          # 0-1, how sure are we?
    created_by: str            # "human" | "ai_extraction" | "imported"
    
    # Metadata
    tags: list[str]
    description: str
```

**Design Decisions:**

1. **`id` vs `name` separation**
   - `id` is immutable, used for references
   - `name` can be renamed without breaking links
   - Trade-off: extra indirection, but enables safe refactoring

2. **`var_type` as enum, not free text**
   - Forces explicit classification
   - Simulation engine knows how to handle each type
   - Trade-off: less flexible, but prevents "magic" types

3. **`confidence` field**
   - Tracks epistemic uncertainty
   - AI extractions start at 0.6-0.8, human-validated = 1.0
   - Trade-off: extra cognitive load, but enables uncertainty visualization

4. **`created_by` provenance**
   - Critical for trust: "where did this come from?"
   - Enables filtering: "show me only AI-suggested elements"
   - Trade-off: must maintain discipline to populate it

---

### 1.3 CausalLink Structure

```python
@dataclass
class CausalLink:
    id: str
    source: str               # Variable ID (not name!)
    target: str               # Variable ID
    
    # Qualitative (always required)
    polarity: Literal["+", "-"]
    
    # Quantitative (optional - for simulation)
    strength: float           # 0-1, how strong is the effect?
    delay: int                # months before effect manifests
    
    # For simulation equation generation
    equation_type: str        # "linear" | "saturating" | "threshold" | "custom"
    equation_params: dict     # type-specific parameters
    
    # Provenance
    mechanism: str            # WHY does this relationship exist?
    sources: list[str]
    confidence: float
    created_by: str
```

**Design Decisions:**

1. **Polarity is ALWAYS explicit**
   - No "it depends" - force a choice
   - If truly ambiguous, create two links with different conditions
   - Trade-off: oversimplifies some relationships, but enables loop detection

2. **Strength and delay are SEPARATE from polarity**
   - Polarity = qualitative direction (for CLD)
   - Strength/delay = quantitative (for simulation)
   - You can have a valid CLD without quantification
   - Trade-off: two "levels" of completeness to manage

3. **`mechanism` field is crucial**
   - Not just THAT A→B, but WHY
   - "Revenue increases AI investment BECAUSE higher profits enable R&D budget"
   - Trade-off: requires discipline to fill in, but invaluable for review

4. **`equation_type` for simulation flexibility**
   - Default "linear" works for most cases
   - "saturating" for diminishing returns
   - "threshold" for step changes
   - Trade-off: complexity vs. realism

---

### 1.4 What is NOT Stored: Feedback Loops

```python
# Loops are COMPUTED, not stored
def detect_loops(model: SDModel) -> list[FeedbackLoop]:
    """
    Loops are emergent properties of the graph structure.
    They are DERIVED from variables + links, never stored.
    
    Why? If you edit a link, loops auto-update.
    No sync issues. Single source of truth.
    """
    # ... graph cycle detection algorithm
```

**Critical Decision: Loops are derived, not stored**

| Stored Loops | Derived Loops (Chosen) |
|--------------|------------------------|
| ❌ Can become stale if links change | ✅ Always accurate |
| ❌ Must sync on every edit | ✅ No sync needed |
| ❌ Source of bugs | ✅ Single source of truth |
| ✅ Faster access | ❌ Recomputed each time |
| ✅ Can store human annotations | ❌ Annotations lost on recompute |

**Trade-off mitigation:** We cache loop computation and only recompute when `links` array changes (via hash comparison).

---

## 2. Determinism Guarantees

### 2.1 The Promise

> **"If I run the same model with the same parameters, I get EXACTLY the same results"**

This is non-negotiable for trust.

### 2.2 Where Determinism Lives

```
┌─────────────────────────────────────────────────────────────┐
│                    DETERMINISTIC ZONE                        │
│                                                             │
│   Model Definition ──► Simulation Engine ──► Results        │
│                                                             │
│   - Same model + same params = same output                  │
│   - No randomness in core simulation                        │
│   - Floating point handled consistently                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 NON-DETERMINISTIC ZONE                       │
│                                                             │
│   - Monte Carlo (explicitly random, seeded)                 │
│   - AI Extraction (LLM outputs vary)                        │
│   - User edits (human decisions)                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Simulation Engine Design for Determinism

```python
def run_simulation(model: SDModel, params: dict, seed: int = None) -> SimulationResult:
    """
    DETERMINISTIC simulation.
    
    Rules:
    1. No hidden state - everything from model + params
    2. No random calls (unless Monte Carlo mode with explicit seed)
    3. Order of operations is fixed (alphabetical by variable ID)
    4. Floating point: use Decimal for financial, float64 for others
    """
    
    # Fixed iteration order - alphabetical by ID
    sorted_vars = sorted(model.variables, key=lambda v: v.id)
    
    for t in range(time_steps):
        for var in sorted_vars:  # ALWAYS same order
            # Compute new value based on current state
            # No randomness here
            pass
    
    return result
```

**Key Guarantee:** Two users running the same model JSON will get identical results.

### 2.4 Change Isolation

```python
def edit_link(model: SDModel, link_id: str, changes: dict) -> SDModel:
    """
    Edit a link. ONLY that link changes.
    
    Returns a NEW model (immutability).
    Original model unchanged.
    """
    new_links = [
        {**link, **changes} if link['id'] == link_id else link
        for link in model.links
    ]
    
    return SDModel(
        variables=model.variables,  # UNCHANGED - same reference
        links=new_links,            # NEW array with one modified element
        metadata=model.metadata     # UNCHANGED
    )
```

**The professor's test:** "Change the strength of link L3"
- ✅ Variables array: identical (same object reference)
- ✅ Other links: identical
- ✅ Only L3 is different
- ✅ Loops recomputed (but that's derived, not stored)

---

## 3. Where GenAI Fits (and Doesn't)

### 3.1 The Principle

> **GenAI is for EXTRACTION and EXPLANATION, never for SIMULATION**

```
┌─────────────────────────────────────────────────────────────┐
│                    GenAI APPROPRIATE                         │
│                                                             │
│   Text ──► [LLM] ──► Suggested Variables                    │
│   Text ──► [LLM] ──► Suggested Links                        │
│   Model ──► [LLM] ──► Executive Summary                     │
│   Results ──► [LLM] ──► Insight Narrative                   │
│                                                             │
│   Characteristics:                                          │
│   - Input: unstructured, ambiguous                          │
│   - Output: suggestions (human validates)                   │
│   - Non-deterministic is OK (it's creative work)            │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   GenAI INAPPROPRIATE                        │
│                                                             │
│   ❌ LLM decides simulation equations                       │
│   ❌ LLM runs the simulation                                │
│   ❌ LLM picks parameter values                             │
│   ❌ LLM determines loop types                              │
│                                                             │
│   Why? Non-reproducible, non-auditable, "magic"             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 GenAI Integration Points

#### Point 1: Variable Extraction

```python
async def extract_variables(text: str, context: str) -> list[SuggestedVariable]:
    """
    LLM reads text, suggests variables.
    
    Output is SUGGESTIONS with confidence scores.
    Human must approve before adding to model.
    """
    prompt = """
    Extract system dynamics variables from this text.
    For each, provide:
    - name
    - type (stock/flow/auxiliary)
    - confidence (0-1)
    - evidence (quote from text)
    
    Return JSON array.
    """
    
    response = await claude.complete(prompt + text)
    suggestions = parse_json(response)
    
    # Mark provenance
    for s in suggestions:
        s['created_by'] = 'ai_extraction'
        s['needs_validation'] = True
    
    return suggestions
```

**Why LLM here?** Text is unstructured. Pattern matching would miss nuance. LLM understands "the company's reputation grew" → Stock variable.

**Trade-off:** Non-deterministic outputs. Same text might give slightly different suggestions. THAT'S OK because human validates.

#### Point 2: Mechanism Separation

```python
async def identify_mechanisms(text: str) -> list[Mechanism]:
    """
    LLM identifies distinct causal mechanisms in text.
    
    Key: separate reinforcing vs balancing logic.
    """
    prompt = """
    Identify causal mechanisms in this text.
    For each mechanism:
    - type: "reinforcing" (growth/decline accelerates) or "balancing" (seeks equilibrium)
    - variables involved
    - description
    - quote from text
    """
    
    return await claude.complete(prompt + text)
```

**Why LLM here?** Humans describe mechanisms narratively: "success breeds success" (reinforcing), "the more we grow, the harder it gets" (balancing). LLM can classify these.

#### Point 3: Executive Summary Generation

```python
async def generate_summary(model: SDModel, results: SimulationResult) -> str:
    """
    LLM generates CEO-friendly summary of simulation.
    
    Input: deterministic simulation results
    Output: narrative explanation
    """
    prompt = f"""
    Simulation results for {model.name}:
    
    Key variables at t=60:
    {format_final_state(results)}
    
    Key loops identified:
    {format_loops(detect_loops(model))}
    
    Write a 3-paragraph executive summary:
    1. Main finding
    2. Key risks
    3. Recommended actions
    """
    
    return await claude.complete(prompt)
```

**Why LLM here?** Translation from numbers to narrative. The RESULTS are deterministic; the EXPLANATION is creative.

### 3.3 What GenAI Does NOT Do

```python
# ❌ NEVER DO THIS
def simulate_with_llm(model, params):
    prompt = f"Given this model, what will Revenue be at t=60?"
    return llm.complete(prompt)  # NON-REPRODUCIBLE!

# ❌ NEVER DO THIS  
def determine_loop_type_with_llm(loop):
    prompt = f"Is this loop reinforcing or balancing?"
    return llm.complete(prompt)  # SHOULD BE COMPUTED!

# ✅ INSTEAD
def determine_loop_type(loop: list[CausalLink]) -> str:
    """Deterministic: count negative links"""
    neg_count = sum(1 for link in loop if link.polarity == '-')
    return 'balancing' if neg_count % 2 == 1 else 'reinforcing'
```

**The rule:** If it CAN be computed deterministically, it MUST be.

---

## 4. Trade-off Summary

### 4.1 Flexibility vs. Rigor

| Choice | Flexibility | Rigor | Our Decision |
|--------|-------------|-------|--------------|
| Free-text variable types | High | Low | ❌ Enum types |
| Optional quantification | High | Medium | ✅ Allow qualitative-only |
| Custom equations | High | Low | ⚠️ Limited set of types |
| LLM for everything | High | None | ❌ LLM for extraction only |

### 4.2 Performance vs. Correctness

| Choice | Performance | Correctness | Our Decision |
|--------|-------------|-------------|--------------|
| Cache loops | Fast | Risk of stale | ❌ Recompute (with memoization) |
| Batch updates | Fast | Complex sync | ❌ Single edits |
| Approximate simulation | Fast | Inaccurate | ❌ Proper Euler integration |

### 4.3 Simplicity vs. Expressiveness

| Choice | Simplicity | Expressiveness | Our Decision |
|--------|------------|----------------|--------------|
| Single polarity | Simple | Limited | ✅ Force +/- choice |
| Strength as 0-1 | Simple | Limited | ✅ Normalized scale |
| Delays as integers | Simple | Limited | ✅ Whole months only |
| Multiple equation types | Complex | Rich | ⚠️ 4 types max |

---

## 5. Testing the Guarantees

### Test 1: Determinism

```python
def test_determinism():
    model = create_model()
    params = {"AI Capability": 60}
    
    result1 = run_simulation(model, params)
    result2 = run_simulation(model, params)
    
    assert result1 == result2  # MUST pass
```

### Test 2: Change Isolation

```python
def test_change_isolation():
    model = create_model()
    original_vars = model.variables.copy()
    
    # Edit a link
    new_model = edit_link(model, "l1", {"strength": 0.9})
    
    # Variables unchanged
    assert new_model.variables == original_vars
    
    # Only l1 changed
    for link in new_model.links:
        if link.id != "l1":
            original = find_link(model, link.id)
            assert link == original
```

### Test 3: GenAI Boundary

```python
def test_genai_boundary():
    model = create_model()
    
    # Simulation NEVER calls LLM
    with mock.patch('claude.complete') as mock_llm:
        result = run_simulation(model, {})
        mock_llm.assert_not_called()
    
    # Extraction DOES call LLM
    with mock.patch('claude.complete') as mock_llm:
        mock_llm.return_value = '[]'
        extract_variables("some text")
        mock_llm.assert_called_once()
```

---

## 6. Questions I Can Answer on Friday

1. **"Why flat arrays instead of nested?"**
   → Change isolation. Edit link without touching variables.

2. **"Why are loops not stored?"**
   → Single source of truth. Auto-update when links change.

3. **"Where does GenAI help?"**
   → Extraction (text→structure), explanation (results→narrative). Never simulation.

4. **"How do I know results are reproducible?"**
   → Same model JSON + same params = same output. Simulation is pure function.

5. **"What if I change link L3's strength?"**
   → Only L3 changes. Variables identical. Other links identical. Loops recomputed.

6. **"What are the limitations?"**
   → Polarity must be +/-, delays in whole months, 4 equation types max.

7. **"Why not let LLM determine loop types?"**
   → It's computable! Count negative links. No ambiguity. No hallucination.

---

## 7. What I Would Do Differently With More Time

1. **Version control for models** - Git-like history of changes
2. **Collaborative editing** - Multiple users, conflict resolution
3. **Calibration from data** - Fit parameters to historical data
4. **Sensitivity visualization** - Tornado diagrams
5. **Model comparison** - Diff two models structurally

---

*Grace Esther | AIvancity Industrial AI | February 2026*
