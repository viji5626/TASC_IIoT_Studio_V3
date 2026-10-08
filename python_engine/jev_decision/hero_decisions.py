"""
jev_decision.hero_decisions — Hero MotoCorp Manufacturing & Cost Intelligence Pack
==================================================================================
Pre-configured decision schemas for Hero MotoCorp executive leadership:
  1. Manufacturing Plant Sustainability & ESG Allocation (Super Splendor, Splendor+, Vida EV)
  2. Cross-Plant OPEX & Utility Benchmark Leadership (Dharuhera vs Haridwar vs Neemrana)
  3. Chassis & Suspension Component Cross-Plant Purchase Price Variance (PPV Arbitrage)
  4. Ideathon VAVE Proposal P0 Safety & Double-Counting Governance Gates
"""

from typing import Dict, Any, List
from .client import JevClient, JevResult
from .schema import DecisionSchema, DecisionField


class HeroDecisions:
    """Hero MotoCorp Enterprise Decision Engine."""

    # ─────────────────────────────────────────────────────────────────────────
    # SCENARIO 1: Manufacturing Plant Sustainability & ESG Allocation
    # ─────────────────────────────────────────────────────────────────────────
    PLANT_SUSTAINABILITY = DecisionSchema({
        "most_sustainable_plant": DecisionField(
            description="Hero MotoCorp manufacturing plant with highest sustainability rating for this vehicle model",
            choices=[
                "PLANT_D_NEEMRANA",    # Garden Factory, LEED Platinum, 10MW Solar, Zero Liquid Discharge
                "PLANT_A_DHARUHERA",   # Benchmark OPEX, High-efficiency utility infrastructure
                "PLANT_C_HARIDWAR",    # High-volume mass manufacturing hub
                "PLANT_B_GURUGRAM",    # Legacy flagship facility
                "PLANT_E_HALOL",       # Gujarat manufacturing hub
                "PLANT_F_CHITTOOR"     # Southern greenfield manufacturing facility
            ]
        ),
        "primary_esg_driver": DecisionField(
            description="The leading environmental sustainability factor determining this selection",
            choices=[
                "SOLAR_ROOFTOP_RENEWABLE_RATIO",
                "ZERO_LIQUID_DISCHARGE_WATER_RECYCLE",
                "SPECIFIC_POWER_KWH_PER_VEHICLE",
                "GREEN_BUILDING_LEED_PLATINUM",
                "LOCALIZED_GREEN_SUPPLY_CHAIN"
            ]
        ),
        "logistics_cost_tradeoff": DecisionField(
            description="Impact on outbound freight logistics and distribution costs",
            choices=[
                "OPTIMAL_NORTH_INDIA_DISTRIBUTION",
                "SLIGHT_FREIGHT_PENALTY_OFFSET_BY_SOLAR_SAVINGS",
                "SIGNIFICANT_LOGISTICS_COST_PENALTY",
                "NEUTRAL_FREIGHT_IMPACT"
            ]
        ),
        "recommended_strategic_action": DecisionField(
            description="Executive strategic allocation directive for CTO / COO",
            choices=[
                "ALLOCATE_FULL_VOLUME_TO_NEEMRANA",
                "SPLIT_VOLUME_NEEMRANA_DHARUHERA_80_20",
                "RETAIN_HIGH_VOLUME_AT_HARIDWAR_UPGRADE_SOLAR",
                "CONDUCT_DETAILED_CARBON_AUDIT_FIRST"
            ]
        )
    })

    # ─────────────────────────────────────────────────────────────────────────
    # SCENARIO 2: Cross-Plant OPEX & Utility Benchmark Leadership
    # ─────────────────────────────────────────────────────────────────────────
    OPEX_BENCHMARK_LEADER = DecisionSchema({
        "benchmark_leader_plant": DecisionField(
            description="Plant setting the gold standard efficiency benchmark for this utility/cost line",
            choices=[
                "PLANT_A_DHARUHERA",
                "PLANT_C_HARIDWAR",
                "PLANT_D_NEEMRANA",
                "PLANT_B_GURUGRAM",
                "PLANT_E_HALOL",
                "PLANT_F_CHITTOOR"
            ]
        ),
        "efficiency_gap_status": DecisionField(
            description="Magnitude of performance gap across remaining peer plants",
            choices=["NARROW_UNDER_5_PCT", "MODERATE_5_TO_15_PCT", "SEVERE_OVER_15_PCT"]
        ),
        "transferable_practice": DecisionField(
            description="Key operational practice responsible for the benchmark performance",
            choices=[
                "VARIABLE_SPEED_COMPRESSOR_SEQUENCING",
                "HEAT_RECOVERY_FROM_PAINT_SHOP_OVENS",
                "AI_PREDICTIVE_CHILLER_OPTIMIZATION",
                "LIGHTING_ZONING_AND_OCCUPANCY_SENSING"
            ]
        ),
        "annual_savings_potential": DecisionField(
            description="Potential annual financial OPEX reduction if practice is scaled",
            choices=["HIGH_ABOVE_5_CRORES", "MEDIUM_1_TO_5_CRORES", "LOW_UNDER_1_CRORE"]
        )
    })

    # ─────────────────────────────────────────────────────────────────────────
    # SCENARIO 3: Component Cross-Plant Purchase Price Variance (PPV)
    # ─────────────────────────────────────────────────────────────────────────
    PURCHASE_PRICE_VARIANCE = DecisionSchema({
        "highest_variance_component": DecisionField(
            description="BOM component exhibiting the highest unjustified purchase price variance across plants",
            choices=[
                "FRONT_FORK_ASSEMBLY_51400_KCC_900",
                "REAR_CUSHION_SHOCK_ABSORBER",
                "FUEL_TANK_STAMPING_ASSEMBLY",
                "CYLINDER_HEAD_ALUMINUM_CASTING",
                "ALLOY_WHEEL_RIM_ASSEMBLY",
                "MAIN_WIRING_HARNESS_LOOM"
            ]
        ),
        "benchmark_cost_plant": DecisionField(
            description="Plant securing the lowest landed component price",
            choices=["PLANT_C_HARIDWAR", "PLANT_A_DHARUHERA", "PLANT_E_HALOL", "PLANT_D_NEEMRANA"]
        ),
        "primary_variance_driver": DecisionField(
            description="Root cause commercial mechanism driving price discrepancy",
            choices=[
                "TIER_1_SUPPLIER_VOLUME_SCALE_DISCOUNT",
                "LOCALIZED_RAW_MATERIAL_COMMODITY_INDEX",
                "LOGISTICS_AND_FREIGHT_INWARD_COST",
                "UNALIGNED_PROCUREMENT_CONTRACT_TERMS"
            ]
        ),
        "procurement_arbitrage_action": DecisionField(
            description="Recommended commercial action for Chief Procurement Officer (CPO)",
            choices=[
                "CONSOLIDATE_ANNUAL_VOLUME_WITH_LOWEST_VENDOR",
                "RENEGOTIATE_PEER_CONTRACT_USING_HARIDWAR_BENCHMARK",
                "DUAL_SOURCE_WITH_LOCALIZED_SUPPLIER",
                "CONDUCT_SHOULD_COST_TEARDOWN_AUDIT"
            ]
        )
    })

    # ─────────────────────────────────────────────────────────────────────────
    # SCENARIO 4: Ideathon VAVE Proposal P0 Safety & Double-Counting Governance
    # ─────────────────────────────────────────────────────────────────────────
    IDEATHON_GOVERNANCE_GATE = DecisionSchema({
        "governance_disposition": DecisionField(
            description="Automated approval routing decision for ideathon cost-reduction proposal",
            choices=[
                "AUTO_APPROVE_LOW_RISK_OPEX",
                "MANDATORY_HUMAN_SAFETY_QUEUE_P0",
                "FLAG_DOUBLE_COUNTING_VIOLATION_P7",
                "INSUFFICIENT_EVIDENCE_REVISION_REQUIRED"
            ]
        ),
        "safety_criticality_tier": DecisionField(
            description="Vehicle functional safety risk tier",
            choices=[
                "CRITICAL_P0_STEERING_BRAKING_CHASSIS",
                "IMPORTANT_P1_POWERTRAIN_DURABILITY",
                "LOW_RISK_P2_AESTHETICS_TRIM_PACKAGING"
            ]
        ),
        "evidence_verification_state": DecisionField(
            description="Maturity and rigor of attached engineering validation data",
            choices=[
                "RIGOROUS_CAE_AND_DYN_TESTED",
                "PRELIMINARY_CAD_ESTIMATE_ONLY",
                "DUPLICATE_PRIOR_YEAR_IMPLEMENTATION",
                "UNSUBSTANTIATED_CONCEPT"
            ]
        ),
        "review_committee_routing": DecisionField(
            description="Designated leadership body required for sign-off",
            choices=[
                "CENTRAL_SAFETY_DIRECTORATE",
                "PLANT_VAVE_ENGINEERING_COMMITTEE",
                "FINANCE_CONTROLLER_AUDIT",
                "NO_COMMITTEE_AUTOMATED_RELEASE"
            ]
        )
    })

    def __init__(self, client: JevClient):
        self.client = client

    def decide_sustainable_plant(self, vehicle_model: str, operational_context: str) -> JevResult:
        """Scenario 1: Evaluate manufacturing plant sustainability for vehicle production."""
        instructions = (
            f"Evaluate Hero MotoCorp manufacturing plants for production of {vehicle_model}. "
            f"Factor in plant renewable energy mix (solar MW), Zero Liquid Discharge water status, "
            f"specific energy consumption per vehicle, and logistics distribution footprint. "
            f"Neemrana is the benchmark Garden Factory (LEED Platinum); Dharuhera is the OPEX leader; "
            f"Haridwar is the high-volume hub."
        )
        full_context = f"VEHICLE MODEL: {vehicle_model}\n{operational_context}"
        return self.client.decide(context=full_context, decisions=self.PLANT_SUSTAINABILITY, instructions=instructions)

    def decide_opex_leader(self, utility_cost_category: str, telemetry_context: str) -> JevResult:
        """Scenario 2: Identify the benchmark efficiency plant and transferable practices for an OPEX cost line."""
        instructions = (
            f"Identify which Hero MotoCorp plant is the benchmark leader for {utility_cost_category} "
            f"and determine the primary operational practice that should be scaled enterprise-wide."
        )
        full_context = f"COST LINE: {utility_cost_category}\n{telemetry_context}"
        return self.client.decide(context=full_context, decisions=self.OPEX_BENCHMARK_LEADER, instructions=instructions)

    def decide_component_ppv(self, vehicle_assembly: str, procurement_context: str) -> JevResult:
        """Scenario 3: Analyze component Purchase Price Variance across plants for commercial arbitrage."""
        instructions = (
            f"Analyze component purchase price variances across Hero plants for {vehicle_assembly}. "
            f"Identify the component with the largest arbitrage gap and recommend the CPO negotiation strategy."
        )
        full_context = f"ASSEMBLY: {vehicle_assembly}\n{procurement_context}"
        return self.client.decide(context=full_context, decisions=self.PURCHASE_PRICE_VARIANCE, instructions=instructions)

    def evaluate_ideathon_proposal(self, idea_context: str) -> JevResult:
        """Scenario 4: Evaluate an Ideathon VAVE proposal against safety P0 and double-counting governance gates."""
        instructions = (
            "Evaluate ideathon cost reduction submission against corporate governance invariants. "
            "Safety-critical systems (steering, braking, structural chassis) MUST be routed to MANDATORY_HUMAN_SAFETY_QUEUE_P0. "
            "Submissions claiming savings already recognized in baseline MUST be FLAGGED_DOUBLE_COUNTING_P7."
        )
        return self.client.decide(context=idea_context, decisions=self.IDEATHON_GOVERNANCE_GATE, instructions=instructions)
