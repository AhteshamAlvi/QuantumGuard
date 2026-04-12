import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";
import { RoleSelect } from "../components/RoleSelect";

export function SessionPage() {
  const navigate = useNavigate();
  const { session, loading, error, createSession, joinSession, selectRole } = useSession();
  const [joinCode, setJoinCode] = useState("");
  const [isCreator, setIsCreator] = useState(false);

  const hasSession = !!session.sessionId;
  const canProceed = hasSession && !!session.role;

  async function handleCreate() {
    await createSession();
    setIsCreator(true);
    // Auto-assign Origin to session creator
    selectRole("origin");
  }

  async function handleJoin() {
    if (joinCode.trim()) {
      await joinSession(joinCode.trim().toUpperCase());
      setIsCreator(false);
    }
  }

  function handleContinue() {
    navigate("/simulation");
  }

  return (
    <div className="session-page">
      <div className="session-page__hero">
        <h1 className="session-page__title">QuantumGuard</h1>
        <p className="session-page__subtitle">Quantum Encryption Secure Fileshare Simulation</p>
      </div>

      {!hasSession ? (
        <div className="session-page__join">
          <div className="session-page__actions">
            <button className="btn btn--primary" onClick={handleCreate} disabled={loading}>
              Create Session
            </button>
            <div className="session-page__divider"><span>or</span></div>
            <div className="session-page__join-form">
              <input
                className="input"
                type="text"
                placeholder="Enter session code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                maxLength={6}
                disabled={loading}
              />
              <button className="btn btn--secondary" onClick={handleJoin} disabled={loading || !joinCode.trim()}>
                Join
              </button>
            </div>
          </div>
          {error && <p className="session-page__error">{error}</p>}
        </div>
      ) : isCreator ? (
        /* Creator sees code + auto-assigned as Origin */
        <div className="session-page__setup">
          <div className="session-page__code-display">
            <p>Share this code with other devices:</p>
            <code className="session-page__code">{session.sessionId}</code>
          </div>

          <p className="session-page__role-assigned">
            You are the <strong>Origin</strong> (sender)
          </p>

          <button
            className="btn btn--primary btn--lg"
            onClick={handleContinue}
            disabled={!canProceed}
          >
            Continue
          </button>
        </div>
      ) : (
        /* Joiner picks Target or Intruder only — no session code shown */
        <div className="session-page__setup">
          <RoleSelect
            selected={session.role}
            onSelect={selectRole}
            disabled={loading}
            excludeOrigin
          />

          <button
            className="btn btn--primary btn--lg"
            onClick={handleContinue}
            disabled={!canProceed}
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
