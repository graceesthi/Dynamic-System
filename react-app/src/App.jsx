import React, { useState, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, AreaChart, Area } from 'recharts';

// ==================== INITIAL MODEL DATA ====================
const createInitialModel = (type) => {
  if (type === 'aerodyn') {
    return {
      name: "AeroDyn AI Strategy",
      question: "What happens if AeroDyn heavily invests in lethal AI?",
      variables: [
        { id: 'v1', name: "AI Capability", type: "stock", initial: 50, min: 0, max: 200 },
        { id: 'v2', name: "Revenue", type: "stock", initial: 500, min: 0, max: 2000 },
        { id: 'v3', name: "Public Opinion", type: "stock", initial: 50, min: 0, max: 100 },
        { id: 'v4', name: "Regulatory Pressure", type: "stock", initial: 30, min: 0, max: 100 },
        { id: 'v5', name: "Reputation", type: "stock", initial: 60, min: 0, max: 100 },
        { id: 'v6', name: "Market Access", type: "auxiliary", initial: 70, min: 0, max: 100 },
        { id: 'v7', name: "Product Attractiveness", type: "auxiliary", initial: 60, min: 0, max: 100 },
      ],
      links: [
        { id: 'l1', source: "AI Capability", target: "Product Attractiveness", polarity: "+", strength: 0.8, delay: 0 },
        { id: 'l2', source: "Product Attractiveness", target: "Revenue", polarity: "+", strength: 0.6, delay: 1 },
        { id: 'l3', source: "Revenue", target: "AI Capability", polarity: "+", strength: 0.4, delay: 2 },
        { id: 'l4', source: "AI Capability", target: "Public Opinion", polarity: "-", strength: 0.5, delay: 3 },
        { id: 'l5', source: "Public Opinion", target: "Regulatory Pressure", polarity: "-", strength: 0.7, delay: 6 },
        { id: 'l6', source: "Regulatory Pressure", target: "Market Access", polarity: "-", strength: 0.8, delay: 0 },
        { id: 'l7', source: "Market Access", target: "Revenue", polarity: "+", strength: 0.5, delay: 1 },
        { id: 'l8', source: "Reputation", target: "Public Opinion", polarity: "+", strength: 0.4, delay: 2 },
      ],
    };
  }
  return {
    name: "EuroMotion Supply Chain",
    question: "How do safety-stock policies affect delivery performance?",
    variables: [
      { id: 'v1', name: "Chip Inventory", type: "stock", initial: 50000, min: 0, max: 200000 },
      { id: 'v2', name: "OEM Satisfaction", type: "stock", initial: 70, min: 0, max: 100 },
      { id: 'v3', name: "Backlog", type: "stock", initial: 5000, min: 0, max: 50000 },
      { id: 'v4', name: "Market Share", type: "stock", initial: 15, min: 0, max: 50 },
      { id: 'v5', name: "Delivery Performance", type: "auxiliary", initial: 85, min: 0, max: 100 },
      { id: 'v6', name: "Production Rate", type: "flow", initial: 10000, min: 0, max: 20000 },
      { id: 'v7', name: "Safety Stock Target", type: "constant", initial: 4, min: 1, max: 12 },
    ],
    links: [
      { id: 'l1', source: "Chip Inventory", target: "Production Rate", polarity: "+", strength: 0.7, delay: 0 },
      { id: 'l2', source: "Production Rate", target: "Delivery Performance", polarity: "+", strength: 0.6, delay: 1 },
      { id: 'l3', source: "Delivery Performance", target: "OEM Satisfaction", polarity: "+", strength: 0.8, delay: 2 },
      { id: 'l4', source: "OEM Satisfaction", target: "Market Share", polarity: "+", strength: 0.5, delay: 6 },
      { id: 'l5', source: "Backlog", target: "Delivery Performance", polarity: "-", strength: 0.7, delay: 0 },
      { id: 'l6', source: "Safety Stock Target", target: "Chip Inventory", polarity: "+", strength: 0.3, delay: 4 },
    ],
  };
};

