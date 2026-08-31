"""
TASC IIoT Studio — DSPy Multi-Agent Program & SCADA Verification Engine
Formalizes Supervisor and Specialist routing into compilable DSPy Signatures
with physical safety and tag-hallucination validation metrics.
"""

import os
import sys
import json
import time
from typing import List, Dict, Any, Optional

# ─── 1. Fallback Minimal DSPy Compatibility Layer ─────────────────────────────
# Allows execution even when dspy-ai is running in lightweight standalone mode.
try:
    import dspy
    DSPY_INSTALLED = True
except ImportError:
    dspy = None
    DSPY_INSTALLED = False

# ─── 2. SCADA Fact Accuracy & Safety Metric ──────────────────────────────────
def scada_fact_accuracy_metric(gold_example: Dict[str, Any], pred_output: Dict[str, Any], trace=None) -> float:
    """
    Validation metric linked to multiTierFactShield:
    - Rule 1: Zero Tolerance for Tag Hallucinations (1.0 -> 0.0 if unknown tag is emitted)
    - Rule 2: Physical Trip Envelope Compliance (Penalize out-of-range setpoint recommendations)
    - Rule 3: Structured Schema & Conciseness Compliance
    """
    valid_tags = set(gold_example.get("registered_tags", []))
    score = 1.0

    # Rule 1: Tag Hallucination Check
    emitted_tags = pred_output.get("referenced_tags", [])
    if valid_tags and emitted_tags:
        for t in emitted_tags:
            if t not in valid_tags:
                return 0.0  # Instant failure on hallucinated tag

    # Rule 2: Physical Setpoint Boundary Check
    setpoints = pred_output.get("recommended_setpoints", {})
    safety_limits = gold_example.get("safety_limits", {})
    for param, val in setpoints.items():
        if param in safety_limits:
            min_lim, max_lim = safety_limits[param]
            if val < min_lim or val > max_lim:
                return 0.0  # Violation of physical safety trip envelope

    # Rule 3: Schema Compliance
    if not pred_output.get("sub_tasks") and not pred_output.get("evidence"):
        score -= 0.3

    return max(0.0, score)

# ─── 3. DSPy Signatures ───────────────────────────────────────────────────────
if DSPY_INSTALLED and dspy:
    class SupervisorSignature(dspy.Signature):
        """Categorize industrial user query into domain tasks and select specialist micro-agents."""
        user_query: str = dspy.InputField(desc="Operator natural language query about plant, telemetry, or alarms")
        system_snapshot: str = dspy.InputField(desc="Real-time SCADA runtime state and active equipment")
        registered_tags: list = dspy.InputField(desc="List of valid registered PLC driver tags")
        
        active_specialists: list = dspy.OutputField(desc="List of specialists to activate: memory, telemetry, fdd, diagnostic, oee, traceability")
        time_horizon: str = dspy.OutputField(desc="Detected time horizon: 24h, 7d, 1m, 6m, 1y, or archive")
        sub_tasks: list = dspy.OutputField(desc="Categorized domain sub-tasks to execute in parallel")
        referenced_tags: list = dspy.OutputField(desc="Exact valid tag names referenced in the query")

    class FddDiagnosticSignature(dspy.Signature):
        """Analyze equipment degradation faults, chiller efficiency, and financial energy waste."""
        active_faults: list = dspy.InputField(desc="List of currently active FDD equipment fault records")
        energy_kpi: dict = dspy.InputField(desc="Current plant energy waste metrics (kW excess, $/hr rate)")
        
        financial_waste_summary: str = dspy.OutputField(desc="Concise assessment of hourly financial waste and critical root causes")
        recommended_sop: str = dspy.OutputField(desc="Standard operating procedure action recommendation")

    class TelemetrySynthesisSignature(dspy.Signature):
        """Synthesize pre-computed time-series statistics and highlight anomalies."""
        tag_stats: list = dspy.InputField(desc="Min, Max, Avg, Delta metrics for queried tags")
        time_horizon: str = dspy.InputField(desc="Time horizon label and storage tier source")
        
        synthesis_summary: str = dspy.OutputField(desc="Executive technical summary of tag trends and deviations")
        anomalies_detected: list = dspy.OutputField(desc="List of detected anomalies or threshold crossings")

# ─── 4. DSPy Multi-Agent Orchestrator Module ──────────────────────────────────
class IndustrialDSPyOrchestrator:
    def __init__(self):
        self.is_compiled = False
        if DSPY_INSTALLED and dspy:
            self.supervisor = dspy.ChainOfThought(SupervisorSignature)
            self.fdd_specialist = dspy.Predict(FddDiagnosticSignature)
            self.telemetry_synthesis = dspy.Predict(TelemetrySynthesisSignature)
        else:
            self.supervisor = None
            self.fdd_specialist = None
            self.telemetry_synthesis = None

    def route_and_evaluate(self, user_query: str, system_snapshot: str, registered_tags: List[str]) -> Dict[str, Any]:
        """Executes the supervisor router and formats specialist tasks."""
        start_t = time.time()
        
        if DSPY_INSTALLED and self.supervisor:
            try:
                pred = self.supervisor(
                    user_query=user_query,
                    system_snapshot=system_snapshot,
                    registered_tags=registered_tags
                )
                return {
                    "status": "SUCCESS",
                    "engine": "DSPy_ChainOfThought",
                    "activeSpecialists": getattr(pred, "active_specialists", ["memory", "telemetry"]),
                    "timeHorizon": getattr(pred, "time_horizon", "24h"),
                    "subTasks": getattr(pred, "sub_tasks", []),
                    "referencedTags": getattr(pred, "referenced_tags", []),
                    "executionTimeMs": round((time.time() - start_t) * 1000, 2)
                }
            except Exception as ex:
                pass

        # Deterministic High-Speed Fallback (<2ms)
        clean = user_query.lower()
        active = ["memory"]
        if any(w in clean for w in ["energy", "power", "temp", "trend", "month", "archive", "history", "6 month"]):
            active.append("telemetry")
        if any(w in clean for w in ["fault", "fdd", "chiller", "waste", "maintenance"]):
            active.append("fdd")
        if any(w in clean for w in ["driver", "modbus", "opc", "offline", "quality"]):
            active.append("diagnostic")
        if any(w in clean for w in ["oee", "downtime", "bottling", "cnc", "shift"]):
            active.append("oee")
        if any(w in clean for w in ["batch", "recipe", "lot", "recall"]):
            active.append("traceability")

        referenced = [t for t in registered_tags if t.lower() in clean][:5]

        return {
            "status": "SUCCESS",
            "engine": "DSPy_Deterministic_Fallback",
            "activeSpecialists": active,
            "timeHorizon": "6 Months (Archive)" if "6 month" in clean else "24 Hours",
            "subTasks": [f"Evaluate domain: {s}" for s in active],
            "referencedTags": referenced,
            "executionTimeMs": round((time.time() - start_t) * 1000, 2)
        }

# Global Orchestrator Instance
dspy_orchestrator = IndustrialDSPyOrchestrator()
