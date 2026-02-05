# Présentation - Model Factory
## System Dynamics pour AeroDyn & EuroMotion

**Grace Esther** | AIvancity - Industrial AI | Février 2026

---

## 🎯 Objectif du Projet

Construire une **"usine à modèles"** - pas un seul modèle, mais un système répétable pour générer des modèles de dynamique des systèmes à partir d'inputs non structurés.

> "We rarely care about a single model... Instead, you're going to design a system to BUILD system dynamics models."
> — Mehdi MOUNSIF

---

## 🏗️ Architecture (7 pts)

```
    INGEST          EXTRACT (LLM)       MODEL            SIMULATE
  ┌─────────┐      ┌─────────────┐    ┌─────────┐      ┌──────────┐
  │Documents│ ───▶ │ Variables   │ ─▶ │ CLD     │ ───▶ │ Scenarios│
  │Interviews│     │ Relations   │    │ Validate│      │ Insights │
  └─────────┘      └─────────────┘    └─────────┘      └──────────┘
                          │                │                 │
                          └────────────────┴─────────────────┘
                                    KNOWLEDGE BASE
```

### Structures de Données Clés

```python
Variable(name, type, description, initial_value, ...)
CausalLink(source, target, polarity, mechanism, ...)
FeedbackLoop(name, type, variables, strategic_implications, ...)
SDModel(name, question, variables, links, loops, assumptions, ...)
```

---

## 🤖 Intégration GenAI (7 pts)

### 4 Points d'Intégration LLM

| Point | Input | Output | Utilité |
|-------|-------|--------|---------|
| **1. Extraction Variables** | Texte brut | Variables typées | Identifier stocks, flows, auxiliaires |
| **2. Extraction Relations** | Texte + Variables | Liens causaux | Polarity, délais, mécanismes |
| **3. Narratives Boucles** | Loop structure | Texte CEO-friendly | Implications stratégiques |
| **4. Génération Insights** | Résultats simulation | Executive summary | Recommandations |

### Exemple Prompt (Variable Extraction)

```
You are a system dynamics expert. Extract variables from text.
For each variable, provide:
- name: clear, measurable name
- var_type: stock/flow/auxiliary/constant
- unit: measurement unit
- description: what this represents
Return ONLY a JSON array.
```

---

## 🔄 Adéquation Dynamique des Systèmes (4 pts)

### Modèle AeroDyn - Stratégie IA Létale

**Question:** Que se passe-t-il si AeroDyn investit massivement dans l'IA létale?

| Boucle | Type | Variables | Implication |
|--------|------|-----------|-------------|
| **R1: Growth Engine** | Reinforcing | Investment → Capability → Revenue | Moteur de croissance |
| **B1: Regulatory Brake** | Balancing | Capability → Media → Opinion → Regulation | Limite naturelle |
| **R2: Reputation Spiral** | Reinforcing | Reputation ↔ Public Opinion | Peut spiraler +/- |
| **B2: Talent Constraint** | Balancing | Capability → Talent Pool | Contrainte cachée |

### Modèle EuroMotion - Résilience Supply Chain

**Question:** Comment les politiques de stock de sécurité affectent-elles la performance?

| Boucle | Type | Variables | Implication |
|--------|------|-----------|-------------|
| **B1: Inventory Control** | Balancing | Inventory → Gap → Orders | Contrôle classique |
| **R1: Customer Growth** | Reinforcing | Delivery → Satisfaction → Orders | Cercle vertueux |
| **B2: Backlog Pressure** | Balancing | Backlog → Delivery → Satisfaction | Auto-correction |

---

## ⚖️ Réflexion sur les Trade-offs (2 pts)

### 1. Automatisation vs. Jugement Expert
- LLM extrait des patterns mais peut manquer des nuances
- Révision humaine essentielle pour: polarité ambiguë, interprétation des boucles, frontières du modèle

### 2. Complexité du Modèle vs. Utilisabilité
- CEO = 5-10 variables clés, pas 50
- Trade-off: clarté des insights vs. fidélité du modèle

### 3. Vitesse vs. Précision de Quantification
- Modèles rapides avec paramètres estimés vs. calibration data-driven
- Trade-off: insights maintenant vs. précision plus tard

### 4. Généralisation vs. Spécificité
- Prompts génériques fonctionnent cross-domain
- Fine-tuning domain-specific améliore la précision
- Approche "factory" sacrifie un peu de profondeur pour la répétabilité

---

## 📊 Démonstration

### Étape 1: Charger un client
```
[Dashboard] → Sélectionner "AeroDyn Systems"
→ Modèle pré-construit avec 17 variables, 23 liens, 4 boucles
```

### Étape 2: Visualiser le CLD
```
[Onglet "Causal Diagram"]
→ Diagramme interactif avec nodes colorés par type
→ Liens positifs (verts) et négatifs (rouges)
```

### Étape 3: Simuler des scénarios
```
[Onglet "Simulate"]
→ Baseline vs "Aggressive AI" vs "Regulation Shock"
→ Graphiques temporels comparatifs
```

### Étape 4: Générer insights
```
[Onglet "Insights"]
→ Executive summary AI-généré
→ Assumptions et limitations documentées
```

### Étape 5: Montrer la répétabilité
```
[Changer client] → "EuroMotion Automotive"
→ Même interface, nouveau modèle
→ Démontre l'approche "factory"
```

---

## 🛠️ Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Data Models | Python dataclasses |
| Extraction | Anthropic Claude API |
| Simulation | Custom Euler solver |
| Visualization | Plotly + NetworkX |
| Dashboard | Streamlit |
| Storage | JSON files |

---

## 📈 Résultats Simulation AeroDyn

| Scénario | AI Capability (t=60) | Revenue (t=60) | Public Opinion |
|----------|---------------------|----------------|----------------|
| Baseline | 947 | 626 | 45 |
| Aggressive AI | 1,200+ | 800+ | 30↓ |
| Cautious Ethical | 600 | 500 | 65↑ |
| Regulation Shock | 700 | 350↓ | 40 |

**Insight clé:** La boucle R1 (Growth) domine à court terme, mais B1 (Regulatory Brake) devient limitante après ~24 mois si l'opinion publique chute sous 40.

---

## 🎓 Ce que j'ai appris

1. **Les modèles sont des outils de pensée**, pas des prédictions exactes
2. **L'explicitation des hypothèses** est aussi importante que le modèle lui-même
3. **Les boucles de rétroaction** révèlent les comportements contre-intuitifs
4. **L'IA générative** peut accélérer l'extraction mais nécessite une validation humaine
5. **La répétabilité** est plus précieuse qu'un seul modèle parfait

---

## 🚀 Pour Aller Plus Loin

- Intégration de données réelles pour calibration
- Multi-run Monte Carlo pour quantifier l'incertitude
- Interface collaborative pour construction de modèles en équipe
- Export vers Vensim/Stella pour utilisateurs experts

---

## Questions?

**Repository:** `/model_factory/`

**Commande pour lancer:**
```bash
cd model_factory
pip install -r requirements.txt
streamlit run dashboard/app.py
```

---

*Merci!*
