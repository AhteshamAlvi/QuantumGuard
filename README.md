# QuantumGuard
Quantum Encryption Secure Fileshare Simulation

QuantumGuard is a distributed, interactive system that demonstrates the fundamental difference between **classical cryptography** and **quantum key distribution (QKD)** under adversarial conditions.

It simulates three independent devices communicating over a network while an active attacker attempts to intercept the communication.

The system shows, in real time:

- Classical systems can be **compromised silently**
- Quantum systems **detect intrusion and refuse to proceed**

---

## Core Idea

Traditional cryptography relies on computational difficulty. If an attacker is powerful enough, security can fail without detection.

Quantum communication changes the model:

> Instead of preventing interception, it guarantees that interception is **detectable**.

QuantumGuard demonstrates this concept through a live, multi-device simulation.

---

## System Overview

QuantumGuard runs across **three devices**, each assigned a role through the UI:

| Role       | Description                          |
|------------|--------------------------------------|
| **Origin** | Sends the file                       |
| **Target** | Receives the file                   |
| **Intruder** | Acts as a man-in-the-middle attacker |

---

## Network Architecture

All communication is routed through the Intruder:


Origin → Intruder → Target
Target → Intruder → Origin


The Intruder acts as a proxy and can:

- observe traffic
- intercept key exchange
- attempt attacks depending on mode

---

## Protocol Design

Communication occurs in two phases:

---

### Phase 1 — Key Establishment

#### Classical Mode
- A shared key is established
- Intruder intercepts the key silently
- Communication proceeds normally

#### Quantum Mode (BB84 Simulation)
- Key exchange is performed using quantum-inspired states
- Intruder interference introduces measurement errors
- The system computes **QBER (Quantum Bit Error Rate)**


QBER = (# mismatched bits) / (checked bits)


- If QBER exceeds a threshold:
  - Key is rejected
  - Exchange is retried
- This loop continues until a secure key is established

---

### Phase 2 — File Transfer

Only executed after a valid key is established:

1. Origin encrypts the file
2. File is sent in chunks
3. Target decrypts and reconstructs the file
4. Integrity is verified using SHA-256 hashing

---

## Attack Model

### Classical Mode

The Intruder:
- captures the key
- allows communication to proceed
- decrypts the file without detection

Result:
- Target receives the correct file
- Intruder also obtains the full file
- No alert is triggered

---

### Quantum Mode

The Intruder:
- attempts to measure transmitted quantum states
- introduces errors due to basis mismatch

Result:
- QBER increases
- Key exchange fails
- File transfer is **blocked**

If the Intruder remains passive:
- Key exchange succeeds
- File transfer proceeds securely

---

## Outcomes

| Mode       | Intruder Action | Result |
|------------|----------------|--------|
| Classical  | Active         | File delivered, data stolen silently |
| Quantum    | Active         | Key rejected, transfer aborted       |
| Quantum    | Passive        | Secure transfer succeeds             |

---

## Key Insight

QuantumGuard demonstrates:

> Classical systems continue operating under compromise, while quantum systems refuse to proceed until security is guaranteed.

---

## Tech Stack

### Backend (Rust)
- `tokio` — asynchronous networking
- `serde` — serialization
- `sha2` — hashing
- custom TCP protocol for communication

### Frontend (React + TypeScript)
- React (Vite)
- WebSockets for real-time updates
- modular component-based UI

### Quantum Layer (Python)
- FastAPI or Flask
- NumPy for BB84 simulation
- optional Qiskit integration

---

## Installation

### Prerequisites

- Rust (latest stable)
- Node.js (v18+)
- Python 3.9+

---

### 1. Clone Repository


git clone https://github.com/your-username/quantumguard.git

cd quantumguard


---

### 2. Setup Backend


cd backend
cargo build


---

### 3. Setup Frontend


cd frontend
npm install
npm run dev


---

### 4. Setup Python QKD Service


cd python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload


---

## 🚀 Running the System

Open the frontend on **three separate devices or browser tabs**:


http://localhost:5173


---

### Steps

1. Select a role on each device:
   - Origin
   - Target
   - Intruder

2. Connect the devices using the UI

3. Choose mode:
   - Classical
   - Quantum

4. Start the simulation

---

## Intruder Controls

The Intruder UI allows:

- toggling attack mode
- setting interception intensity
- observing key capture and file access

---

## Metrics Displayed

- QBER (Quantum mode)
- Key exchange attempts
- File integrity (hash verification)
- Intruder success status
- Transfer success / failure

---

## Example Scenarios

---

### Classical Attack

- Transfer completes
- Target receives file
- Intruder decrypts file silently

---

### Quantum Attack

- Key exchange repeatedly fails
- Transfer never begins
- Intruder gains nothing

---

### Quantum Secure Transfer

- Key successfully established
- File transferred securely
- Intruder unable to access data

---

## Future Work

- Real quantum hardware integration
- Advanced visualization dashboard
- Multiple attackers
- Network topology simulation

---

## License

MIT License

---

## Author:

Ahtesham Alvi

---