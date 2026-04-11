# ══════════════════════════════════════════════════════════════
# app.py — FastAPI entry point
# ══════════════════════════════════════════════════════════════

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.session import router as session_router
from routes.ws import router as ws_router

app = FastAPI(title="QuantumGuard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(session_router, prefix="/api")
app.include_router(ws_router)


@app.get("/")
async def health():
    return {"status": "running"}
