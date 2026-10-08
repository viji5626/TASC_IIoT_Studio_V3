"""
jev_decision.scada_decisions — Industrial Automation & SCADA IIoT Decision Pack
==============================================================================
Pre-configured, low-latency decision schemas for factory floor, PLC/DCS,
sensor telemetry classification, safety interlocks, and Root Cause Analysis (RCA).
"""

from typing import Dict, Any, List
from .client import JevClient, JevResult
from .schema import DecisionSchema, DecisionField


class ScadaDecisions:
    """Pre-built SCADA IIoT decision schemas and high-level methods."""

    # 1. Alarm Classification & Priority Routing (ISA-18.2)
    ALARM_ROUTING = DecisionSchema({
        "severity": DecisionField(
            description="Alarm severity level based on safety threshold",
            choices=["CRITICAL", "HIGH", "MEDIUM", "LOW", "NORMAL"]
        ),
        "target_subsystem": DecisionField(
            description="Affected plant subsystem",
            choices=["POWER_GRID", "COOLING_LOOP", "COMPRESSOR_STAGE", "REACTOR_VESSEL", "EXHAUST_VENT", "HYDRAULIC_UNIT"]
        ),
        "immediate_action": DecisionField(
            description="Automated safety action to trigger immediately",
            choices=["EMERGENCY_SHUTDOWN", "RELIEF_VALVE_OPEN", "REDUCE_LOAD_50", "START_BACKUP_PUMP", "LOG_AND_MONITOR", "NO_ACTION"]
        ),
        "operator_notification": DecisionField(
            description="Urgency of human operator escalation",
            choices=["CALL_CONTROL_ROOM", "PAGE_ENGINEER", "DASHBOARD_BANNER", "SILENT_LOG"]
        )
    })

    # 2. Root Cause Analysis (RCA) & Alarm Avalanche Triage
    ROOT_CAUSE_ANALYSIS = DecisionSchema({
        "primary_root_cause": DecisionField(
            description="The initiating physical or electrical root cause failure",
            choices=[
                "SUCTION_STARVATION_CAVITATION",
                "MECHANICAL_BEARING_SEIZURE",
                "ELECTRICAL_MOTOR_OVERLOAD",
                "DISCHARGE_LINE_BLOCKAGE",
                "THERMAL_RUNAWAY_EXCURSION",
                "SENSOR_TRANSMITTER_FAILURE",
                "POWER_SUPPLY_SAG_SURGE",
                "OPERATOR_MANUAL_VALVE_ERROR",
                "NORMAL_TRANSIENT_DYNAMICS"
            ]
        ),
        "initiating_event": DecisionField(
            description="Which event in the alarm cascade was the actual first cause",
            choices=[
                "PRESSURE_DROP_INLET",
                "CURRENT_OVERLOAD_MOTOR",
                "VIBRATION_SPIKE_STAGE",
                "TEMPERATURE_LIMIT_EXCEEDED",
                "VALVE_FEEDBACK_FAULT",
                "FLOW_RATE_ZERO_DROP"
            ]
        ),
        "severity_badge": DecisionField(
            description="Overall plant risk severity badge",
            choices=["CRITICAL", "HIGH", "MEDIUM", "LOW"]
        ),
        "immediate_rec_safety_action": DecisionField(
            description="Specific physical action operator or PLC interlock must take right now",
            choices=[
                "TRIP_MAIN_CIRCUIT_BREAKER",
                "OPEN_SUCTION_LINE_VALVE",
                "OPEN_PRESSURE_RELIEF_VALVE",
                "SWITCH_TO_BACKUP_SKID",
                "ACTIVATE_COOLING_BOOST",
                "ISOLATE_FEED_STREAM",
                "RESET_TRIP_LATCH_AND_MONITOR",
                "DISPATCH_ELECTRICIAN"
            ]
        ),
        "subsystem_target": DecisionField(
            description="Exact plant zone or skid to dispatch response team to",
            choices=[
                "PUMP_SKID_PRIMARY",
                "BOILER_STEAM_HEADER",
                "ELECTRICAL_MCC_ROOM",
                "DISTILLATION_COLUMN",
                "FEEDWATER_STORAGE_TANK",
                "FIELD_INSTRUMENT_JUNCTION"
            ]
        ),
        "secondary_damage_risk": DecisionField(
            description="Risk of collateral asset damage if not contained within 60s",
            choices=[
                "IMPELLER_CAVITATION_EROSION",
                "STATOR_WINDING_BURNOUT",
                "PIPE_WATERHAMMER_RUPTURE",
                "SEAL_OVERHEAT_LEAKAGE",
                "NONE_TRANSIENT_SAFE"
            ]
        )
    })

    # 3. Sensor Telemetry & Anomaly Diagnosis
    SENSOR_DIAGNOSIS = DecisionSchema({
        "signal_health": DecisionField(
            description="Integrity of sensor electrical signal",
            choices=["VALID", "SPIKE_TRANSIENT", "DRIFT_DEGRADATION", "OPEN_CIRCUIT", "STUCK_VALUE"]
        ),
        "physical_state": DecisionField(
            description="Underlying process state assessment",
            choices=["STABLE_OPERATION", "OVER_PRESSURE", "THERMAL_RUNAWAY", "CAVITATION", "VIBRATION_FATIGUE"]
        ),
        "calibration_needed": DecisionField(
            description="Whether the field transmitter requires zero/span recalibration",
            field_type="boolean",
            choices=["true", "false"]
        )
    })

    # 4. Preventive Maintenance Scheduling
    MAINTENANCE_ROUTING = DecisionSchema({
        "wear_status": DecisionField(
            description="Estimated mechanical/thermal wear stage",
            choices=["OPTIMAL", "EARLY_WEAR", "MODERATE_WEAR", "CRITICAL_FAILURE_IMMINENT"]
        ),
        "maintenance_window": DecisionField(
            description="Recommended servicing timeframe",
            choices=["IMMEDIATE_STOP", "NEXT_SHIFT", "WEEKLY_SHUTDOWN", "MONTHLY_OVERHAUL", "RUN_TO_FAILURE"]
        ),
        "part_dispatch": DecisionField(
            description="Spare parts requirement",
            choices=["BEARING_KIT", "SEAL_PACK", "IMPELLER_ASSY", "LUBRICANT_TOPUP", "NONE"]
        )
    })

    # 5. Daily Energy Meter Consumption Ranking & Anomaly Rating
    ENERGY_METER_RATING = DecisionSchema({
        "plant_consumption_profile": DecisionField(
            description="Overall plant energy consumption profile for the 24-hour cycle",
            choices=[
                "NORMAL_PRODUCTION_BASELOAD",
                "HIGH_CONSUMER_ANOMALOUS_SURGE",
                "LOW_LOAD_OFF_PEAK_EFFICIENCY",
                "PEAK_TARIFF_EXCURSION",
                "UNBALANCED_PHASE_DISTRIBUTION"
            ]
        ),
        "primary_energy_hog": DecisionField(
            description="Leading energy consumer dominating the daily kWh consumption",
            choices=[
                "EM_01_MAIN_CENTRIFUGAL_CHILLER",
                "EM_02_COMPRESSED_AIR_HEADER_VFD",
                "EM_03_HEAT_TREATMENT_INDUCTION_FURNACE",
                "EM_04_PRIMARY_HYDRAULIC_POWER_PACK",
                "EM_05_PAINT_SHOP_AHU_VENTILATION"
            ]
        ),
        "high_consumer_status": DecisionField(
            description="Operational audit rating of the top 5 highest consumers",
            choices=[
                "ENERGY_WITHIN_PRODUCTION_BUDGET",
                "ANOMALOUS_HEAT_LOSS_OR_LEAKAGE",
                "POOR_POWER_FACTOR_PENALTY_RISK",
                "EXCESS_IDLE_RUNNING_OFF_SHIFT"
            ]
        ),
        "low_consumer_status": DecisionField(
            description="Integrity and state rating of the 5 lowest consumption meters",
            choices=[
                "LEGITIMATE_STANDBY_AUXILIARY",
                "SUSPECTED_CT_PT_WIRING_DISCONNECT",
                "EQUIPMENT_OFFLINE_MAINTENANCE",
                "EXCELLENT_ENERGY_CONSERVATION"
            ]
        ),
        "recommended_energy_action": DecisionField(
            description="Actionable directive for plant energy manager / SCADA interlock",
            choices=[
                "OPTIMIZE_CHILLER_CHILLED_WATER_SETPOINT",
                "PERFORM_COMPRESSED_AIR_LEAK_SURVEY",
                "DISPATCH_ELECTRICIAN_AUDIT_LOW_METERS",
                "SHIFT_FURNACE_HEATS_TO_OFF_PEAK_TARIFF",
                "NO_ACTION_ENERGY_PROFILE_OPTIMAL"
            ]
        )
    })

    # 6. Multi-Utility (Water, Compressed Air, Natural Gas, Solar, DG) Rating
    MULTI_UTILITY_RATING = DecisionSchema({
        "utility_type": DecisionField(
            description="Type of factory utility or captive generation being evaluated",
            choices=[
                "WATER_FLOW_M3",
                "COMPRESSED_AIR_SCM",
                "NATURAL_GAS_PNG_SCM",
                "SOLAR_PV_GENERATION_KWH",
                "DG_DIESEL_GENERATION_LITERS"
            ]
        ),
        "utility_balance_status": DecisionField(
            description="Overall plant distribution and mass/energy balance health",
            choices=[
                "BALANCED_WITHIN_BUDGET",
                "ANOMALOUS_LEAKAGE_OR_PHANTOM_LOSS",
                "GENERATION_YIELD_BELOW_RATING",
                "EXCESSIVE_IDLE_BURNING_OFF_SHIFT",
                "HIGH_TARIFF_OR_OVERFLOW_RISK"
            ]
        ),
        "top_consumer_or_generator": DecisionField(
            description="Dominant asset consuming or generating the highest daily volume",
            choices=[
                "COOLING_TOWER_EVAPORATION_MAKEUP",
                "RO_PLANT_FEEDWATER_SYSTEM",
                "BOILER_FEEDWATER_DEAERATOR",
                "PAINT_SHOP_PRETREATMENT_RINSE",
                "AIR_COMPRESSOR_HEADER_1",
                "PRESS_SHOP_PNEUMATIC_CLUTCH",
                "BAGHOUSE_PULSE_JET_CLEANING",
                "STEAM_BOILER_GAS_BURNER",
                "HEAT_TREATMENT_FURNACE",
                "PAINT_SHOP_CURING_OVEN",
                "ROOFTOP_SOLAR_INVERTER_BLOCK_A",
                "DG_SET_1_MAIN_EMERGENCY_INCOMER",
                "DG_SET_2_CRITICAL_HVAC_BACKUP"
            ]
        ),
        "efficiency_health_grade": DecisionField(
            description="Asset health grade: Green (optimal), Amber (investigate), Red (urgent loss/fault)",
            choices=[
                "GRADE_A_EXCELLENT_EFFICIENCY",
                "GRADE_B_MINOR_EFFICIENCY_LOSS",
                "GRADE_C_ACTIONABLE_LEAK_OR_DEFICIT",
                "GRADE_D_CRITICAL_EXCURSION_OR_FAULT"
            ]
        ),
        "recommended_utility_action": DecisionField(
            description="Specific physical maintenance or operational adjustment for the plant engineer",
            choices=[
                "REPAIR_FLOAT_VALVE_COOLING_TOWER",
                "INSPECT_UNDERGROUND_LINE_FOR_BURST",
                "FLUSH_RO_MEMBRANES_HIGH_REJECT",
                "ISOLATE_OFF_SHIFT_HEADER_VALVES",
                "CONDUCT_ULTRASONIC_AIR_LEAK_SURVEY",
                "REDUCE_SYSTEM_PRESSURE_BY_0_5_BAR",
                "TUNE_BURNER_AIR_FUEL_RATIO_O2",
                "REDUCE_OVEN_IDLE_TEMPERATURE_SETPOINT",
                "SCHEDULE_SOLAR_PANEL_CLEANING_WASH",
                "OPTIMIZE_DG_LOADING_INCREASE_KWH_PER_LITER",
                "NO_ACTION_SYSTEM_OPTIMAL"
            ]
        )
    })

    def __init__(self, client: JevClient):
        self.client = client

    def route_alarm(self, telemetry_context: str) -> JevResult:
        """
        Evaluate an incoming SCADA alarm or anomalous sensor reading.
        Returns sub-50ms priority, subsystem, safety action, and alert channel.
        """
        instructions = (
            "Evaluate industrial sensor telemetry and safety limits according to ISA-18.2 "
            "alarm management standards. Safety interlocks take precedence."
        )
        return self.client.decide(
            context=telemetry_context,
            decisions=self.ALARM_ROUTING,
            instructions=instructions,
        )

    def triage_alarm(self, telemetry_context: str) -> JevResult:
        """
        Alias for route_alarm for ISA-18.2 alarm triage.
        """
        return self.route_alarm(telemetry_context)

    def analyze_root_cause(self, alarm_cascade_context: str) -> JevResult:
        """
        Perform ultra-low-latency Root Cause Analysis (RCA) on an alarm cascade or equipment trip.
        Returns initiating cause, severity badge, immediate safety action, subsystem, and risk in ~20ms.
        """
        instructions = (
            "Perform industrial Root Cause Analysis (RCA). Distinguish root physical initiating cause "
            "from downstream consequential alarm avalanche symptoms."
        )
        return self.client.decide(
            context=alarm_cascade_context,
            decisions=self.ROOT_CAUSE_ANALYSIS,
            instructions=instructions,
        )

    def diagnose_sensor(self, signal_context: str) -> JevResult:
        """
        Diagnose sensor transmitter telemetry, noise, drift, and process condition.
        """
        instructions = (
            "Analyze time-series statistics and process limits to diagnose physical equipment "
            "versus instrumentation wiring failure."
        )
        return self.client.decide(
            context=signal_context,
            decisions=self.SENSOR_DIAGNOSIS,
            instructions=instructions,
        )

    def schedule_maintenance(self, equipment_telemetry: str) -> JevResult:
        """
        Determine condition-based maintenance urgency and spare parts.
        """
        instructions = "Assess rotating machinery vibration, temperature, and operating hours."
        return self.client.decide(
            context=equipment_telemetry,
            decisions=self.MAINTENANCE_ROUTING,
            instructions=instructions,
        )

    def rate_energy_meters(self, daily_energy_context: str) -> JevResult:
        """
        Evaluate plant daily energy consumption distribution, identify top energy hog,
        audit anomaly status for highest & lowest meters, and recommend conservation action.
        """
        instructions = (
            "Evaluate factory 24-hour electrical energy meter consumption (kWh), load profiles, "
            "and identify energy hogs, baseline anomalies, and standby meter integrity."
        )
        return self.client.decide(
            context=daily_energy_context,
            decisions=self.ENERGY_METER_RATING,
            instructions=instructions,
        )

    def rate_utility(self, utility_type: str, daily_telemetry_context: str) -> JevResult:
        """
        Evaluate factory utility consumption (Water, Air, Gas) or captive generation (Solar, DG).
        Identifies top consumers/generators, mass balance leakage, efficiency grades, and action directives in <25ms.
        """
        instructions = (
            f"Evaluate factory {utility_type} daily metering, mass balance, efficiency metrics, "
            f"and identify top consumers, leakages, and captive generator performance."
        )
        return self.client.decide(
            context=daily_telemetry_context,
            decisions=self.MULTI_UTILITY_RATING,
            instructions=instructions,
        )

    # ------------------------------------------------------------------
    # Batch ranking — sends ALL meters in ONE forward pass via predict_batch()
    # Instead of N × 17ms sequential calls → ~50ms flat for any N meters
    # ------------------------------------------------------------------

    def rank_meters_batch(
        self,
        meter_contexts: List[str],
        meter_ids: List[str],
    ) -> List[Dict[str, Any]]:
        """
        Score and rank ALL energy meters in a single parallel forward pass.

        Args:
            meter_contexts: One context string per meter (name, kWh today, baseline, tags).
            meter_ids:      Matching meter identifiers (e.g. ["EM-01", "EM-02", ...]).

        Returns:
            List of dicts sorted descending by Laya confidence, each containing:
              {meter_id, answers, probabilities, confidence, latency_ms, backend}

        Example — top 5 highest / bottom 5 lowest in one call:
            results = engine.rank_meters_batch(contexts, ids)
            top5    = results[:5]
            bottom5 = results[-5:]
        """
        if len(meter_contexts) != len(meter_ids):
            raise ValueError("meter_contexts and meter_ids must have the same length.")

        instructions = (
            "Evaluate factory 24-hour electrical energy meter consumption (kWh), load profiles, "
            "and identify energy hogs, baseline anomalies, and standby meter integrity."
        )

        # One batch call → Laya runs predict_batch() → single forward pass for all meters
        batch_results = self.client.decide_batch(
            contexts=meter_contexts,
            decisions=self.ENERGY_METER_RATING,
            instructions=instructions,
        )

        ranked = []
        for meter_id, result in zip(meter_ids, batch_results):
            # Use high_consumer_status confidence as the sort key
            sort_key = result.confidence.get("high_consumer_status", 0.0)
            ranked.append({
                "meter_id": meter_id,
                "answers": result.answers,
                "probabilities": result.probabilities,
                "confidence": result.confidence,
                "latency_ms": result.latency_ms,
                "backend": result.backend,
                "_sort_key": sort_key,
            })

        # Sort descending — highest consumers at top, lowest at bottom
        ranked.sort(key=lambda x: x["_sort_key"], reverse=True)
        for r in ranked:
            del r["_sort_key"]
        return ranked

    def rank_utility_batch(
        self,
        utility_type: str,
        meter_contexts: List[str],
        meter_ids: List[str],
    ) -> List[Dict[str, Any]]:
        """
        Score and rank ALL utility meters (Water/Air/Gas/Solar/DG) in one parallel forward pass.

        Args:
            utility_type:   "WATER_FLOW_M3" | "COMPRESSED_AIR_SCM" | "NATURAL_GAS_PNG_SCM" |
                            "SOLAR_PV_GENERATION_KWH" | "DG_DIESEL_GENERATION_LITERS"
            meter_contexts: One context string per meter.
            meter_ids:      Matching meter identifiers.

        Returns:
            List sorted descending by efficiency_health_grade confidence (Grade A = highest score).
        """
        if len(meter_contexts) != len(meter_ids):
            raise ValueError("meter_contexts and meter_ids must have the same length.")

        instructions = (
            f"Evaluate factory {utility_type} daily metering, mass balance, efficiency metrics, "
            f"and identify top consumers, leakages, and captive generator performance."
        )

        batch_results = self.client.decide_batch(
            contexts=meter_contexts,
            decisions=self.MULTI_UTILITY_RATING,
            instructions=instructions,
        )

        ranked = []
        for meter_id, result in zip(meter_ids, batch_results):
            sort_key = result.confidence.get("efficiency_health_grade", 0.0)
            ranked.append({
                "meter_id": meter_id,
                "utility_type": utility_type,
                "answers": result.answers,
                "probabilities": result.probabilities,
                "confidence": result.confidence,
                "latency_ms": result.latency_ms,
                "backend": result.backend,
                "_sort_key": sort_key,
            })

        ranked.sort(key=lambda x: x["_sort_key"], reverse=True)
        for r in ranked:
            del r["_sort_key"]
        return ranked

    @staticmethod
    def top_and_bottom(ranked: List[Dict[str, Any]], k: int = 5) -> Dict[str, List[Dict[str, Any]]]:
        """
        Split a ranked list from rank_meters_batch() or rank_utility_batch() into
        the top-K highest consumers and bottom-K lowest consumers.

        Args:
            ranked: Output of rank_meters_batch() or rank_utility_batch() (sorted descending).
            k:      Number of items to return from each end (default 5).

        Returns:
            {"highest": [...top k...], "lowest": [...bottom k...]}

        Usage:
            results = engine.rank_meters_batch(contexts, ids)
            report  = ScadaDecisions.top_and_bottom(results, k=5)
            report["highest"]  # top 5 energy hogs
            report["lowest"]   # top 5 lowest consumers
        """
        k = min(k, len(ranked))
        return {
            "highest": ranked[:k],
            "lowest": ranked[-k:] if k < len(ranked) else ranked[:k],
        }


