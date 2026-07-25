import json
from datetime import datetime
from database.database import SessionLocal
from database.models import (
    ContractReport, BusinessProfile, Document,
    AnalysisReport, AIMemory, Obligation
)


# ─── Existing Functions (preserved) ────────────────────────────────────────────

def save_report(filename, data):

    db = SessionLocal()

    report = ContractReport(
        filename=filename,
        language=data["language"],
        summary=data["summary"],
        risk_score=data["risk_score"],
        risk_level=data["risk_level"],
        red_flags="\n".join(data["red_flags"]),
        payment_terms=data["payment_terms"],
        termination_clause=data["termination_clause"],
        renewal_clause=data["renewal_clause"],
        simple_explanation=data["simple_explanation"],
    )

    db.add(report)
    db.commit()
    db.refresh(report)
    db.close()

    return report

def get_all_reports():

    db = SessionLocal()

    reports = db.query(ContractReport).order_by(
        ContractReport.id.desc()
    ).all()

    db.close()

    return reports


# ─── Business Profile CRUD ──────────────────────────────────────────────────────

def create_business_profile(data: dict) -> dict:
    db = SessionLocal()
    try:
        profile = BusinessProfile(
            name=data.get("name", "My Business"),
            industry=data.get("industry"),
            business_type=data.get("business_type"),
            size=data.get("size"),
            state=data.get("state"),
            gst_registered=data.get("gst_registered", False),
            gst_number=data.get("gst_number"),
            products_services=data.get("products_services"),
            employee_count=data.get("employee_count", 0),
            licenses=json.dumps(data.get("licenses", [])),
            compliance_categories=json.dumps(data.get("compliance_categories", [])),
            vendor_info=json.dumps(data.get("vendor_info", [])),
            customer_type=data.get("customer_type"),
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return _profile_to_dict(profile)
    finally:
        db.close()


def update_business_profile(profile_id: int, data: dict) -> dict:
    db = SessionLocal()
    try:
        profile = db.query(BusinessProfile).filter(BusinessProfile.id == profile_id).first()
        if not profile:
            return None

        for key, value in data.items():
            if key in ("licenses", "compliance_categories", "vendor_info"):
                setattr(profile, key, json.dumps(value))
            elif hasattr(profile, key) and key != "id":
                setattr(profile, key, value)

        profile.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(profile)
        return _profile_to_dict(profile)
    finally:
        db.close()


def get_business_profile(profile_id: int = None) -> dict:
    db = SessionLocal()
    try:
        if profile_id:
            profile = db.query(BusinessProfile).filter(BusinessProfile.id == profile_id).first()
        else:
            # Get the most recent profile (default for single-user hackathon mode)
            profile = db.query(BusinessProfile).order_by(BusinessProfile.id.desc()).first()

        if not profile:
            return None
        return _profile_to_dict(profile)
    finally:
        db.close()


def _profile_to_dict(profile: BusinessProfile) -> dict:
    return {
        "id": profile.id,
        "name": profile.name,
        "industry": profile.industry,
        "business_type": profile.business_type,
        "size": profile.size,
        "state": profile.state,
        "gst_registered": profile.gst_registered,
        "gst_number": profile.gst_number,
        "products_services": profile.products_services,
        "employee_count": profile.employee_count,
        "licenses": json.loads(profile.licenses or "[]"),
        "compliance_categories": json.loads(profile.compliance_categories or "[]"),
        "vendor_info": json.loads(profile.vendor_info or "[]"),
        "customer_type": profile.customer_type,
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
        "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
    }


# ─── Document CRUD ──────────────────────────────────────────────────────────────

def create_document(filename: str, file_path: str, extracted_text: str,
                    document_type: str = None, business_id: int = None) -> dict:
    db = SessionLocal()
    try:
        doc = Document(
            filename=filename,
            file_path=file_path,
            document_type=document_type,
            business_id=business_id,
            extracted_text=extracted_text,
            text_length=len(extracted_text) if extracted_text else 0,
            status="uploaded",
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return _document_to_dict(doc)
    finally:
        db.close()


def update_document_status(doc_id: int, status: str, document_type: str = None) -> dict:
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            return None
        doc.status = status
        if document_type:
            doc.document_type = document_type
        db.commit()
        db.refresh(doc)
        return _document_to_dict(doc)
    finally:
        db.close()


def get_document(doc_id: int) -> dict:
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            return None
        result = _document_to_dict(doc)
        # Include analysis report if available
        if doc.analysis_report:
            result["analysis"] = _analysis_to_dict(doc.analysis_report)
        return result
    finally:
        db.close()


def get_all_documents(limit: int = 50) -> list:
    db = SessionLocal()
    try:
        results = []
        docs = db.query(Document).order_by(Document.id.desc()).limit(limit).all()
        for d in docs:
            item = _document_to_dict(d)
            if d.analysis_report:
                item["analysis"] = _analysis_to_dict(d.analysis_report)
            results.append(item)

        # Include legacy ContractReport records if Document list is small
        if len(results) < limit:
            legacy_reports = db.query(ContractReport).order_by(ContractReport.id.desc()).limit(limit - len(results)).all()
            for leg in legacy_reports:
                results.append({
                    "id": 1000 + leg.id,
                    "filename": leg.filename or "Contract Agreement",
                    "file_path": leg.filename or "",
                    "document_type": "Vendor Agreement",
                    "business_id": 1,
                    "text_length": len(leg.summary or ""),
                    "status": "analyzed",
                    "upload_date": leg.created_at.isoformat() if leg.created_at else None,
                    "analysis": {
                        "executive_summary": leg.summary,
                        "document_type": "Vendor Agreement",
                        "risk_level": leg.risk_level or "Medium",
                        "risk_score": leg.risk_score or 75,
                        "business_context": "Analyzed for commercial compliance.",
                        "important_clauses": [
                            {"title": "Payment Terms", "explanation": leg.payment_terms or "N/A"},
                            {"title": "Termination Clause", "explanation": leg.termination_clause or "N/A"},
                            {"title": "Renewal Clause", "explanation": leg.renewal_clause or "N/A"}
                        ],
                        "deadlines": [],
                        "compliance_issues": [],
                        "business_impact": "Standard commercial obligations.",
                        "recommended_actions": [],
                        "government_references": [],
                        "prevention_analysis": {
                            "suits_business": True,
                            "suits_reasoning": "Standard commercial contract.",
                            "is_expected": True,
                            "is_expected_reasoning": "Expected contract format.",
                            "conflicts_with_previous": False,
                            "conflicts_reasoning": "No conflict detected.",
                            "unusual_obligations": [leg.red_flags or "Late fee penalty"],
                            "abnormal_payment_structure": False,
                            "payment_reasoning": "Within standard limits.",
                            "consult_lawyer": False,
                            "lawyer_consultation_reasoning": "Self-review OK."
                        },
                        "confidence_score": 0.9,
                        "language": leg.language or "English",
                        "summary": leg.summary,
                        "red_flags": [leg.red_flags or ""],
                        "payment_terms": leg.payment_terms,
                        "termination_clause": leg.termination_clause,
                        "renewal_clause": leg.renewal_clause,
                        "simple_explanation": leg.simple_explanation or leg.summary
                    }
                })

        return results
    finally:
        db.close()


def get_document_text(doc_id: int) -> str:
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        return doc.extracted_text if doc else None
    finally:
        db.close()


def _document_to_dict(doc: Document) -> dict:
    return {
        "id": doc.id,
        "filename": doc.filename,
        "file_path": doc.file_path,
        "document_type": doc.document_type,
        "business_id": doc.business_id,
        "text_length": doc.text_length,
        "status": doc.status,
        "upload_date": doc.upload_date.isoformat() if doc.upload_date else None,
    }


# ─── Analysis Report CRUD ───────────────────────────────────────────────────────

def save_analysis_report(document_id: int, business_id: int, data: dict) -> dict:
    db = SessionLocal()
    try:
        report = AnalysisReport(
            document_id=document_id,
            business_id=business_id,
            executive_summary=data.get("executive_summary"),
            document_type=data.get("document_type"),
            risk_level=data.get("risk_level"),
            risk_score=data.get("risk_score", 0),
            business_context=data.get("business_context"),
            important_clauses=json.dumps(data.get("important_clauses", [])),
            deadlines=json.dumps(data.get("deadlines", [])),
            compliance_issues=json.dumps(data.get("compliance_issues", [])),
            business_impact=data.get("business_impact"),
            recommended_actions=json.dumps(data.get("recommended_actions", [])),
            government_references=json.dumps(data.get("government_references", [])),
            confidence_score=data.get("confidence_score", 0.0),
            prevention_analysis=json.dumps(data.get("prevention_analysis", {})),
            # Legacy fields
            language=data.get("language", "English"),
            summary=data.get("summary"),
            red_flags=json.dumps(data.get("red_flags", [])),
            payment_terms=data.get("payment_terms"),
            termination_clause=data.get("termination_clause"),
            renewal_clause=data.get("renewal_clause"),
            simple_explanation=data.get("simple_explanation"),
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        return _analysis_to_dict(report)
    finally:
        db.close()


def get_analysis_report(document_id: int) -> dict:
    db = SessionLocal()
    try:
        report = db.query(AnalysisReport).filter(
            AnalysisReport.document_id == document_id
        ).first()
        if not report:
            return None
        return _analysis_to_dict(report)
    finally:
        db.close()


def _analysis_to_dict(report: AnalysisReport) -> dict:
    return {
        "id": report.id,
        "document_id": report.document_id,
        "business_id": report.business_id,
        "executive_summary": report.executive_summary,
        "document_type": report.document_type,
        "risk_level": report.risk_level,
        "risk_score": report.risk_score,
        "business_context": report.business_context,
        "important_clauses": json.loads(report.important_clauses or "[]"),
        "deadlines": json.loads(report.deadlines or "[]"),
        "compliance_issues": json.loads(report.compliance_issues or "[]"),
        "business_impact": report.business_impact,
        "recommended_actions": json.loads(report.recommended_actions or "[]"),
        "government_references": json.loads(report.government_references or "[]"),
        "confidence_score": report.confidence_score,
        "prevention_analysis": json.loads(report.prevention_analysis or "{}"),
        "language": report.language,
        "summary": report.summary,
        "red_flags": json.loads(report.red_flags or "[]"),
        "payment_terms": report.payment_terms,
        "termination_clause": report.termination_clause,
        "renewal_clause": report.renewal_clause,
        "simple_explanation": report.simple_explanation,
        "created_at": report.created_at.isoformat() if report.created_at else None,
    }


# ─── Obligation CRUD ────────────────────────────────────────────────────────────

def create_obligations(document_id: int, business_id: int, obligations_data: list) -> list:
    db = SessionLocal()
    try:
        results = []
        for obl in obligations_data:
            obligation = Obligation(
                business_id=business_id,
                document_id=document_id,
                description=obl.get("description", ""),
                due_date=obl.get("due_date"),
                status="active",
                priority=obl.get("priority", "medium"),
            )
            db.add(obligation)
            results.append(obligation)
        db.commit()
        return [_obligation_to_dict(o) for o in results]
    finally:
        db.close()


def get_obligations(business_id: int = None, status: str = None) -> list:
    db = SessionLocal()
    try:
        query = db.query(Obligation)
        if business_id:
            query = query.filter(Obligation.business_id == business_id)
        if status:
            query = query.filter(Obligation.status == status)
        obligations = query.order_by(Obligation.id.desc()).all()
        return [_obligation_to_dict(o) for o in obligations]
    finally:
        db.close()


def _obligation_to_dict(obl: Obligation) -> dict:
    return {
        "id": obl.id,
        "business_id": obl.business_id,
        "document_id": obl.document_id,
        "description": obl.description,
        "due_date": obl.due_date,
        "status": obl.status,
        "priority": obl.priority,
        "created_at": obl.created_at.isoformat() if obl.created_at else None,
    }


# ─── AI Memory CRUD ─────────────────────────────────────────────────────────────

def save_ai_memory(document_id: int, business_id: int,
                   analysis_type: str, ai_output: dict) -> dict:
    db = SessionLocal()
    try:
        memory = AIMemory(
            document_id=document_id,
            business_id=business_id,
            analysis_type=analysis_type,
            ai_output=json.dumps(ai_output),
        )
        db.add(memory)
        db.commit()
        db.refresh(memory)
        return {
            "id": memory.id,
            "document_id": memory.document_id,
            "analysis_type": memory.analysis_type,
        }
    finally:
        db.close()


def save_user_feedback(memory_id: int, corrections: dict) -> dict:
    db = SessionLocal()
    try:
        memory = db.query(AIMemory).filter(AIMemory.id == memory_id).first()
        if not memory:
            return None
        memory.user_corrections = json.dumps(corrections)
        db.commit()
        return {"id": memory.id, "status": "feedback_saved"}
    finally:
        db.close()


def get_business_memories(business_id: int, limit: int = 20) -> list:
    db = SessionLocal()
    try:
        memories = db.query(AIMemory).filter(
            AIMemory.business_id == business_id
        ).order_by(AIMemory.id.desc()).limit(limit).all()
        return [{
            "id": m.id,
            "document_id": m.document_id,
            "analysis_type": m.analysis_type,
            "ai_output": json.loads(m.ai_output or "{}"),
            "user_corrections": json.loads(m.user_corrections or "{}"),
            "created_at": m.created_at.isoformat() if m.created_at else None,
        } for m in memories]
    finally:
        db.close()


# ─── Dashboard Aggregation ───────────────────────────────────────────────────────

def get_dashboard_data(business_id: int = None) -> dict:
    db = SessionLocal()
    try:
        # Get or infer business_id
        if not business_id:
            profile = db.query(BusinessProfile).order_by(BusinessProfile.id.desc()).first()
            business_id = profile.id if profile else None

        # Total documents
        total_docs = db.query(Document).count()

        # Recent documents
        recent_docs = db.query(Document).order_by(
            Document.id.desc()
        ).limit(5).all()

        # Active obligations
        active_obligations = db.query(Obligation).filter(
            Obligation.status == "active"
        ).all()

        # All analysis reports for risk calculation
        reports = db.query(AnalysisReport).all()
        avg_risk = 0
        high_risk_count = 0
        if reports:
            scores = [r.risk_score for r in reports if r.risk_score]
            avg_risk = round(sum(scores) / len(scores)) if scores else 0
            high_risk_count = sum(1 for r in reports if r.risk_level in ("High", "Critical"))

        # Compliance issues across all reports
        all_compliance_issues = []
        for r in reports:
            issues = json.loads(r.compliance_issues or "[]")
            all_compliance_issues.extend(issues)

        return {
            "total_documents": total_docs,
            "avg_risk_score": avg_risk,
            "high_risk_count": high_risk_count,
            "active_obligations": len(active_obligations),
            "pending_deadlines": [_obligation_to_dict(o) for o in active_obligations if o.due_date],
            "recent_documents": [_document_to_dict(d) for d in recent_docs],
            "compliance_issues_count": len(all_compliance_issues),
            "total_analyses": len(reports),
        }
    finally:
        db.close()