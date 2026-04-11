# QuantumGuard

**Quantum vs Classical Encryption — A Live Demonstration**

QuantumGuard is a real-time, multi-device web application that demonstrates why quantum key distribution (QKD) is fundamentally more secure than classical cryptography.

Three users connect from separate devices — or browser tabs — and play out a file transfer scenario with a man-in-the-middle attacker. The system shows, live:

- **Classical mode**: the attacker silently steals everything
- **Quantum mode**: the attacker is detected and the transfer is blocked

---

## How It Works

### The Setup

Three devices join a shared session, each picking a role:

| Role | What they do |
|------|-------------|
| **Origin** | Uploads and sends a file |
| **Target** | Receives the file |
| **Intruder** | Sits between them as a man-in-the-middle |

All traffic is routed `Origin → Intruder → Target`. The Intruder can observe, intercept, and tamper — depending on the mode.

### Phase 1 — Key Exchange

**Classical mode:** Origin sends a shared key. The Intruder copies it silently. Both sides proceed as if nothing happened.

**Quantum mode (BB84):** Origin and Target exchange a key using simulated quantum states. If the Intruder tries to measure the qubits, it introduces errors. The system computes the **Quantum Bit Error Rate (QBER)** — if it's above 11%, the key is rejected and the transfer never starts.

### Phase 2 — File Transfer

Only happens if a key is established. Origin encrypts the file, sends it in chunks through the Intruder, and Target decrypts and verifies integrity via SHA-256.

### The Outcomes

| Mode | Intruder | Result |
|------|----------|--------|
| Classical | Active | File delivered. Attacker has a full copy. No one knows. |
| Quantum | Active | Key rejected. Transfer aborted. Attacker gets nothing. |
| Quantum | Passive | Secure transfer succeeds. |

---

## Project Structure

```
QuantumGuard/
├── backend/                  Python (FastAPI)
│   ├── app.py                Entry point, CORS, route registration
│   ├── requirements.txt
│   ├── routes/
│   │   ├── session.py        REST: create/join sessions
│   │   └── ws.py             WebSocket: real-time device communication
│   ├── models/
│   │   ├── session.py        Session state models
│   │   └── messages.py       WebSocket message schemas
│   ├── services/
│   │   ├── session_manager.py  In-memory session store
│   │   ├── key_exchange.py     Classical + BB84 key exchange flows
│   │   ├── file_transfer.py    Chunked encrypted file relay
│   │   └── intruder.py         MITM attack simulation
│   ├── qkd/
│   │   ├── bb84.py           BB84 protocol simulation
│   │   ├── metrics.py        QBER calculation
│   │   └── utils.py          Random bit generation
│   └── crypto/
│       ├── encrypt.py        Symmetric encryption/decryption
│       └── hash.py           SHA-256 integrity verification
├── frontend/                 React + TypeScript (Vite)
│   ├── src/
│   │   ├── App.tsx           Router + provider setup
│   │   ├── types.ts          Shared type definitions
│   │   ├── context/
│   │   │   └── SessionContext.tsx   Global state (session + metrics)
│   │   ├── hooks/
│   │   │   ├── useSession.ts       Session create/join/role
│   │   │   ├── useWebSocket.ts     Real-time backend connection
│   │   │   └── useSimulation.ts    Simulation lifecycle + demo stubs
│   │   ├── components/
│   │   │   ├── SessionHeader.tsx    Top bar: session info + status
│   │   │   ├── RoleSelect.tsx       Pick Origin/Target/Intruder
│   │   │   ├── ModeSelect.tsx       Classical vs Quantum toggle
│   │   │   ├── FileUpload.tsx       Drag-and-drop file picker
│   │   │   ├── DeviceStatus.tsx     Connected devices indicator
│   │   │   ├── MetricsPanel.tsx     QBER, key attempts, integrity
│   │   │   ├── IntruderControls.tsx Attack toggle + intensity slider
│   │   │   └── TransferStatus.tsx   Phase-aware result display
│   │   └── pages/
│   │       ├── SessionPage.tsx      Create/join session, pick role
│   │       └── SimulationPage.tsx   Main simulation view
│   └── ...config files
├── README.md
└── LICENSE
```

---

## Getting Started

### Prerequisites

- **Node.js** v18+
- **Python** 3.9+

### 1. Clone

```bash
git clone https://github.com/AhteshamAlvi/QuantumGuard.git
cd QuantumGuard
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at **http://localhost:5173**. The frontend includes demo stubs — you can test the full UI flow without the backend.

### 3. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload
```

The API runs at **http://localhost:8000**.

---

## Usage

### Local Testing (single machine)

1. Run `npm run dev` in `frontend/`
2. Open **three browser tabs** at `http://localhost:5173`
3. **Tab 1**: Create Session — note the 6-character code
4. **Tab 2 & 3**: Join Session using the code
5. Each tab picks a different role: Origin, Target, Intruder
6. Select a mode (Classical or Quantum) and start

### Multi-Device (the demo)

1. Run both the frontend and backend on a host machine
2. Open `http://<host-ip>:5173` on three different devices on the same network
3. One device creates a session, the others join with the code
4. Assign roles and run the simulation

---

## What Each Role Sees

**Origin** — File upload, mode selection, transfer progress, integrity status.

**Target** — Waiting state during key exchange, received file status, hash verification.

**Intruder** — Attack toggle, interception intensity slider, live intelligence feed showing whether the key and file were captured.

---

## Metrics

| Metric | Shown in |
|--------|----------|
| QBER (Quantum Bit Error Rate) | Quantum mode — bar + percentage |
| Key Exchange Attempts | Both modes |
| Key Established | Both modes |
| Intruder Detected | Quantum mode |
| File Integrity (SHA-256) | After transfer |
| Transfer Success/Failure | After simulation |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite |
| Backend | Python, FastAPI, WebSockets |
| QKD Simulation | NumPy, BB84 protocol |
| Real-time | WebSocket (native) |

---

## License

MIT

## Author

Ahtesham Alvi
