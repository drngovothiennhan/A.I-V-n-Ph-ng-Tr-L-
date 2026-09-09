# Open-source stack selected for A.I Văn phòng v1.7

| Layer | Project | License / status | Decision |
|---|---|---|---|
| Multi-agent | Google ADK | Apache-2.0, active | PRIMARY |
| Gemini flows/eval | Genkit | Apache-2.0, active | PRIMARY where useful |
| Tool protocol | MCP TypeScript SDK | Apache-2.0/MIT lineage | PRIMARY |
| Voice / realtime | 78/xiaozhi-esp32 + compatible self-host server | MIT ecosystem | PRIMARY voice fabric |
| Long-term memory | mem0ai/mem0 | Apache-2.0 | OPTIONAL after benchmark |
| Complex workflow | LangGraph | MIT | OPTIONAL |
| Deep document RAG | RAGFlow | Apache-2.0 | OPTIONAL, heavy |
| Low-code experiments | Langflow | MIT | SANDBOX |
| Low-code | Dify | Modified Apache 2.0 with extra conditions | NOT CORE |
| Legacy low-code | Flowise | archived/EOL in 2026 | DO NOT USE AS NEW CORE |

Design rule: do not integrate a project merely because it is popular. It must reduce cost or improve measured quality/latency without creating a new single point of failure.