// ==================== SIMULATION ENGINE ====================
const runSimulation = (model, paramOverrides = {}, months = 60) => {
  const state = {};
  const history = {};
  const warnings = [];
  
  // Initialize
  model.variables.forEach(v => {
    state[v.name] = paramOverrides[v.name] ?? v.initial;
    history[v.name] = [state[v.name]];
  });
  
  // Build influence map with delays
  const influences = {};
  model.variables.forEach(v => influences[v.name] = []);
  model.links.forEach(l => {
    if (influences[l.target]) {
      influences[l.target].push({ ...l, buffer: Array(l.delay || 0).fill(0) });
    }
  });
  
  // Simulate
  for (let t = 1; t <= months; t++) {
    model.variables.forEach(v => {
      if (v.type === 'constant') return; // Constants don't change
      
      let delta = 0;
      influences[v.name].forEach(link => {
        const sourceVar = model.variables.find(x => x.name === link.source);
        const sourceVal = state[link.source];
        const sourceInit = sourceVar?.initial || 1;
        
        // Handle delay buffer
        let effectiveVal = sourceVal;
        if (link.buffer && link.buffer.length > 0) {
          effectiveVal = link.buffer[0];
          link.buffer.shift();
          link.buffer.push(sourceVal);
        }
        
        const deviation = (effectiveVal - sourceInit) / (sourceInit || 1);
        const effect = link.polarity === '+' ? deviation : -deviation;
        delta += effect * link.strength * 0.02 * state[v.name];
      });
      
      const newVal = state[v.name] + delta;
      
      // Check for divergence
      if (!isFinite(newVal) || Math.abs(newVal) > 1e10) {
        warnings.push({ t, variable: v.name, type: 'divergence', value: newVal });
        state[v.name] = v.max || 1e6; // Clamp
      } else {
        state[v.name] = Math.max(v.min ?? 0, Math.min(v.max ?? Infinity, newVal));
      }
      
      history[v.name].push(state[v.name]);
    });
  }
  
  return { history, warnings, finalState: { ...state } };
};

// Monte Carlo simulation
const runMonteCarlo = (model, paramRanges, nRuns = 50, months = 60) => {
  const results = [];
  
  for (let i = 0; i < nRuns; i++) {
    const params = {};
    Object.entries(paramRanges).forEach(([name, [min, max]]) => {
      params[name] = min + Math.random() * (max - min);
    });
    
    const { history, warnings, finalState } = runSimulation(model, params, months);
    results.push({ params, history, warnings, finalState, runId: i });
  }
  
  return results;
};

// Sensitivity analysis
const runSensitivity = (model, paramName, range, steps = 10, months = 60) => {
  const results = [];
  const [min, max] = range;
  const step = (max - min) / steps;
  
  for (let val = min; val <= max; val += step) {
    const params = { [paramName]: val };
    const { history, finalState } = runSimulation(model, params, months);
    results.push({ paramValue: val, history, finalState });
  }
  
  return results;
};

// ==================== LOOP DETECTION ====================
const detectLoops = (model) => {
  const loops = [];
  const visited = new Set();
  
  const dfs = (start, current, path) => {
    if (path.length > 1 && current === start) {
      // Found a loop
      const loopLinks = [];
      for (let i = 0; i < path.length - 1; i++) {
        const link = model.links.find(l => l.source === path[i] && l.target === path[i + 1]);
        if (link) loopLinks.push(link);
      }
      
      // Count negative links to determine loop type
      const negCount = loopLinks.filter(l => l.polarity === '-').length;
      const loopType = negCount % 2 === 0 ? 'reinforcing' : 'balancing';
      
      const loopKey = [...path].sort().join('-');
      if (!visited.has(loopKey)) {
        visited.add(loopKey);
        loops.push({
          variables: path.slice(0, -1),
          type: loopType,
          links: loopLinks,
        });
      }
      return;
    }
    
    if (path.length > 8) return; // Limit depth
    
    const outgoing = model.links.filter(l => l.source === current);
    outgoing.forEach(link => {
      if (!path.includes(link.target) || link.target === start) {
        dfs(start, link.target, [...path, link.target]);
      }
    });
  };
  
  model.variables.forEach(v => {
    dfs(v.name, v.name, [v.name]);
  });
  
  return loops;
};

