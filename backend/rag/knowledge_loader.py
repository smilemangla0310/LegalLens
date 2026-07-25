import os
import glob
from rag.vector_store import VectorStore

def load_and_index_legal_knowledge(store: VectorStore = None, knowledge_dir: str = None) -> int:
    """
    Reads all markdown legal files from knowledge_dir and indexes chunks into VectorStore.
    """
    if store is None:
        store = VectorStore(collection_name="official_legal_knowledge")

    if knowledge_dir is None:
        knowledge_dir = os.path.join(os.path.dirname(__file__), "legal_knowledge")

    md_files = glob.glob(os.path.join(knowledge_dir, "*.md"))
    if not md_files:
        print(f"[KnowledgeLoader] No markdown files found in {knowledge_dir}")
        return 0

    total_chunks = 0
    for file_path in md_files:
        filename = os.path.basename(file_path)
        source_name = filename.replace(".md", "").replace("_", " ").title()

        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Split content into logical sections by '## ' or paragraphs
        raw_sections = content.split("## ")
        chunks = []
        metadatas = []
        ids = []

        header = raw_sections[0].strip()  # Document title/header

        for idx, sec in enumerate(raw_sections[1:], 1):
            sec_text = f"## {sec}".strip()
            if len(sec_text) < 20:
                continue

            chunk_id = f"{filename}_{idx}"
            chunks.append(sec_text)
            metadatas.append({
                "source": source_name,
                "filename": filename,
                "section": idx,
                "category": "Official Legal Reference"
            })
            ids.append(chunk_id)

        if chunks:
            store.add_documents(documents=chunks, metadatas=metadatas, ids=ids)
            total_chunks += len(chunks)

    print(f"[KnowledgeLoader] Successfully indexed {total_chunks} chunks from {len(md_files)} legal knowledge files.")
    return total_chunks
