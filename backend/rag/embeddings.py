import os
import math
import re
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

_client = None

def get_client():
    global _client
    if _client is None:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if api_key:
            _client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=api_key
            )
    return _client


def get_embedding(text: str) -> list[float]:
    """
    Generate an embedding vector for a given text snippet.
    Uses OpenRouter API when available, with a fallback vectorizer if unavailable.
    """
    text = text.replace("\n", " ").strip()
    if not text:
        return [0.0] * 384

    client = get_client()
    if client:
        try:
            response = client.embeddings.create(
                model="text-embedding-3-small",
                input=[text[:2000]]
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"[Embeddings] API call failed ({e}), using fallback embedding.")
    
    return _fallback_embedding(text)


def _fallback_embedding(text: str, dim: int = 384) -> list[float]:
    """
    Deterministic pseudo-embedding for local offline/fallback execution.
    Computes character n-gram hashing into fixed dimension.
    """
    vec = [0.0] * dim
    words = re.findall(r'\w+', text.lower())
    if not words:
        return vec
    
    for word in words:
        idx = hash(word) % dim
        vec[idx] += 1.0
    
    # L2 normalize
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [x / norm for x in vec]
    return vec
