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

  if (!session.sessionId) {
    navigate("/");
    return null;
  }

  const isLobby = phase === "lobby";
  const isRunning = phase === "key_exchange" || phase === "transferring";
  const isDone = phase === "complete" || phase === "aborted" || phase === "failed";
  const isOrigin = session.role === "origin";
  const isIntruder = session.role === "intruder";

  // Reactively start the bit stream when phase transitions to "transferring".
  // Works for both Origin and Target — fileBits is pre-computed on upload.
  // eslint-disable-next-line react-hooks/rules-of-hooks
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

  const handleReset = () => {
    reset();
    stream.resetStream();
    streamStartedRef.current = false;
  };

  // Show BitStream for Origin and Target — never for Intruder
  const showBitStream = !isIntruder && (isRunning || isDone) && stream.totalBits > 0;

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
