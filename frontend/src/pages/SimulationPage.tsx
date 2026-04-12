import { useEffect, useRef, useState } from "react";
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
import { Panel } from "../components/Panel";
import { FilePreview } from "../components/FilePreview";
import { CircuitView } from "../components/CircuitView";
import { BlochSphereView } from "../components/BlochSphereView";
import { IntruderPanelContent } from "../components/IntruderPanelContent";
import { ClassicalProgress } from "../components/ClassicalProgress";

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

  // Panel visibility
  const [bitStreamOpen, setBitStreamOpen] = useState(false);
  const [filePreviewOpen, setFilePreviewOpen] = useState(false);
  const [showIntruderPanel, setShowIntruderPanel] = useState(false);
  const [activeBitIndex, setActiveBitIndex] = useState<number>(0);
  const [activeGateStep, setActiveGateStep] = useState<number>(0);

  const isIntruder = session.role === "intruder";
  const isOrigin = session.role === "origin";
  const isTarget = session.role === "target";

  // Start the bit stream animation as soon as key_exchange begins
  // (so the circuit + Bloch sphere are active during the entire simulation).
  useEffect(() => {
    const shouldStream = phase === "key_exchange" || phase === "transferring";

    if (!shouldStream) {
      streamStartedRef.current = false;
      return;
    }

    if (streamStartedRef.current) return;
    if (!isOrigin && !isTarget && !isIntruder) return;

    const errorRate =
      mode === "classical"
        ? 0.0
        : intruderSettings.attackActive
          ? intruderSettings.interceptionIntensity * 0.3
          : 0.02;

    if (isOrigin) {
      // During key_exchange, fileBits might not be ready yet — use placeholder
      const bits = fileBits && fileBits.length > 0
        ? fileBits
        : new Array(512).fill(0).map(() => Math.round(Math.random()));
      stream.startStream(bits, errorRate);
    } else {
      const expectedLength = 512;
      stream.startStream(new Array(expectedLength).fill(0), errorRate);
    }

    streamStartedRef.current = true;
  }, [phase, fileBits, mode, isOrigin, isTarget, isIntruder, intruderSettings, stream]);

  if (!session.sessionId) {
    navigate("/");
    return null;
  }

  const isLobby = phase === "lobby";
  const isRunning = phase === "key_exchange" || phase === "transferring";
  const isDone = phase === "complete" || phase === "aborted" || phase === "failed";

  // Check if all 3 roles are connected
  const allConnected = session.devices.length === 3
    && session.devices.every((d) => d.connected);

  const handleReset = () => {
    reset();
    stream.resetStream();
    streamStartedRef.current = false;
    setBitStreamOpen(false);
    setFilePreviewOpen(false);
    setShowIntruderPanel(false);
  };

  // ── Button visibility rules ──

  // Bit stream: available for Origin + Target once transferring/done
  const canShowBitStream = !isIntruder && (isRunning || isDone);

  // File preview:
  //   Origin → available once file is uploaded
  //   Target → available after transfer completes (needs received data)
  //   Intruder → available only if intruder captured the file (needs received data)
  const canShowFilePreview =
    (isOrigin && !!file) ||
    (isTarget && phase === "complete" && !!session.receivedFile) ||
    (isIntruder && metrics.intruderCapturedFile && !!session.receivedFile);

  // Intruder analysis: available during running or after done
  const canShowIntruderAnalysis = isIntruder && (isRunning || isDone);

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

          {/* Toolbar buttons */}
          {(canShowBitStream || canShowFilePreview || canShowIntruderAnalysis) && (
            <div className="simulation-page__toolbar">
              {canShowBitStream && (
                <button
                  className="btn btn--secondary"
                  onClick={() => setBitStreamOpen(true)}
                >
                  View Bit Stream
                </button>
              )}
              {canShowFilePreview && (
                <button
                  className="btn btn--secondary"
                  onClick={() => setFilePreviewOpen(true)}
                >
                  {isIntruder ? "View Captured File" : "View File Preview"}
                </button>
              )}
              {canShowIntruderAnalysis && (
                <button
                  className="btn btn--secondary btn--danger"
                  onClick={() => setShowIntruderPanel(true)}
                >
                  View Interception Analysis
                </button>
              )}
            </div>
          )}

          {(isRunning || isDone) && (
            <MetricsPanel metrics={metrics} mode={mode} />
          )}

          {isDone && (
            <div className="simulation-page__actions">
              <button className="btn btn--secondary" onClick={handleReset}>
                New Simulation
              </button>

              <button
                className="btn btn--ghost"
                onClick={() => { handleReset(); navigate("/"); }}
              >
                Leave Session
              </button>
            </div>
          )}

          {(isRunning || isDone) && (
            <>
              {mode === "quantum" ? (
                /* ── QUANTUM MODE ── */
                <div className="simulation-page__bottom">
                  <div className="simulation-page__circuit">
                    <CircuitView
                      streaming={stream.streaming}
                      totalBits={stream.totalBits}
                      receiverBits={stream.receiverBits}
                      onActiveChange={(bitIndex, gateStep) => {
                        setActiveBitIndex(bitIndex);
                        setActiveGateStep(gateStep);
                      }}
                    />
                  </div>

                  <div className="simulation-page__bloch">
                    <BlochSphereView
                      bit={stream.receiverBits[activeBitIndex] ?? 0}
                      gateStep={activeGateStep}
                    />
                  </div>
                </div>
              ) : (
                /* ── CLASSICAL MODE ── */
                <div className="simulation-page__bottom simulation-page__bottom--full">
                  <ClassicalProgress
                    receiverBits={stream.receiverBits}
                    totalBits={stream.totalBits}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── Panels (overlays) ── */}
      <Panel title="Bit Stream Visualization" open={bitStreamOpen} onClose={() => setBitStreamOpen(false)}>
        <BitStream
          senderBits={stream.senderBits}
          receiverBits={stream.receiverBits}
          showSender={stream.showSender}
          totalBits={stream.totalBits}
        />
      </Panel>

      <Panel
        title={isIntruder ? "Captured File" : "File Preview"}
        open={filePreviewOpen}
        onClose={() => setFilePreviewOpen(false)}
      >
        <FilePreview
          file={isOrigin ? file : undefined}
          receivedFile={!isOrigin ? session.receivedFile : undefined}
          label={
            isOrigin
              ? "Outgoing file"
              : isTarget
                ? "Received file"
                : "Intercepted file"
          }
        />
      </Panel>

      <Panel
        title="Interception Analysis"
        open={showIntruderPanel}
        onClose={() => setShowIntruderPanel(false)}
      >
        <IntruderPanelContent
          receiverBits={stream.receiverBits}
          totalBits={stream.totalBits}
        />
      </Panel>
    </div>
  );
}
