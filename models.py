"""
Core data models for the System Dynamics Model Factory
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal, Optional
from enum import Enum
import json
import uuid


class VariableType(str, Enum):
    STOCK = "stock"
    FLOW = "flow"
    AUXILIARY = "auxiliary"
    CONSTANT = "constant"


class LoopType(str, Enum):
    REINFORCING = "reinforcing"
    BALANCING = "balancing"


class Delay(str, Enum):
    NONE = "none"
    SHORT = "short"
    MEDIUM = "medium"
    LONG = "long"


class Strength(str, Enum):
    WEAK = "weak"
    MODERATE = "moderate"
    STRONG = "strong"


@dataclass
class Variable:
    """A variable in the system dynamics model"""
    name: str
    var_type: VariableType
    description: str
    unit: str = ""
    initial_value: Optional[float] = None
    equation: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    sources: list[str] = field(default_factory=list)
    confidence: float = 0.8
    tags: list[str] = field(default_factory=list)
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "var_type": self.var_type.value,
            "description": self.description,
            "unit": self.unit,
            "initial_value": self.initial_value,
            "equation": self.equation,
            "min_value": self.min_value,
            "max_value": self.max_value,
            "sources": self.sources,
            "confidence": self.confidence,
            "tags": self.tags
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "Variable":
        data["var_type"] = VariableType(data["var_type"])
        return cls(**data)


@dataclass
class CausalLink:
    """A causal relationship between two variables"""
    source_var: str  # variable name
    target_var: str  # variable name
    polarity: Literal["+", "-"]
    delay: Delay = Delay.NONE
    strength: Strength = Strength.MODERATE
    mechanism: str = ""
    sources: list[str] = field(default_factory=list)
    confidence: float = 0.8
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "source_var": self.source_var,
            "target_var": self.target_var,
            "polarity": self.polarity,
            "delay": self.delay.value,
            "strength": self.strength.value,
            "mechanism": self.mechanism,
            "sources": self.sources,
            "confidence": self.confidence
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "CausalLink":
        data["delay"] = Delay(data["delay"])
        data["strength"] = Strength(data["strength"])
        return cls(**data)


@dataclass
class FeedbackLoop:
    """A feedback loop in the system"""
    name: str
    loop_type: LoopType
    variables: list[str]  # ordered list of variable names
    description: str = ""
    strategic_implications: str = ""
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "loop_type": self.loop_type.value,
            "variables": self.variables,
            "description": self.description,
            "strategic_implications": self.strategic_implications
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "FeedbackLoop":
        data["loop_type"] = LoopType(data["loop_type"])
        return cls(**data)


@dataclass
class SDModel:
    """A complete System Dynamics model"""
    name: str
    question: str  # strategic question this addresses
    client: str
    variables: list[Variable] = field(default_factory=list)
    links: list[CausalLink] = field(default_factory=list)
    loops: list[FeedbackLoop] = field(default_factory=list)
    assumptions: list[str] = field(default_factory=list)
    limitations: list[str] = field(default_factory=list)
    time_unit: str = "month"
    time_horizon: int = 60
    created_at: datetime = field(default_factory=datetime.now)
    version: int = 1
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    
    def get_variable(self, name: str) -> Optional[Variable]:
        for v in self.variables:
            if v.name == name:
                return v
        return None
    
    def get_links_from(self, var_name: str) -> list[CausalLink]:
        return [l for l in self.links if l.source_var == var_name]
    
    def get_links_to(self, var_name: str) -> list[CausalLink]:
        return [l for l in self.links if l.target_var == var_name]
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "question": self.question,
            "client": self.client,
            "variables": [v.to_dict() for v in self.variables],
            "links": [l.to_dict() for l in self.links],
            "loops": [lo.to_dict() for lo in self.loops],
            "assumptions": self.assumptions,
            "limitations": self.limitations,
            "time_unit": self.time_unit,
            "time_horizon": self.time_horizon,
            "created_at": self.created_at.isoformat(),
            "version": self.version
        }
    
    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)
    
    @classmethod
    def from_dict(cls, data: dict) -> "SDModel":
        return cls(
            id=data.get("id", str(uuid.uuid4())[:8]),
            name=data["name"],
            question=data["question"],
            client=data["client"],
            variables=[Variable.from_dict(v) for v in data.get("variables", [])],
            links=[CausalLink.from_dict(l) for l in data.get("links", [])],
            loops=[FeedbackLoop.from_dict(lo) for lo in data.get("loops", [])],
            assumptions=data.get("assumptions", []),
            limitations=data.get("limitations", []),
            time_unit=data.get("time_unit", "month"),
            time_horizon=data.get("time_horizon", 60),
            created_at=datetime.fromisoformat(data["created_at"]) if "created_at" in data else datetime.now(),
            version=data.get("version", 1)
        )
    
    @classmethod
    def from_json(cls, json_str: str) -> "SDModel":
        return cls.from_dict(json.loads(json_str))


@dataclass
class SourceDocument:
    """A source document for extraction"""
    title: str
    content: str
    doc_type: Literal["interview", "report", "article", "expert_input"] = "report"
    extracted_claims: list[dict] = field(default_factory=list)
    uploaded_at: datetime = field(default_factory=datetime.now)
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])


@dataclass
class SimulationResult:
    """Results from a simulation run"""
    model_id: str
    scenario_name: str
    parameters: dict
    time_series: dict[str, list[float]]  # variable name -> values
    timestamps: list[float]
    insights: list[str] = field(default_factory=list)
    run_at: datetime = field(default_factory=datetime.now)
