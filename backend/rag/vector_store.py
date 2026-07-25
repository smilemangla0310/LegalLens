import os
import math
from rag.embeddings import get_embedding

class VectorStore:
    """
    Vector store manager.
    Supports ChromaDB if installed, with a pure Python in-memory fallback.
    """

    def __init__(self, collection_name: str = "legal_knowledge", persist_dir: str = "./chroma_db"):
        self.collection_name = collection_name
        self.persist_dir = persist_dir
        self.chroma_client = None
        self.collection = None
        self.fallback_docs = []  # [{id, text, metadata, embedding}]

        self._init_store()

    def _init_store(self):
        try:
            import chromadb
            os.makedirs(self.persist_dir, exist_ok=True)
            self.chroma_client = chromadb.PersistentClient(path=self.persist_dir)
            self.collection = self.chroma_client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            print(f"[VectorStore] ChromaDB collection '{self.collection_name}' initialized.")
        except Exception as e:
            print(f"[VectorStore] ChromaDB initialization skipped/failed: {e}. Using local in-memory vector store.")

    def add_documents(self, documents: list[str], metadatas: list[dict] = None, ids: list[str] = None):
        """Add text documents and their embeddings to store."""
        if not documents:
            return

        if ids is None:
            ids = [f"doc_{i}_{hash(doc) & 0xffffffff}" for i, doc in enumerate(documents)]
        if metadatas is None:
            metadatas = [{} for _ in documents]

        embeddings = [get_embedding(doc) for doc in documents]

        if self.collection:
            try:
                self.collection.upsert(
                    documents=documents,
                    embeddings=embeddings,
                    metadatas=metadatas,
                    ids=ids
                )
                return
            except Exception as e:
                print(f"[VectorStore] ChromaDB upsert error: {e}. Falling back to in-memory store.")

        # Fallback storage
        for doc, meta, doc_id, emb in zip(documents, metadatas, ids, embeddings):
            self.fallback_docs.append({
                "id": doc_id,
                "text": doc,
                "metadata": meta,
                "embedding": emb
            })

    def query(self, query_text: str, top_k: int = 3, filter_metadata: dict = None) -> list[dict]:
        """Query store for most relevant documents."""
        query_emb = get_embedding(query_text)

        if self.collection:
            try:
                kwargs = {
                    "query_embeddings": [query_emb],
                    "n_results": top_k
                }
                if filter_metadata:
                    kwargs["where"] = filter_metadata

                results = self.collection.query(**kwargs)
                formatted = []
                if results and results.get("documents") and results["documents"][0]:
                    for i in range(len(results["documents"][0])):
                        formatted.append({
                            "text": results["documents"][0][i],
                            "metadata": results["metadatas"][0][i] if results.get("metadatas") else {},
                            "score": float(results["distances"][0][i]) if results.get("distances") else 0.0,
                            "id": results["ids"][0][i] if results.get("ids") else ""
                        })
                return formatted
            except Exception as e:
                print(f"[VectorStore] ChromaDB query error: {e}. Using fallback query.")

        # Fallback cosine similarity
        results = []
        for doc in self.fallback_docs:
            if filter_metadata:
                match = all(doc["metadata"].get(k) == v for k, v in filter_metadata.items())
                if not match:
                    continue
            sim = self._cosine_similarity(query_emb, doc["embedding"])
            results.append({
                "text": doc["text"],
                "metadata": doc["metadata"],
                "score": sim,
                "id": doc["id"]
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    @staticmethod
    def _cosine_similarity(vec1: list[float], vec2: list[float]) -> float:
        if not vec1 or not vec2 or len(vec1) != len(vec2):
            return 0.0
        dot = sum(a * b for a, b in zip(vec1, vec2))
        norm1 = math.sqrt(sum(a * a for a in vec1))
        norm2 = math.sqrt(sum(b * b for b in vec2))
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return dot / (norm1 * norm2)
