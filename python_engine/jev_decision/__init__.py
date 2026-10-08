"""
jev_decision — Parallel Constrained Decoding for Windows & Linux
================================================================
Two backends:
  1. LOCAL   — Uses Qwen-2.5-1B-RLCD PyTorch engine directly (in-process)
  2. SERVER  — Calls llama.cpp /v1/decision endpoint (thecodacus/parallel-decision branch)
  3. FALLBACK— Standard /v1/chat/completions with structured JSON mode

Usage:
    from jev_decision import JevClient, ScadaDecisions, CostDecisions, HeroDecisions

    client = JevClient(server_url="http://localhost:8085")
    hero = HeroDecisions(client)

    result = hero.decide_sustainable_plant(
        vehicle_model="Super Splendor",
        operational_context="Evaluating solar energy mix, ZLD water recycling, and specific power consumption."
    )
    print(result.answers)
    # {'most_sustainable_plant': 'PLANT_D_NEEMRANA', 'primary_esg_driver': 'SOLAR_ROOFTOP_RENEWABLE_RATIO', ...}
"""

from .client import JevClient, JevResult
from .schema import DecisionField, DecisionSchema
from .scada_decisions import ScadaDecisions
from .cost_decisions import CostDecisions
from .hero_decisions import HeroDecisions

__version__ = "0.2.0"
__all__ = [
    "JevClient",
    "JevResult",
    "DecisionField",
    "DecisionSchema",
    "ScadaDecisions",
    "CostDecisions",
    "HeroDecisions",
]
