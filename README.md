# QuantumGuard

**A real-time, multi-device demonstration of Quantum Key Distribution vs Classical Encryption.**

QuantumGuard is a full-stack web application that visualizes *why* quantum cryptography works. Three participants — an Origin, a Target, and a Man-in-the-Middle Intruder — connect to the same session and play out an encrypted file transfer. In classical mode, the intruder silently copies everything. In quantum mode, the laws of physics expose them.

Built for hackathons and educational demos. Runs on three browser tabs or three separate devices.

---

## Table of Contents

- [QuantumGuard](#quantumguard)
  - [Table of Contents](#table-of-contents)
  - [The Concept](#the-concept)
  - [How It Works](#how-it-works)
    - [Phase 1 — Key Exchange](#phase-1--key-exchange)
    - [Phase 2 — File Transfer](#phase-2--file-transfer)
  - [What Each Role Sees](#what-each-role-sees)
    - [Origin](#origin)
    - [Target](#target)
    - [Intruder](#intruder)
  - [Getting Started](#getting-started)
  - [Usage](#usage)
    - [Local testing (single machine)](#local-testing-single-machine)
    - [Multi-device demo](#multi-device-demo)
    - [What to try](#what-to-try)
  - [Project Structure](#project-structure)
  - [Architecture](#architecture)
    - [Communication flow](#communication-flow)
    - [BB84 implementation](#bb84-implementation)
    - [Key constants](#key-constants)
    - [WebSocket message protocol](#websocket-message-protocol)
  - [Tech Stack](#tech-stack)
  - [License](#license)
  - [Author](#author)

---

## The Concept

All network traffic flows through the intruder: `Origin → Intruder → Target`. This mirrors a real man-in-the-middle attack. The question is whether the intruder can steal the encryption key without anyone noticing.

| Mode | What happens | Outcome |
|------|-------------|---------|
| **Classical** | Origin generates a random AES key and transmits it. The intruder copies it silently during transit. | File delivered. Intruder has a full copy. Nobody knows. |
| **Quantum (BB84)** | Origin and Target exchange a key using simulated quantum states. Any interception disturbs the qubits and raises the error rate. | If QBER > 11%: key rejected, transfer never starts, intruder gets nothing. If QBER < 11%: secure transfer succeeds. |

The app visualizes this entire process in real time — quantum circuit animations, Bloch sphere state changes, bit streams, QBER metrics, and file integrity verification.

---

## How It Works

### Phase 1 — Key Exchange

**Classical mode:**
1. Server generates a random 128-bit AES key.
2. Key is sent to Origin, then forwarded through the channel.
3. If the intruder is active, they silently copy the key in transit.
4. Target receives the same key. Both sides think the channel is secure.

**Quantum mode (BB84 protocol):**
1. Server generates 256 random qubits — each with a random bit (0 or 1) and a random basis (Z or X).
2. Origin is told what was prepared. The qubits are transmitted toward Target.
3. If the intruder is active, they measure a subset of qubits (based on their intensity setting). Measurement collapses the quantum state — if the intruder guesses the wrong basis, the qubit is permanently disturbed.
4. Target receives the (possibly disturbed) qubits and measures them with their own random bases.
5. Server compares: for qubits where Origin and Target used the *same* basis, their bits should match. The mismatch rate is the **Quantum Bit Error Rate (QBER)**.
6. If QBER < 11%: the sifted key is accepted, hashed into an AES-128 key, and distributed.
7. If QBER >= 11%: intrusion detected. The key is discarded and the protocol retries (up to 100 attempts).

### Phase 2 — File Transfer

Only happens after a key is established.

1. Server encrypts the file using **AES-128-GCM** (authenticated encryption) on behalf of Origin.
2. Ciphertext is routed through the intruder. In classical mode, the intruder has the key and can decrypt. In quantum mode, they don't.
3. Target receives and decrypts the file. **SHA-256** hash verification confirms integrity.

---

## What Each Role Sees

### Origin
- Selects the encryption mode (Classical or Quantum).
- Uploads a file to transfer.
- Starts the simulation once all three devices are connected.
- Sees: quantum circuit animation, Bloch sphere, bit stream visualization, file preview, transfer metrics.

### Target
- Waits for Origin to configure and start.
- Sees the same visualizations as Origin from the receiver's perspective.
- After transfer: can preview the received file and verify integrity.

### Intruder
- Controls the attack: toggle interception on/off, adjust interception intensity (0–100%).
- Sees: interception analysis panel (qubits intercepted, QBER induced, detection status), capture status for key and file.
- In classical mode: captures everything. In quantum mode: gets caught.

---

## Getting Started

QuantumGuard is deployed as a full-stack web application, with the frontend and backend hosted separately and connected over the internet.

The frontend is built with React and Vite and is deployed on Vercel, providing a fast, accessible interface that runs directly in the browser. The backend is a Python FastAPI service hosted on Render, where it handles simulation logic, session management, and protocol execution.

When a user opens the application, the frontend communicates with the deployed backend via HTTPS requests. The backend may take a few seconds to respond on the first request due to cold starts on the free hosting tier, but will run normally afterward.

No local setup, installation, or cloning is required—users can access the full application directly through the deployed link: `https://quantum-guard-eight.vercel.app/` .


---

## Usage

### Local testing (single machine)

1. Start both the backend and frontend.
2. Open **three browser tabs** at `https://quantum-guard-eight.vercel.app/`.
3. **Tab 1**: Click "Create Session" — you're assigned the Origin role. Note the 6-character session code.
4. **Tab 2**: Click "Join Session", enter the code. Pick the **Target** role.
5. **Tab 3**: Join with the same code. You'll be auto-assigned **Intruder** (the last remaining role).
6. Back in Tab 1 (Origin): select a mode (Classical or Quantum), upload any file, and click **Start Simulation**.
7. Watch the key exchange, circuit animation, and file transfer play out across all three tabs.

### Multi-device demo

1. Run both servers on a host machine.
2. On three devices connected to the same network, open `https://quantum-guard-eight.vercel.app/`.
3. Create and join the session as above.

### What to try

- **Classical mode with active intruder** — observe silent compromise. The intruder captures both the key and the file without detection.
- **Quantum mode with active intruder at 100% intensity** — watch the QBER spike above 11%, triggering retries. The intruder is detected every time.
- **Quantum mode with active intruder at low intensity (~10%)** — sometimes the intruder slips under the QBER threshold. This demonstrates the probabilistic nature of quantum detection.
- **Quantum mode with passive intruder (attack off)** — clean transfer, QBER near 0%.

---

## Project Structure

```
QuantumGuard/
├── backend/                          Python — FastAPI + WebSockets
│   ├── app.py                        Entry point, CORS, route registration
│   ├── crypto.py                     AES-GCM encryption, SHA-256 hashing, key derivation
│   ├── models.py                     Pydantic models: Session, Metrics, IntruderSettings
│   ├── requirements.txt
│   ├── routes/
│   │   ├── session.py                REST API: create / join / get session
│   │   └── ws.py                     WebSocket router, file transfer orchestration
│   ├── services/
│   │   ├── session_manager.py        In-memory session store, broadcast helpers
│   │   ├── key_exchange.py           Classical + BB84 key exchange with retry loop
│   │   └── qiskit_engine.py          Qiskit Aer: quantum measurement simulation
│   └── qkd/
│       └── bb84.py                   BB84 helpers: bit/basis generation, QBER, key sifting
│
├── frontend/                         React 19 + TypeScript — Vite
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx                  Entry point
│       ├── App.tsx                   Router + context providers
│       ├── App.css                   All component styles
│       ├── index.css                 CSS variables, resets, base theme
│       ├── types.ts                  Shared types: Role, Mode, Metrics, WsMessageType
│       ├── context/
│       │   ├── SessionContext.tsx     Global session + metrics state (useReducer)
│       │   └── WebSocketContext.tsx   Singleton WebSocket connection, message dispatch
│       ├── hooks/
│       │   ├── useSession.ts         REST API: create/join session, role selection
│       │   ├── useWebSocket.ts       WebSocket hook re-export
│       │   ├── useSimulation.ts      Simulation lifecycle: mode, file, start, reset
│       │   └── useTransferStream.ts  Bit-by-bit streaming animation engine
│       ├── lib/
│       │   └── quantum.ts            Client-side qubit measurement (Target)
│       ├── pages/
│       │   ├── SessionPage.tsx       Create / join session, role picker
│       │   └── SimulationPage.tsx    Main simulation view with all panels
│       └── components/
│           ├── SessionHeader.tsx     Top bar: session ID, role, mode, connection, phase
│           ├── RoleSelect.tsx        Three-card role picker
│           ├── ModeSelect.tsx        Classical vs Quantum toggle
│           ├── FileUpload.tsx        Drag-and-drop file upload
│           ├── DeviceStatus.tsx      Sidebar: connected device indicators
│           ├── MetricsPanel.tsx      QBER bar, key attempts, detection, integrity
│           ├── IntruderControls.tsx   Attack toggle, intensity slider, intel feed
│           ├── TransferStatus.tsx    Phase-aware status messages
│           ├── BitStream.tsx         Side-by-side sent/received bit visualization
│           ├── FilePreview.tsx       Image / text / binary file preview
│           ├── CircuitView.tsx       Animated SVG quantum circuit (3 wires, gates, particles)
│           ├── BlochSphereView.tsx   SVG Bloch sphere with rotating state vector
│           ├── IntruderPanelContent.tsx  Interception analysis: stats, timeline, collapse visual
│           ├── ClassicalProgress.tsx Progress bar for classical mode
│           └── Panel.tsx            Reusable modal overlay
│
├── README.md
├── LICENSE                           MIT
└── .gitignore
```

---

## Architecture

### Communication flow

```
  ┌────────────┐         ┌─────────────────────┐         ┌────────────┐
  │   Origin   │◄───────►│   FastAPI Backend    │◄───────►│   Target   │
  │  (browser) │   WS    │                     │   WS    │  (browser) │
  └────────────┘         │  - Session manager   │         └────────────┘
                         │  - Key exchange       │
                         │  - BB84 + Qiskit      │
                         │  - AES-GCM encrypt    │
                         │  - File routing        │
                         └──────────┬────────────┘
                                    │ WS
                              ┌─────┴──────┐
                              │  Intruder   │
                              │  (browser)  │
                              └────────────┘
```

- **REST API** (`/api/sessions`) handles session creation and joining.
- **WebSocket** (`/ws/{session_id}`) carries all real-time communication: role selection, mode updates, BB84 protocol messages, file transfer, metrics broadcasts.
- **Server-driven**: the backend orchestrates every phase. Clients are reactive — they receive messages and update their UI accordingly.

### BB84 implementation

The intruder's measurements use **Qiskit Aer** (a real quantum circuit simulator) to model qubit collapse accurately. The Target's measurements use a simplified client-side simulation (`lib/quantum.ts`). The QBER computation happens server-side by comparing Origin's and Target's bits on matching bases.

### Key constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `NUM_QUBITS` | 256 | Qubits per BB84 round |
| `QBER_THRESHOLD` | 11% | Error rate above which intrusion is declared |
| `MAX_ATTEMPTS` | 100 | Maximum BB84 retry attempts |
| `MAX_BITS` | 512 | Bits shown in stream visualization |
| AES key size | 128-bit | Derived from sifted BB84 key via SHA-256 |

### WebSocket message protocol

30+ message types follow a consistent `{ type: string, ...payload }` format. Key categories:

- **Client → Server**: `role_selected`, `mode_selected`, `start_simulation`, `file_binary`, `intruder_settings`, `bb84_measurement`
- **Server → All**: `phase_update`, `metrics_update`, `device_update`, `bb84_result`, `bb84_retry`
- **Server → Role**: `key_generated`, `key_established`, `bb84_prepare`, `bb84_transmit`, `intercepted_key`, `intercepted_file`, `file_decrypted`

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19, TypeScript, Vite 8 | UI, state management, routing |
| Backend | Python 3.10+, FastAPI, Uvicorn | REST API, WebSocket server, orchestration |
| Quantum Simulation | Qiskit, Qiskit Aer | Realistic qubit measurement and state collapse |
| Encryption | `cryptography` (Python) | AES-128-GCM encryption, SHA-256 hashing |
| Real-time | WebSocket (native) | Full-duplex communication between all clients and server |
| Styling | Custom CSS | Dark theme, glow effects, quantum-inspired visual language |

---

## License

MIT

## Author

[Ahtesham Alvi](https://github.com/AhteshamAlvi)