// ==================== AI EXTRACTION (SIMULATED) ====================
const extractMechanismsFromText = async (text) => {
  // In real implementation, this would call Claude API
  // For demo, we simulate extraction
  await new Promise(r => setTimeout(r, 1500)); // Simulate API delay
  
  const mechanisms = [];
  
  // Simple keyword-based extraction for demo
  const patterns = [
    { regex: /(?:increase|improve|enhance|grow)s?\s+(\w+)/gi, polarity: '+' },
    { regex: /(?:decrease|reduce|lower|diminish)s?\s+(\w+)/gi, polarity: '-' },
    { regex: /(\w+)\s+(?:leads? to|causes?|results? in)\s+(\w+)/gi, type: 'causal' },
    { regex: /(?:when|if|as)\s+(\w+)\s+(?:increases?|grows?)/gi, type: 'condition' },
  ];
  
  // Extract potential variables (nouns)
  const words = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)*\b/g) || [];
  const potentialVars = [...new Set(words)].slice(0, 8);
  
  // Generate some relationships based on text patterns
  if (text.toLowerCase().includes('investment') && text.toLowerCase().includes('capability')) {
    mechanisms.push({ source: 'Investment', target: 'Capability', polarity: '+', confidence: 0.8 });
  }
  if (text.toLowerCase().includes('regulation') || text.toLowerCase().includes('pressure')) {
    mechanisms.push({ source: 'Public Opinion', target: 'Regulation', polarity: '-', confidence: 0.7 });
  }
  if (text.toLowerCase().includes('revenue') || text.toLowerCase().includes('sales')) {
    mechanisms.push({ source: 'Product Quality', target: 'Revenue', polarity: '+', confidence: 0.75 });
  }
  
  return {
    suggestedVariables: potentialVars.map(name => ({
      name,
      type: 'auxiliary',
      initial: 50,
      confidence: 0.6 + Math.random() * 0.3,
    })),
    suggestedLinks: mechanisms,
    rawMechanisms: [
      { text: "Growth mechanism: Higher capability drives better products", type: 'reinforcing' },
      { text: "Balancing mechanism: Success attracts regulatory scrutiny", type: 'balancing' },
    ],
  };
};

// ==================== COMPONENTS ====================
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const TYPE_COLORS = { stock: '#3b82f6', flow: '#10b981', auxiliary: '#f59e0b', constant: '#6b7280' };

// Variable Editor Modal
const VariableEditor = ({ variable, onSave, onDelete, onClose }) => {
  const [form, setForm] = useState(variable || { name: '', type: 'stock', initial: 50, min: 0, max: 100 });
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-96 max-w-full mx-4">
        <h3 className="font-bold text-lg mb-4">{variable ? 'Edit Variable' : 'Add Variable'}</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg" placeholder="e.g., Market Share" />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg">
              <option value="stock">Stock (accumulates)</option>
              <option value="flow">Flow (rate)</option>
              <option value="auxiliary">Auxiliary (calculated)</option>
              <option value="constant">Constant (parameter)</option>
            </select>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Initial</label>
              <input type="number" value={form.initial} onChange={e => setForm({ ...form, initial: +e.target.value })}
                className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Min</label>
              <input type="number" value={form.min} onChange={e => setForm({ ...form, min: +e.target.value })}
                className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max</label>
              <input type="number" value={form.max} onChange={e => setForm({ ...form, max: +e.target.value })}
                className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 mt-6">
          <button onClick={() => onSave(form)} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium">Save</button>
          {variable && <button onClick={() => onDelete(variable.id)} className="px-4 py-2 bg-red-100 text-red-600 rounded-lg">Delete</button>}
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-lg">Cancel</button>
        </div>
      </div>
    </div>
  );
};

