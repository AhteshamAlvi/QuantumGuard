# ══════════════════════════════════════════════════════════════
# app.py — FastAPI entry point
# ══════════════════════════════════════════════════════════════

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logging.getLogger("quantumguard").setLevel(logging.DEBUG)

from routes.session import router as session_router
from routes.ws import router as ws_router

# Main application object
app = FastAPI(title="QuantumGuard")

# connection to ANY frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# plugs features into endpoints on the front end
app.include_router(session_router, prefix="/api")
app.include_router(ws_router)

@app.get("/")
async def health():
    return {"status": "running"}
