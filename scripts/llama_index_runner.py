import json
import os
import sys

def emit(payload, code=0):
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    raise SystemExit(code)

try:
    request = json.load(sys.stdin)
except Exception as exc:
    emit({"state":"FAIL","code":"LLAMA_INDEX_REQUEST_INVALID","detail":str(exc)},2)

root=os.path.abspath(str(request.get("root") or "").strip())
query=str(request.get("query") or "").strip()
documents=request.get("documents") or []
top_k=int(request.get("topK") or 5)
embedding_model=str(request.get("embeddingModel") or "text-embedding-3-small").strip()

if not root or not os.path.isdir(root):
    emit({"state":"DEGRADED","code":"LLAMA_INDEX_SOURCE_NOT_AVAILABLE"},0)
if not query:
    emit({"state":"FAIL","code":"LLAMA_INDEX_QUERY_REQUIRED"},2)
if not isinstance(documents,list) or not documents:
    emit({"state":"FAIL","code":"LLAMA_INDEX_DOCUMENTS_REQUIRED"},2)
if not os.environ.get("OPENAI_API_KEY"):
    emit({"state":"DEGRADED","code":"LLAMA_INDEX_EMBEDDING_CREDENTIALS_NOT_AVAILABLE"},0)

sys.path.insert(0,root)

try:
    from llama_index.core import Document, VectorStoreIndex
    from llama_index.embeddings.openai import OpenAIEmbedding
except Exception as exc:
    emit({"state":"DEGRADED","code":"LLAMA_INDEX_PYTHON_IMPORT_FAILED","detail":str(exc)},0)

try:
    llm_embed=OpenAIEmbedding(model=embedding_model, api_key=os.environ["OPENAI_API_KEY"])
    docs=[]
    for item in documents:
        if not isinstance(item,dict) or not str(item.get("text") or "").strip():
            continue
        docs.append(Document(text=str(item["text"]), metadata=item.get("metadata") or {}))
    if not docs:
        emit({"state":"FAIL","code":"LLAMA_INDEX_NO_VALID_DOCUMENTS"},2)
    index=VectorStoreIndex.from_documents(docs, embed_model=llm_embed)
    retriever=index.as_retriever(similarity_top_k=top_k)
    matches=retriever.retrieve(query)
except Exception as exc:
    emit({"state":"FAIL","code":"LLAMA_INDEX_RETRIEVAL_FAILED","detail":str(exc)},2)

results=[]
for item in matches:
    node=item.node
    results.append({
        "score": float(item.score) if item.score is not None else None,
        "text": node.get_content(),
        "metadata": node.metadata,
        "nodeId": str(getattr(node,"node_id","")),
    })

emit({
    "state":"PASS",
    "provider":"run-llama/llama_index",
    "revision":"962940ddc079cc21701d28d1237c84c82a7c5164",
    "query":query,
    "topK":top_k,
    "results":results,
})
