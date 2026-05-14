from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import allocations, deals, documents, funds, integrations, lps, restrictions

app = FastAPI(
    title="LP Intelligence Platform API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(funds.router)
app.include_router(lps.router)
app.include_router(deals.router)
app.include_router(documents.router)
app.include_router(integrations.router)
app.include_router(restrictions.router)
app.include_router(allocations.router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
