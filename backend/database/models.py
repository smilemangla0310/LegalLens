from sqlalchemy import Column, Integer, String, DateTime, Text, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from database.database import Base


# ─── Existing Model (preserved) ────────────────────────────────────────────────

class ContractReport(Base):
    __tablename__ = "contract_reports"

    id = Column(Integer, primary_key=True, index=True)

    filename = Column(String)

    language = Column(String)

    summary = Column(String)

    risk_score = Column(Integer)

    risk_level = Column(String)

    red_flags = Column(String)

    payment_terms = Column(String)

    termination_clause = Column(String)

    renewal_clause = Column(String)

    simple_explanation = Column(String)

    created_at = Column(DateTime, default=datetime.utcnow)


# ─── New Models ─────────────────────────────────────────────────────────────────

class BusinessProfile(Base):
    __tablename__ = "business_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    industry = Column(String)
    business_type = Column(String)  # Proprietorship, Partnership, LLP, Pvt Ltd, etc.
    size = Column(String)  # Micro, Small, Medium
    state = Column(String)
    gst_registered = Column(Boolean, default=False)
    gst_number = Column(String, nullable=True)
    products_services = Column(Text)  # Nature of products/services
    employee_count = Column(Integer, default=0)
    licenses = Column(Text, default="[]")  # JSON array of license names
    compliance_categories = Column(Text, default="[]")  # JSON array
    vendor_info = Column(Text, default="[]")  # JSON array of vendor details
    customer_type = Column(String)  # B2B, B2C, Government, Mixed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    documents = relationship("Document", back_populates="business")
    analysis_reports = relationship("AnalysisReport", back_populates="business")
    obligations = relationship("Obligation", back_populates="business")
    memories = relationship("AIMemory", back_populates="business")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    document_type = Column(String)  # Contract, Legal Notice, Compliance Memo, Agreement, etc.
    business_id = Column(Integer, ForeignKey("business_profiles.id"), nullable=True)
    extracted_text = Column(Text)
    text_length = Column(Integer, default=0)
    status = Column(String, default="uploaded")  # uploaded, analyzing, analyzed, error
    upload_date = Column(DateTime, default=datetime.utcnow)

    # Relationships
    business = relationship("BusinessProfile", back_populates="documents")
    analysis_report = relationship("AnalysisReport", back_populates="document", uselist=False)
    obligations = relationship("Obligation", back_populates="document")
    memory = relationship("AIMemory", back_populates="document", uselist=False)


class AnalysisReport(Base):
    __tablename__ = "analysis_reports"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    business_id = Column(Integer, ForeignKey("business_profiles.id"), nullable=True)

    # Report sections
    executive_summary = Column(Text)
    document_type = Column(String)
    risk_level = Column(String)  # Low, Medium, High, Critical
    risk_score = Column(Integer)  # 0-100
    business_context = Column(Text)  # How this relates to the business
    important_clauses = Column(Text, default="[]")  # JSON array
    deadlines = Column(Text, default="[]")  # JSON array of {description, date, urgency}
    compliance_issues = Column(Text, default="[]")  # JSON array
    business_impact = Column(Text)
    recommended_actions = Column(Text, default="[]")  # JSON array of {action, priority, reasoning}
    government_references = Column(Text, default="[]")  # JSON array of {act, section, relevance}
    confidence_score = Column(Float, default=0.0)  # 0.0 - 1.0

    # Prevention layer
    prevention_analysis = Column(Text, default="{}")  # JSON: suits_business, conflicts, unusual_obligations, etc.

    # Original analysis fields (compatibility with existing format)
    language = Column(String)
    summary = Column(Text)
    red_flags = Column(Text, default="[]")  # JSON array
    payment_terms = Column(Text)
    termination_clause = Column(Text)
    renewal_clause = Column(Text)
    simple_explanation = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    document = relationship("Document", back_populates="analysis_report")
    business = relationship("BusinessProfile", back_populates="analysis_reports")


class AIMemory(Base):
    __tablename__ = "ai_memory"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    business_id = Column(Integer, ForeignKey("business_profiles.id"), nullable=True)
    analysis_type = Column(String)  # contract_analysis, prevention_check, chat, etc.
    ai_output = Column(Text, default="{}")  # JSON — full AI response
    user_corrections = Column(Text, default="{}")  # JSON — user feedback/corrections
    similar_case_ids = Column(Text, default="[]")  # JSON array of document IDs
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    document = relationship("Document", back_populates="memory")
    business = relationship("BusinessProfile", back_populates="memories")


class Obligation(Base):
    __tablename__ = "obligations"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("business_profiles.id"), nullable=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    description = Column(Text, nullable=False)
    due_date = Column(String, nullable=True)  # ISO date string or descriptive
    status = Column(String, default="active")  # active, completed, overdue, dismissed
    priority = Column(String, default="medium")  # low, medium, high, critical
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    business = relationship("BusinessProfile", back_populates="obligations")
    document = relationship("Document", back_populates="obligations")