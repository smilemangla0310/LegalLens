import json

def generate_structured_ai_report(analysis_dict: dict, document_filename: str = "") -> dict:
    """
    Formats the raw analysis dictionary into the standardized 11-section AI Legal Intelligence Report.
    """
    prevention = analysis_dict.get("prevention_analysis", {})

    report = {
        "title": f"Legal Intelligence Report - {document_filename}",
        "metadata": {
            "filename": document_filename,
            "document_type": analysis_dict.get("document_type", "Commercial Document"),
            "confidence_score": analysis_dict.get("confidence_score", 0.90),
            "language": analysis_dict.get("language", "English")
        },

        # Section 1: Executive Summary
        "executive_summary": analysis_dict.get("executive_summary", "No executive summary available."),

        # Section 2: Document Classification
        "document_type": analysis_dict.get("document_type", "General Agreement"),

        # Section 3: Risk Assessment
        "risk_assessment": {
            "risk_level": analysis_dict.get("risk_level", "Medium"),
            "risk_score": analysis_dict.get("risk_score", 50),
            "red_flags": analysis_dict.get("red_flags", [])
        },

        # Section 4: Business Context
        "business_context": analysis_dict.get("business_context", "Analysis grounded in MSME business operational context."),

        # Section 5: Important Clauses
        "important_clauses": analysis_dict.get("important_clauses", [
            {
                "title": "Payment Terms",
                "clause_text": analysis_dict.get("payment_terms", "N/A"),
                "explanation": analysis_dict.get("payment_terms", "N/A")
            },
            {
                "title": "Termination Clause",
                "clause_text": analysis_dict.get("termination_clause", "N/A"),
                "explanation": analysis_dict.get("termination_clause", "N/A")
            },
            {
                "title": "Renewal Clause",
                "clause_text": analysis_dict.get("renewal_clause", "N/A"),
                "explanation": analysis_dict.get("renewal_clause", "N/A")
            }
        ]),

        # Section 6: Deadlines & Time-Sensitive Obligations
        "deadlines": analysis_dict.get("deadlines", []),

        # Section 7: Statutory & Compliance Issues
        "compliance_issues": analysis_dict.get("compliance_issues", []),

        # Section 8: Potential Business Impact
        "business_impact": analysis_dict.get("business_impact", "Standard operational and financial commitment."),

        # Section 9: Recommended Actions
        "recommended_actions": analysis_dict.get("recommended_actions", []),

        # Section 10: Official Government & Statutory References (RAG)
        "government_references": analysis_dict.get("government_references", []),

        # Section 11: Prevention Layer Analysis
        "prevention_layer": {
            "suits_business": prevention.get("suits_business", True),
            "suits_reasoning": prevention.get("suits_reasoning", "Fits business profile."),
            "is_expected": prevention.get("is_expected", True),
            "is_expected_reasoning": prevention.get("is_expected_reasoning", "Standard industry document."),
            "conflicts_with_previous": prevention.get("conflicts_with_previous", False),
            "conflicts_reasoning": prevention.get("conflicts_reasoning", "No conflict identified."),
            "unusual_obligations": prevention.get("unusual_obligations", []),
            "abnormal_payment_structure": prevention.get("abnormal_payment_structure", False),
            "payment_reasoning": prevention.get("payment_reasoning", "Within statutory 45-day MSME window."),
            "should_consult_lawyer": prevention.get("consult_lawyer", False),
            "lawyer_consultation_reasoning": prevention.get("lawyer_consultation_reasoning", "Low risk profile.")
        },

        # Section 12: Vernacular / Simple Explanation
        "simple_explanation": analysis_dict.get("simple_explanation", analysis_dict.get("summary", ""))
    }

    return report
