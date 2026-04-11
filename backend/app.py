# FastAPI entry point — registers all routes and configures CORS.

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# TODO [WIRING]: Import and include routers once implemented:
# from routes.session import router as session_router
# from routes.ws import router as ws_router

app = FastAPI(title="QuantumGuard")

# CORS — allow the React dev server during development.
# Tighten origins for production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# TODO [WIRING]: Register route modules:
# app.include_router(session_router, prefix="/api")
# app.include_router(ws_router)

@app.get("/")
def root():
    return {"status": "running"}