// Link Editor Modal
const LinkEditor = ({ link, variables, onSave, onDelete, onClose }) => {
  const [form, setForm] = useState(link || { source: '', target: '', polarity: '+', strength: 0.5, delay: 0 });
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-96 max-w-full mx-4">
        <h3 className="font-bold text-lg mb-4">{link ? 'Edit Relationship' : 'Add Relationship'}</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Source Variable</label>
            <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg">
              <option value="">Select...</option>
              {variables.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
            </select>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Polarity</label>
              <div className="flex gap-2">
                <button onClick={() => setForm({ ...form, polarity: '+' })}
                  className={`flex-1 py-2 rounded-lg font-bold ${form.polarity === '+' ? 'bg-green-500 text-white' : 'bg-slate-100'}`}>
                  + Positive
                </button>
                <button onClick={() => setForm({ ...form, polarity: '-' })}
                  className={`flex-1 py-2 rounded-lg font-bold ${form.polarity === '-' ? 'bg-red-500 text-white' : 'bg-slate-100'}`}>
                  − Negative
                </button>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Target Variable</label>
            <select value={form.target} onChange={e => setForm({ ...form, target: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg">
              <option value="">Select...</option>
              {variables.filter(v => v.name !== form.source).map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Strength: {form.strength.toFixed(2)}</label>
            <input type="range" min="0" max="1" step="0.05" value={form.strength}
              onChange={e => setForm({ ...form, strength: +e.target.value })}
              className="w-full" />
            <div className="flex justify-between text-xs text-slate-400">
              <span>Weak</span><span>Strong</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Delay: {form.delay} months</label>
            <input type="range" min="0" max="12" step="1" value={form.delay}
              onChange={e => setForm({ ...form, delay: +e.target.value })}
              className="w-full" />
          </div>
        </div>
        
        <div className="flex gap-2 mt-6">
          <button onClick={() => onSave(form)} disabled={!form.source || !form.target}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50">Save</button>
          {link && <button onClick={() => onDelete(link.id)} className="px-4 py-2 bg-red-100 text-red-600 rounded-lg">Delete</button>}
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-lg">Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN APP ====================
export default function ModelFactory() {
  const [client, setClient] = useState('aerodyn');
  const [model, setModel] = useState(() => createInitialModel('aerodyn'));
  const [tab, setTab] = useState('model');
  
  // Editors
  const [editingVar, setEditingVar] = useState(null);
  const [editingLink, setEditingLink] = useState(null);
  const [showAddVar, setShowAddVar] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  
  // Simulation state
  const [simResults, setSimResults] = useState([]);
  const [mcResults, setMcResults] = useState(null);
  const [sensitivityResults, setSensitivityResults] = useState(null);
  const [selectedVarForSim, setSelectedVarForSim] = useState('');
  
  // AI extraction
  const [sourceText, setSourceText] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [extracting, setExtracting] = useState(false);
  
  // Detected loops
  const loops = useMemo(() => detectLoops(model), [model]);
  
  // Switch client
  const switchClient = (newClient) => {
    setClient(newClient);
    setModel(createInitialModel(newClient));
    setSimResults([]);
    setMcResults(null);
    setSensitivityResults(null);
  };
  
  // Model editing functions
  const saveVariable = (varData) => {
    if (editingVar) {
      setModel(m => ({
        ...m,
        variables: m.variables.map(v => v.id === editingVar.id ? { ...v, ...varData } : v)
      }));
    } else {
      setModel(m => ({
        ...m,
        variables: [...m.variables, { ...varData, id: `v${Date.now()}` }]
      }));
    }
    setEditingVar(null);
    setShowAddVar(false);
  };
  
  const deleteVariable = (id) => {
    const v = model.variables.find(x => x.id === id);
    setModel(m => ({
      ...m,
      variables: m.variables.filter(x => x.id !== id),
      links: m.links.filter(l => l.source !== v?.name && l.target !== v?.name)
    }));
    setEditingVar(null);
  };
  
  const saveLink = (linkData) => {
    if (editingLink) {
      setModel(m => ({
        ...m,
        links: m.links.map(l => l.id === editingLink.id ? { ...l, ...linkData } : l)
      }));
    } else {
      setModel(m => ({
        ...m,
        links: [...m.links, { ...linkData, id: `l${Date.now()}` }]
      }));
    }
    setEditingLink(null);
    setShowAddLink(false);
  };
  
  const deleteLink = (id) => {
    setModel(m => ({ ...m, links: m.links.filter(l => l.id !== id) }));
    setEditingLink(null);
  };
  
  // Run single simulation
  const runSingleSim = (params = {}, label = 'Run') => {
    const result = runSimulation(model, params);
    setSimResults(prev => [...prev, { ...result, label, id: Date.now(), params }]);
  };
  
  // Run Monte Carlo
  const runMC = () => {
    if (!selectedVarForSim) return;
    const v = model.variables.find(x => x.name === selectedVarForSim);
    if (!v) return;
    
    const range = { [v.name]: [v.min ?? 0, v.max ?? v.initial * 2] };
    const results = runMonteCarlo(model, range, 30);
    setMcResults({ variable: v.name, results });
  };
  
  // Run sensitivity
  const runSens = () => {
    if (!selectedVarForSim) return;
    const v = model.variables.find(x => x.name === selectedVarForSim);
    if (!v) return;
    
    const results = runSensitivity(model, v.name, [v.min ?? 0, v.max ?? v.initial * 2], 8);
    setSensitivityResults({ variable: v.name, results });
  };
  
  // AI extraction
  const handleExtract = async () => {
    if (!sourceText.trim()) return;
    setExtracting(true);
    try {
      const data = await extractMechanismsFromText(sourceText);
      setExtractedData(data);
    } finally {
      setExtracting(false);
    }
  };
  
  const applyExtractedVar = (v) => {
    if (!model.variables.find(x => x.name === v.name)) {
      setModel(m => ({
        ...m,
        variables: [...m.variables, { ...v, id: `v${Date.now()}`, min: 0, max: 100 }]
      }));
    }
  };
  
  const applyExtractedLink = (l) => {
    if (!model.links.find(x => x.source === l.source && x.target === l.target)) {
      setModel(m => ({
        ...m,
        links: [...m.links, { ...l, id: `l${Date.now()}`, strength: 0.5, delay: 0 }]
      }));
    }
  };
  
  // Chart data for comparison
  const comparisonData = useMemo(() => {
    if (!simResults.length) return [];
    const data = [];
    const months = simResults[0]?.history?.[model.variables[0]?.name]?.length || 0;
    
    for (let i = 0; i < months; i++) {
      const pt = { month: i };
      simResults.forEach((sim, idx) => {
        model.variables.forEach(v => {
          if (sim.history[v.name]) {
            pt[`${sim.label}_${v.name}`] = sim.history[v.name][i];
          }
        });
      });
      data.push(pt);
    }
    return data;
  }, [simResults, model]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏭</span>
              <div>
                <h1 className="font-bold text-lg">Model Factory</h1>
                <p className="text-xs text-slate-400">System Dynamics Workbench</p>
              </div>
            </div>
            <select value={client} onChange={e => switchClient(e.target.value)}
              className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm">
              <option value="aerodyn">AeroDyn Systems</option>
              <option value="euromotion">EuroMotion Automotive</option>
            </select>
          </div>
        </div>
      </header>
      
      {/* Tabs */}
      <nav className="bg-slate-800/30 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {[
              { id: 'model', label: '🔧 Model Editor' },
              { id: 'loops', label: '🔄 Feedback Loops' },
              { id: 'simulate', label: '📊 Simulate' },
              { id: 'compare', label: '⚖️ Compare' },
              { id: 'montecarlo', label: '🎲 Monte Carlo' },
              { id: 'ai', label: '🤖 AI Extract' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium transition ${tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </nav>
      
      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* MODEL EDITOR TAB */}
        {tab === 'model' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Variables */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Variables ({model.variables.length})</h2>
                <button onClick={() => setShowAddVar(true)} className="px-3 py-1 bg-blue-600 rounded-lg text-sm">+ Add</button>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {model.variables.map(v => (
                  <div key={v.id} onClick={() => setEditingVar(v)}
                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700">
                    <div>
                      <span className="font-medium">{v.name}</span>
                      <span className="ml-2 text-xs text-slate-400">= {v.initial}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs" style={{ background: TYPE_COLORS[v.type] }}>{v.type}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Links */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Relationships ({model.links.length})</h2>
                <button onClick={() => setShowAddLink(true)} className="px-3 py-1 bg-blue-600 rounded-lg text-sm">+ Add</button>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {model.links.map(l => (
                  <div key={l.id} onClick={() => setEditingLink(l)}
                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700">
                    <div className="flex items-center gap-2">
                      <span>{l.source}</span>
                      <span className={`font-bold ${l.polarity === '+' ? 'text-green-400' : 'text-red-400'}`}>
                        {l.polarity === '+' ? '→+' : '→−'}
                      </span>
                      <span>{l.target}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      str: {l.strength.toFixed(1)} | delay: {l.delay}mo
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* LOOPS TAB */}
        {tab === 'loops' && (
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h2 className="font-semibold mb-4">Detected Feedback Loops ({loops.length})</h2>
              {loops.length === 0 ? (
                <p className="text-slate-400">No loops detected. Add more relationships to create feedback loops.</p>
              ) : (
                <div className="space-y-3">
                  {loops.map((loop, i) => (
                    <div key={i} className={`p-4 rounded-lg border-l-4 ${loop.type === 'reinforcing' ? 'bg-emerald-900/30 border-emerald-500' : 'bg-amber-900/30 border-amber-500'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{loop.type === 'reinforcing' ? '🔄' : '⚖️'}</span>
                        <span className={`text-sm px-2 py-0.5 rounded ${loop.type === 'reinforcing' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-amber-500/30 text-amber-300'}`}>
                          {loop.type === 'reinforcing' ? 'Reinforcing (R)' : 'Balancing (B)'}
                        </span>
                      </div>
                      <p className="text-sm">
                        {loop.variables.join(' → ')} → {loop.variables[0]}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {loop.type === 'reinforcing' ? 'Self-amplifying: growth or decline accelerates' : 'Self-correcting: system seeks equilibrium'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* SIMULATE TAB */}
        {tab === 'simulate' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h2 className="font-semibold mb-4">Quick Scenarios</h2>
              <div className="space-y-2">
                <button onClick={() => runSingleSim({}, 'Baseline')} className="w-full py-2 bg-blue-600 rounded-lg text-sm">
                  ▶ Run Baseline
                </button>
                {client === 'aerodyn' ? (
                  <>
                    <button onClick={() => runSingleSim({ "AI Capability": 80 }, 'High AI')} className="w-full py-2 bg-slate-700 rounded-lg text-sm">
                      High AI Investment
                    </button>
                    <button onClick={() => runSingleSim({ "Regulatory Pressure": 70 }, 'Reg Shock')} className="w-full py-2 bg-slate-700 rounded-lg text-sm">
                      Regulation Shock
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => runSingleSim({ "Chip Inventory": 20000 }, 'Shortage')} className="w-full py-2 bg-slate-700 rounded-lg text-sm">
                      Chip Shortage
                    </button>
                    <button onClick={() => runSingleSim({ "Safety Stock Target": 8 }, 'High Stock')} className="w-full py-2 bg-slate-700 rounded-lg text-sm">
                      High Safety Stock
                    </button>
                  </>
                )}
              </div>
              
              {simResults.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-600">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-400">{simResults.length} runs</span>
                    <button onClick={() => setSimResults([])} className="text-xs text-red-400">Clear all</button>
                  </div>
                  {simResults.slice(-3).map(r => (
                    <div key={r.id} className="text-xs text-slate-400 py-1">
                      {r.label} {r.warnings.length > 0 && <span className="text-amber-400">⚠️ {r.warnings.length}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="lg:col-span-2 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h2 className="font-semibold mb-4">Latest Results</h2>
              {simResults.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                    <Legend />
                    {simResults.slice(-3).map((sim, i) => (
                      <Line key={sim.id} type="monotone" 
                        dataKey={`${sim.label}_${model.variables[0].name}`}
                        name={`${sim.label}: ${model.variables[0].name}`}
                        stroke={COLORS[i]} strokeWidth={2} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-500">
                  Run a simulation to see results
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* COMPARE TAB */}
        {tab === 'compare' && (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h2 className="font-semibold mb-4">Simulation Comparison</h2>
            {simResults.length < 2 ? (
              <p className="text-slate-400">Run at least 2 simulations in the Simulate tab to compare them.</p>
            ) : (
              <div className="space-y-6">
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                    <Legend />
                    {simResults.map((sim, i) => (
                      <Line key={sim.id} type="monotone"
                        dataKey={`${sim.label}_${model.variables[0].name}`}
                        name={sim.label}
                        stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-600">
                        <th className="text-left py-2">Scenario</th>
                        {model.variables.slice(0, 5).map(v => (
                          <th key={v.id} className="text-right py-2">{v.name}</th>
                        ))}
                        <th className="text-right py-2">Warnings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simResults.map(sim => (
                        <tr key={sim.id} className="border-b border-slate-700">
                          <td className="py-2 font-medium">{sim.label}</td>
                          {model.variables.slice(0, 5).map(v => (
                            <td key={v.id} className="text-right py-2">
                              {sim.finalState[v.name]?.toFixed(1) || '-'}
                            </td>
                          ))}
                          <td className="text-right py-2">
                            {sim.warnings.length > 0 ? (
                              <span className="text-amber-400">⚠️ {sim.warnings.length}</span>
                            ) : '✓'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* MONTE CARLO TAB */}
        {tab === 'montecarlo' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h2 className="font-semibold mb-4">Parameter Analysis</h2>
              
              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-1">Variable to vary</label>
                <select value={selectedVarForSim} onChange={e => setSelectedVarForSim(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg">
                  <option value="">Select variable...</option>
                  {model.variables.map(v => (
                    <option key={v.id} value={v.name}>{v.name} ({v.min ?? 0} - {v.max ?? v.initial * 2})</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <button onClick={runMC} disabled={!selectedVarForSim}
                  className="w-full py-2 bg-purple-600 rounded-lg text-sm disabled:opacity-50">
                  🎲 Run Monte Carlo (30 runs)
                </button>
                <button onClick={runSens} disabled={!selectedVarForSim}
                  className="w-full py-2 bg-cyan-600 rounded-lg text-sm disabled:opacity-50">
                  📈 Run Sensitivity Analysis
                </button>
              </div>
            </div>
            
            <div className="lg:col-span-2 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h2 className="font-semibold mb-4">Results</h2>
              
              {mcResults && (
                <div className="mb-6">
                  <h3 className="text-sm text-slate-400 mb-2">Monte Carlo: {mcResults.variable}</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                      {mcResults.results.slice(0, 10).map((r, i) => {
                        const data = r.history[model.variables[0].name].map((v, j) => ({ month: j, value: v }));
                        return (
                          <Area key={i} type="monotone" data={data} dataKey="value"
                            stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.1} />
                        );
                      })}
                    </AreaChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-slate-400 mt-2">
                    Showing 10 of 30 runs. Range shows uncertainty in outcomes.
                  </p>
                </div>
              )}
              
              {sensitivityResults && (
                <div>
                  <h3 className="text-sm text-slate-400 mb-2">Sensitivity: {sensitivityResults.variable}</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="paramValue" name={sensitivityResults.variable} stroke="#94a3b8" />
                      <YAxis dataKey="finalValue" name="Final Value" stroke="#94a3b8" />
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                      <Scatter data={sensitivityResults.results.map(r => ({
                        paramValue: r.paramValue,
                        finalValue: r.finalState[model.variables[0].name]
                      }))} fill="#3b82f6" />
                    </ScatterChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-slate-400 mt-2">
                    Shows how final {model.variables[0].name} changes with different {sensitivityResults.variable} values.
                  </p>
                </div>
              )}
              
              {!mcResults && !sensitivityResults && (
                <div className="h-48 flex items-center justify-center text-slate-500">
                  Select a variable and run analysis
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* AI EXTRACT TAB */}
        {tab === 'ai' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h2 className="font-semibold mb-4">🤖 Extract from Text</h2>
              <textarea
                value={sourceText}
                onChange={e => setSourceText(e.target.value)}
                placeholder="Paste interview transcripts, reports, or domain knowledge here...

Example: 'The company's investment in AI R&D directly increases its technological capability. As capability grows, product attractiveness improves, leading to more sales. However, advanced AI attracts media scrutiny, which negatively impacts public opinion.'"
                className="w-full h-48 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm resize-none"
              />
              <button onClick={handleExtract} disabled={extracting || !sourceText.trim()}
                className="w-full mt-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium disabled:opacity-50">
                {extracting ? '⏳ Analyzing...' : '🔍 Extract Mechanisms'}
              </button>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h2 className="font-semibold mb-4">Extracted Elements</h2>
              
              {extractedData ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm text-slate-400 mb-2">Suggested Variables</h3>
                    <div className="space-y-1">
                      {extractedData.suggestedVariables.map((v, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                          <span className="text-sm">{v.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">{(v.confidence * 100).toFixed(0)}%</span>
                            <button onClick={() => applyExtractedVar(v)}
                              className="px-2 py-0.5 bg-blue-600 rounded text-xs">+ Add</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm text-slate-400 mb-2">Suggested Relationships</h3>
                    <div className="space-y-1">
                      {extractedData.suggestedLinks.map((l, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                          <span className="text-sm">
                            {l.source} <span className={l.polarity === '+' ? 'text-green-400' : 'text-red-400'}>
                              {l.polarity === '+' ? '→+' : '→−'}
                            </span> {l.target}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">{(l.confidence * 100).toFixed(0)}%</span>
                            <button onClick={() => applyExtractedLink(l)}
                              className="px-2 py-0.5 bg-blue-600 rounded text-xs">+ Add</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm text-slate-400 mb-2">Identified Mechanisms</h3>
                    {extractedData.rawMechanisms.map((m, i) => (
                      <div key={i} className={`p-2 rounded text-sm ${m.type === 'reinforcing' ? 'bg-emerald-900/30' : 'bg-amber-900/30'}`}>
                        {m.type === 'reinforcing' ? '🔄' : '⚖️'} {m.text}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-500">
                  Paste text and click Extract to identify system dynamics elements
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      
      {/* Modals */}
      {(editingVar || showAddVar) && (
        <VariableEditor
          variable={editingVar}
          onSave={saveVariable}
          onDelete={deleteVariable}
          onClose={() => { setEditingVar(null); setShowAddVar(false); }}
        />
      )}
      
      {(editingLink || showAddLink) && (
        <LinkEditor
          link={editingLink}
          variables={model.variables}
          onSave={saveLink}
          onDelete={deleteLink}
          onClose={() => { setEditingLink(null); setShowAddLink(false); }}
        />
      )}
      
      <footer className="text-center text-xs text-slate-500 py-4">
        Grace Esther | AIvancity Industrial AI | 2026
      </footer>
    </div>
  );
}
