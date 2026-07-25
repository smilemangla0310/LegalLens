from database.database import engine
from database.models import Base
from services.business_service import get_or_create_default_profile
from rag.knowledge_loader import load_and_index_legal_knowledge

# Create all database tables
Base.metadata.create_all(bind=engine)
print("Database Tables Created Successfully!")

# Initialize default business profile
profile = get_or_create_default_profile()
print(f"Default Business Profile Initialized: '{profile['name']}' ({profile['industry']})")

# Seed official legal knowledge base for RAG
total_indexed = load_and_index_legal_knowledge()
print(f"Legal Knowledge Base Seeded: {total_indexed} chunks indexed.")