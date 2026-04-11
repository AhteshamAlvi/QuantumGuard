import { useNavigate } from "react-router-dom";
import { useSessionContext } from "../context/SessionContext";
import { useSimulation } from "../hooks/useSimulation";
import { SessionHeader } from "../components/SessionHeader";
import { ModeSelect } from "../components/ModeSelect";
import { FileUpload } from "../components/FileUpload";
import { DeviceStatus } from "../components/DeviceStatus";
import { MetricsPanel } from "../components/MetricsPanel";
import { IntruderControls } from "../components/IntruderControls";
import { TransferStatus } from "../components/TransferStatus";

export function SimulationPage() {
  const navigate = useNavigate();
  const { session, metrics } = useSessionContext();
  const {
    mode, phase, file,
    intruderSettings,
    selectMode, startSimulation, uploadFile,
    updateIntruderSettings, reset,
  } = useSimulation();

  if (!session.sessionId) {
    navigate("/");
    return null;
  }

  const isLobby = phase === "lobby";
  const isRunning = phase === "key_exchange" || phase === "transferring";
  const isDone = phase === "complete" || phase === "aborted";
  const isOrigin = session.role === "origin";
  const isIntruder = session.role === "intruder";

  return (
    <div className="simulation-page">
      <SessionHeader />

      <div className="simulation-page__body">
        {/* Sidebar */}
        <aside className="simulation-page__sidebar">
          <DeviceStatus devices={session.devices} />

          {isIntruder && (
            <IntruderControls
              settings={intruderSettings}
              onUpdate={updateIntruderSettings}
              metrics={metrics}
              disabled={isRunning}
            />
          )}
        </aside>

        {/* Main content */}
        <main className="simulation-page__main">
          {isLobby && (
            <div className="simulation-page__setup">
              <ModeSelect selected={mode} onSelect={selectMode} disabled={isRunning} />

              {isOrigin && (
                <FileUpload file={file} onUpload={uploadFile} disabled={isRunning} />
              )}

              <button
                className="btn btn--primary btn--lg"
                onClick={startSimulation}
                disabled={!mode || (isOrigin && !file)}
              >
                Start Simulation
              </button>
            </div>
          )}

          <TransferStatus phase={phase} metrics={metrics} mode={mode} role={session.role} />

          {(isRunning || isDone) && (
            <MetricsPanel metrics={metrics} mode={mode} />
          )}

          {isDone && (
            <div className="simulation-page__actions">
              <button className="btn btn--secondary" onClick={reset}>
                New Simulation
              </button>
              <button className="btn btn--ghost" onClick={() => { reset(); navigate("/"); }}>
                Leave Session
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
