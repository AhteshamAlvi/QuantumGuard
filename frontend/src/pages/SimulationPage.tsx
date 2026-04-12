import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionContext } from "../context/SessionContext";
import { useSimulation } from "../hooks/useSimulation";
import { useTransferStream } from "../hooks/useTransferStream";
import { SessionHeader } from "../components/SessionHeader";
import { ModeSelect } from "../components/ModeSelect";
import { FileUpload } from "../components/FileUpload";
import { DeviceStatus } from "../components/DeviceStatus";
import { MetricsPanel } from "../components/MetricsPanel";
import { IntruderControls } from "../components/IntruderControls";
import { TransferStatus } from "../components/TransferStatus";
import { BitStream } from "../components/BitStream";

export function SimulationPage() {
  const navigate = useNavigate();
  const { session, metrics } = useSessionContext();
  const {
    mode, phase, file, fileBits,
    intruderSettings,
    selectMode, startSimulation, uploadFile,
    updateIntruderSettings, reset,
  } = useSimulation();
  const stream = useTransferStream(session.role);
  const streamStartedRef = useRef(false);

  const isIntruder = session.role === "intruder";

  // Reactively start the bit stream when phase transitions to "transferring".
  useEffect(() => {
    if (phase !== "transferring") {
      streamStartedRef.current = false;
      return;
    }
    if (streamStartedRef.current) return;
    if (isIntruder) return;
    if (!fileBits || fileBits.length === 0) return;

    streamStartedRef.current = true;

    const errorRate =
      mode === "classical"
        ? 0.0
        : intruderSettings.attackActive
          ? intruderSettings.interceptionIntensity * 0.3
          : 0.02;

    stream.startStream(fileBits, errorRate);
  }, [phase, fileBits, mode, isIntruder, intruderSettings, stream]);

  if (!session.sessionId) {
    navigate("/");
    return null;
  }

  const isLobby = phase === "lobby";
  const isRunning = phase === "key_exchange" || phase === "transferring";
  const isDone = phase === "complete" || phase === "aborted" || phase === "failed";
  const isOrigin = session.role === "origin";

  // Check if all 3 roles are connected
  const allConnected = session.devices.length === 3
    && session.devices.every((d) => d.connected);

  const handleReset = () => {
    reset();
    stream.resetStream();
    streamStartedRef.current = false;
  };

  const showBitStream = !isIntruder && (isRunning || isDone) && stream.totalBits > 0;

  // Origin can only start when all 3 devices are connected + mode + file selected
  const canStart = allConnected && !!mode && !!file;

  return (
    <div className="simulation-page">
      <SessionHeader />

      <div className="simulation-page__body">
        {/* Sidebar */}
        <aside className="simulation-page__sidebar">
          <DeviceStatus devices={session.devices} myRole={session.role} />

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
          {isLobby && isOrigin && (
            <div className="simulation-page__setup">
              <ModeSelect
                selected={mode}
                onSelect={selectMode}
                disabled={isRunning || !allConnected}
              />
              <FileUpload file={file} onUpload={uploadFile} disabled={isRunning} />

              {!allConnected && (
                <p className="simulation-page__waiting-hint">
                  Waiting for all devices to connect before starting...
                </p>
              )}

              <button
                className="btn btn--primary btn--lg"
                onClick={startSimulation}
                disabled={!canStart}
                title={!allConnected ? "All 3 devices must be connected" : !mode ? "Select a mode first" : !file ? "Upload a file first" : ""}
              >
                Start Simulation
              </button>
            </div>
          )}

          {isLobby && !isOrigin && (
            <div className="simulation-page__setup">
              <p className="simulation-page__waiting">
                Waiting for Origin to select mode and start the simulation...
              </p>
              {mode && (
                <p className="simulation-page__mode-info">
                  Mode selected: <strong>{mode === "classical" ? "Classical" : "Quantum (BB84)"}</strong>
                </p>
              )}
            </div>
          )}

          <TransferStatus phase={phase} metrics={metrics} mode={mode} role={session.role} />

          {showBitStream && (
            <BitStream
              senderBits={stream.senderBits}
              receiverBits={stream.receiverBits}
              showSender={stream.showSender}
              totalBits={stream.totalBits}
            />
          )}

          {(isRunning || isDone) && (
            <MetricsPanel metrics={metrics} mode={mode} />
          )}

          {isDone && (
            <div className="simulation-page__actions">
              <button className="btn btn--secondary" onClick={handleReset}>
                New Simulation
              </button>
              <button className="btn btn--ghost" onClick={() => { handleReset(); navigate("/"); }}>
                Leave Session
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
