"""
Schema definitions for jev_decision.
Mirrors Qwen-2.5-1B-RLCD/core/schema.py but with a simpler API surface.
"""
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class DecisionField:
    """A single field in a decision schema."""
    description: str
    choices: List[str]
    field_type: str = "enum"  # "enum" | "boolean"

    def __post_init__(self):
        if self.field_type == "boolean":
            self.choices = ["true", "false"]
        elif not self.choices:
            raise ValueError(f"Enum fields must have choices defined.")
        elif len(self.choices) > 255:
            raise ValueError(f"Maximum 255 choices allowed (got {len(self.choices)}).")

    def to_dict(self):
        return {
            "type": self.field_type,
            "description": self.description,
            "choices": self.choices,
        }


class DecisionSchema:
    """
    A collection of decision fields to fill in parallel.

    Example:
        schema = DecisionSchema({
            "severity": DecisionField(
                description="What is the severity?",
                choices=["critical", "high", "medium", "low"]
            ),
            "escalate": DecisionField(
                description="Should this be escalated immediately?",
                field_type="boolean",
                choices=[]
            )
        })
    """

    def __init__(self, fields: dict):
        self.fields = {}
        for name, spec in fields.items():
            if isinstance(spec, DecisionField):
                self.fields[name] = spec
            elif isinstance(spec, dict):
                ftype = spec.get("type", "enum")
                desc = spec.get("description", "")
                choices = spec.get("choices", [])
                self.fields[name] = DecisionField(
                    description=desc,
                    choices=choices,
                    field_type=ftype
                )
            else:
                raise TypeError(f"Field '{name}' must be a DecisionField or dict.")

    def to_raw_dict(self) -> dict:
        """Convert to the raw dict format used by the Qwen engine."""
        return {name: f.to_dict() for name, f in self.fields.items()}

    def field_names(self) -> List[str]:
        return list(self.fields.keys())

    def __len__(self):
        return len(self.fields)
