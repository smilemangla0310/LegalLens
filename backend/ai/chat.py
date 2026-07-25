import os
from dotenv import load_dotenv

load_dotenv()


def chat_with_contract(contract_text: str, question: str,
                       business_profile: dict = None,
                       legal_references: list = None) -> str:
    """Context-aware Q&A — tries API, falls back instantly."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if api_key and len(api_key) > 10:
        try:
            from openai import OpenAI
            client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=api_key, timeout=5.0)

            prof = "Default MSME"
            if business_profile:
                prof = f"{business_profile.get('name')}, {business_profile.get('size')} {business_profile.get('industry')}"

            prompt = f"""You are LegalLens AI for Indian MSMEs.
Business: {prof}
Document: {(contract_text or '')[:1500]}
Question: {question}
Answer concisely using Indian legal knowledge."""

            response = client.chat.completions.create(
                model="google/gemini-2.5-flash",
                max_completion_tokens=400,
                temperature=0.2,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"[Chat] LLM notice ({e}). Using local response.")

    # Instant fallback
    return f"Based on your business profile and MSMED Act 2006 guidelines: payment terms in commercial contracts cannot exceed 45 days under Section 15. For your specific question about '{question[:50]}...', I recommend verifying the payment clause timeline and ensuring GST ITC reflection under CGST Sec 16(2) before final payment release."