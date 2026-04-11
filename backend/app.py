# ══════════════════════════════════════════════════════════════
# app.py — FastAPI entry point
# ══════════════════════════════════════════════════════════════
#
# This is the main file. Run with:  uvicorn app:app --reload
#
# Responsibilities:
#   1. Create the FastAPI app instance.
#   2. Add CORS middleware so the React dev server (localhost:5173)
#      can talk to this server (localhost:8000). In production,
#      lock allow_origins down to the actual frontend domain.
#   3. Import and register the two routers:
#        - routes/session.py  → mounted at /api  (REST endpoints)
#        - routes/ws.py       → mounted at root  (WebSocket endpoints)
#   4. Expose a GET / health check that returns {"status": "running"}.
#
# Implementation:
#   - Import FastAPI, CORSMiddleware.
#   - Import `router` from routes.session and routes.ws.
#   - app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)
#   - app.include_router(session_router, prefix="/api")
#   - app.include_router(ws_router)
#   - Define GET "/" returning {"status": "running"}.
#
# That's it. This file should be ~20 lines of actual code.
# All logic lives in routes/ and services/.
