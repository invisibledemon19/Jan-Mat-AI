# Jan-Mat AI (जन-मत AI) - Architecture & Analysis

The Jan-Mat AI assistant is designed to handle multi-modal queries (voice/text) from 1.4 billion citizens, scale effectively using serverless technologies, and adhere to the strict security and privacy guidelines of the Election Commission of India.

## System Architecture

```mermaid
graph TD
    A[Citizen (WhatsApp / USSD / Web)] -->|Message / Audio| B(API Gateway / Load Balancer)
    
    subgraph Zero-Trust Security Perimeter
        B --> C{Security Middleware}
        C -->|Detects Injection| Z[Reject Request]
        C -->|Passes| D[PII Redaction Layer]
    end
    
    D --> E[Fastify Node.js Application / Cloud Run]
    
    subgraph Bhashini Voice Services
        E -- Audio --> F[Bhashini STT]
        F -- Text --> E
    end
    
    E --> G[Vertex AI Gemini 3.1 Pro]
    
    subgraph Function Calling
        G -. function: search_faq .-> H[Vector Search Service]
        G -. function: locate_polling .-> I[Bhuvan Maps ISRO]
    end
    
    subgraph Knowledge Base
        H --> J{Redis Cache}
        J -- Cache Hit --> H
        J -- Cache Miss --> K[(Milvus Vector DB)]
        K --> J
    end
    
    G -->|Text Response| E
    
    E -- Response Text --> L[Bhashini TTS]
    L -- Audio URL --> E
    
    E -->|Text + Audio URL| B
    B --> A
    
    subgraph Cloud Infrastructure
        M[Secret Manager] -. Provides Keys .-> C
        M -. Provides Keys .-> E
        N[Cloud Trace] -. Monitors .-> E
    end
```

## Efficiency & Complexity Analysis

The system is designed for extreme scale, prioritizing constant $O(1)$ or logarithmic $O(\log n)$ operations for critical paths to ensure the backend remains stateless and highly concurrent.

| Component / Operation | Data Structure / Technology | Time Complexity | Space Complexity | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Request Routing** | Fastify (Radix Tree) | $O(k)$ | $O(N)$ | Routing matches URL paths quickly. $k$ = path length. |
| **FAQ Retrieval (Cache)** | Redis (Hash Table) | $O(1)$ | $O(C)$ | Exact semantic query hashes bypass expensive DB calls. |
| **FAQ Retrieval (DB)** | Milvus (HNSW / IVF_FLAT) | $O(\log n)$ | $O(N \cdot d)$ | Approximate Nearest Neighbor search on 768-d embeddings. |
| **PII Redaction** | RegExp matching | $O(L)$ | $O(L)$ | $L$ = length of input message. Fast sequential scan. |
| **Prompt Injection Detection** | Array Iteration & RegExp | $O(P \cdot L)$ | $O(1)$ | $P$ = number of patterns. Minimal CPU footprint per request. |
| **Memory Footprint** | Cloud Run (Stateless) | N/A | $O(1)$ per req | App stores zero state locally. State is offloaded to Redis/Milvus. |

## Key Design Principles Implemented

1. **Clean Code & SOLID:** Distinct services for AI routing, vector search, security, and external APIs.
2. **Security-First:** Custom Fastify middleware strictly redacts Aadhaar/Voter IDs and identifies prompt injection attempts before the controller code is executed.
3. **Voice-First Accessibility:** The controller directly integrates with Bhashini for speech-to-text and text-to-speech, allowing illiterate populations to interface via WhatsApp voice notes.
4. **Cloud-Native Scalability:** Built for Google Cloud Run (scale-to-zero, event-driven), with secrets injected securely via Secret Manager.
