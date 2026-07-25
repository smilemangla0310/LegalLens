import os
import shutil
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List

from ai.analyzer import analyze_contract
from services.pdf_service import extract_text_from_pdf
from database.crud import (
    save_report,
    get_all_reports,
    get_all_documents,
    get_document,
    get_analysis_report,
    get_dashboard_data,
    get_obligations,
    save_user_feedback
)
from services.business_service import (
    get_or_create_default_profile,
    update_profile
)
from services.document_service import process_and_analyze_document
from ai.chat import chat_with_contract
from rag.retriever import retrieve_relevant_legal_references
from ai.report_generator import generate_structured_ai_report


app = FastAPI(
    title="LegalLens Intelligence Platform API",
    description="AI-Powered Context-Aware Legal Intelligence for MSMEs",
    version="2.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows localhost:3000 and any origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Pydantic Request Models ───────────────────────────────────────────────────

class ProfileUpdateRequest(BaseModel):
    name: str
    industry: Optional[str] = "Manufacturing"
    business_type: Optional[str] = "Private Limited"
    size: Optional[str] = "Small"
    state: Optional[str] = "Maharashtra"
    gst_registered: Optional[bool] = True
    gst_number: Optional[str] = None
    products_services: Optional[str] = None
    employee_count: Optional[int] = 10
    licenses: Optional[List[str]] = []
    compliance_categories: Optional[List[str]] = []
    vendor_info: Optional[List[str]] = []
    customer_type: Optional[str] = "B2B"


class ChatRequest(BaseModel):
    document_id: Optional[int] = None
    contract_text: Optional[str] = None
    question: str


class FeedbackRequest(BaseModel):
    memory_id: int
    corrections: dict


# ─── Preserved Existing Endpoints ──────────────────────────────────────────────

@app.get("/")
def home():
    return {
        "status": "online",
        "message": "LegalLens Legal Intelligence Platform API v2.0 🚀",
        "features": ["Business Context", "RAG Pipeline", "Prevention Layer", "11-Section AI Report"]
    }


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Preserved original endpoint for backward compatibility.
    """
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{file.filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    extracted_text = extract_text_from_pdf(file_path)
    analysis = analyze_contract(extracted_text[:1500])
    save_report(file.filename, analysis)

    return analysis


@app.get("/history")
def history():
    """
    Preserved original history endpoint.
    """
    reports = get_all_reports()
    return reports


# ─── New Intelligence Platform Endpoints ─────────────────────────────────────

# 1. Business Profile Endpoints
@app.get("/api/business/profile")
def get_profile():
    """Get current MSME business profile context."""
    profile = get_or_create_default_profile()
    return profile


@app.post("/api/business/profile")
def update_business_profile_endpoint(profile_data: ProfileUpdateRequest):
    """Create or update business profile."""
    updated = update_profile(profile_data.dict())
    return updated


# 2. Enhanced Document Upload & Context-Aware Analysis
@app.post("/api/documents/analyze")
async def analyze_document_enhanced(
    file: Optional[UploadFile] = File(None),
    text_content: Optional[str] = Form(None),
    language: Optional[str] = Form("English")
):
    """
    Full context-aware analysis with OCR, RAG legal references, and Prevention Layer.
    Accepts PDF upload OR raw text content.
    """
    os.makedirs("uploads", exist_ok=True)

    if file:
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        filename = file.filename
    elif text_content and len(text_content.strip()) > 0:
        filename = "pasted_document.txt"
        file_path = f"uploads/{filename}"
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(text_content)
    else:
        raise HTTPException(status_code=400, detail="Either a file upload or text content must be provided.")

    result = process_and_analyze_document(file_path, filename, language=language)
    return result


# 3. Document Management Endpoints
@app.get("/api/documents")
def list_documents():
    """Get list of all uploaded documents."""
    return get_all_documents()


@app.get("/api/documents/{doc_id}")
def get_single_document(doc_id: int):
    """Get document details with analysis."""
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc


@app.get("/api/documents/{doc_id}/report")
def get_document_report(doc_id: int):
    """Get structured 11-section AI Legal Report."""
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    analysis = get_analysis_report(doc_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis report not found for this document.")

    report = generate_structured_ai_report(analysis, document_filename=doc["filename"])
    return report


# 4. AI Dashboard Aggregation Endpoint
@app.get("/api/dashboard")
def get_dashboard():
    """Get aggregated MSME Dashboard data."""
    profile = get_or_create_default_profile()
    data = get_dashboard_data(business_id=profile["id"])
    data["business_profile"] = profile
    return data


# 5. Obligations Endpoint
@app.get("/api/obligations")
def list_obligations():
    """List active obligations and deadlines."""
    profile = get_or_create_default_profile()
    return get_obligations(business_id=profile["id"])


# 6. Context-Aware AI Chat
@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
    """
    Q&A with document text, business profile, and RAG legal knowledge.
    """
    doc_text = req.contract_text or ""
    if req.document_id and not doc_text:
        doc = get_document(req.document_id)
        if doc:
            from database.crud import get_document_text
            doc_text = get_document_text(req.document_id) or ""

    profile = get_or_create_default_profile()
    legal_refs = retrieve_relevant_legal_references(doc_text or req.question, top_k=2)

    response = chat_with_contract(
        contract_text=doc_text,
        question=req.question,
        business_profile=profile,
        legal_references=legal_refs
    )
    return {"answer": response, "legal_references": legal_refs}


# 7. AI Memory Feedback Endpoint
@app.post("/api/memory/feedback")
def submit_feedback(req: FeedbackRequest):
    """Save user corrections to improve AI memory."""
    res = save_user_feedback(req.memory_id, req.corrections)
    if not res:
        raise HTTPException(status_code=404, detail="Memory entry not found.")
    return res