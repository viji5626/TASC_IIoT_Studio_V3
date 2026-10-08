"""
jev_decision.cost_decisions — Cost Intelligence & Financial Decision Pack
========================================================================
Pre-configured, low-latency decision schemas for transaction categorization,
procurement policy approvals, budget anomaly gating, and multi-currency routing.
"""

from typing import Dict, Any, List
from .client import JevClient, JevResult
from .schema import DecisionSchema, DecisionField


class CostDecisions:
    """Pre-built Cost Intelligence decision schemas and high-level methods."""

    # 1. Invoice & Expense Categorization
    SPEND_CATEGORIZATION = DecisionSchema({
        "gl_category": DecisionField(
            description="General Ledger expense account classification",
            choices=[
                "CLOUD_INFRASTRUCTURE", "SOFTWARE_SAAS", "OFFICE_SUPPLIES",
                "TRAVEL_ENTERTAINMENT", "HARDWARE_CAPEX", "CONTRACTOR_SERVICES",
                "MARKETING_ADVERTISING", "LEGAL_COMPLIANCE", "RAW_MATERIALS"
            ]
        ),
        "department": DecisionField(
            description="Responsible corporate department or cost center",
            choices=["ENGINEERING", "PRODUCT", "SALES", "MARKETING", "FINANCE", "OPERATIONS", "EXECUTIVE"]
        ),
        "tax_deductible": DecisionField(
            description="Whether the expense qualifies as tax deductible operational expenditure",
            field_type="boolean",
            choices=["true", "false"]
        )
    })

    # 2. Spend Approval & Policy Routing
    APPROVAL_ROUTING = DecisionSchema({
        "approval_action": DecisionField(
            description="Immediate policy approval disposition",
            choices=["AUTO_APPROVE", "ROUTED_TO_MANAGER", "ROUTED_TO_VP", "ROUTED_TO_CFO", "FLAG_POLICY_VIOLATION", "HARD_REJECT"]
        ),
        "risk_level": DecisionField(
            description="Fraud, duplicate billing, or compliance risk level",
            choices=["VERY_LOW", "LOW", "MODERATE", "ELEVATED", "CRITICAL_FRAUD_RISK"]
        ),
        "documentation_status": DecisionField(
            description="Sufficiency of provided receipts, invoices, or PO references",
            choices=["COMPLETE_VERIFIED", "MISSING_RECEIPT", "PO_MISMATCH", "UNAUTHORIZED_VENDOR"]
        )
    })

    # 3. Anomaly & Budget Drift Detection
    BUDGET_ANOMALY = DecisionSchema({
        "anomaly_flag": DecisionField(
            description="Whether the spend pattern deviates significantly from baseline",
            choices=["NORMAL_EXPECTED", "SEASONAL_SURGE", "UNEXPECTED_SPIKE", "RECURRING_LEAK", "DUPLICATE_CHARGE"]
        ),
        "recommendation": DecisionField(
            description="Recommended cost optimization action",
            choices=["NO_ACTION_REQUIRED", "RENEGOTIATE_CONTRACT", "DOWNSIZE_SUBSCRIPTION", "FREEZE_ACCOUNT", "AUDIT_VENDOR"]
        ),
        "estimated_savings_potential": DecisionField(
            description="Potential savings impact if remediated",
            choices=["NEGLIGIBLE_UNDER_100", "LOW_100_1000", "MEDIUM_1000_10000", "HIGH_OVER_10000"]
        )
    })

    def __init__(self, client: JevClient):
        self.client = client

    def categorize_transaction(self, transaction_context: str) -> JevResult:
        """
        Classify transaction vendor, description, amount, and department in sub-50ms.
        """
        instructions = "Categorize spend into standard corporate chart of accounts (GAAP compliant)."
        return self.client.decide(
            context=transaction_context,
            decisions=self.SPEND_CATEGORIZATION,
            instructions=instructions,
        )

    def route_approval(self, approval_context: str) -> JevResult:
        """
        Assess corporate expense against spending authority limits and vendor policy.
        """
        instructions = (
            "Evaluate spending limits: <$500 auto-approve if compliant; $500-$5000 manager; "
            "$5000-$50000 VP; >$50000 CFO. Flag unauthorized vendors."
        )
        return self.client.decide(
            context=approval_context,
            decisions=self.APPROVAL_ROUTING,
            instructions=instructions,
        )

    def detect_budget_anomaly(self, spend_history_context: str) -> JevResult:
        """
        Analyze spend variance, recurring subscription creep, and anomalous spikes.
        """
        instructions = "Detect cost anomalies and recommend immediate containment actions."
        return self.client.decide(
            context=spend_history_context,
            decisions=self.BUDGET_ANOMALY,
            instructions=instructions,
        )
