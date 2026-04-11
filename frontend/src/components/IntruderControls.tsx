import type { IntruderSettings, Metrics } from "../types";

interface Props {
  settings: IntruderSettings;
  onUpdate: (settings: Partial<IntruderSettings>) => void;
  metrics: Metrics;
  disabled?: boolean;
}

export function IntruderControls({ settings, onUpdate, metrics, disabled }: Props) {
  return (
    <div className="intruder-controls">
      <h3 className="intruder-controls__heading">Intruder Controls</h3>

      <div className="intruder-controls__toggle">
        <label className="intruder-controls__label">
          <input
            type="checkbox"
            checked={settings.attackActive}
            onChange={(e) => onUpdate({ attackActive: e.target.checked })}
            disabled={disabled}
          />
          <span className="intruder-controls__switch" />
          Attack Mode {settings.attackActive ? "ON" : "OFF"}
        </label>
      </div>

      <div className="intruder-controls__slider">
        <label className="intruder-controls__label">
          Interception Intensity: {Math.round(settings.interceptionIntensity * 100)}%
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.interceptionIntensity}
          onChange={(e) => onUpdate({ interceptionIntensity: parseFloat(e.target.value) })}
          disabled={disabled || !settings.attackActive}
        />
      </div>

      <div className="intruder-controls__status">
        <h4>Intelligence</h4>
        <div className="intruder-controls__intel">
          <div className={`intruder-controls__intel-item${metrics.intruderCapturedKey ? " intruder-controls__intel-item--captured" : ""}`}>
            <span className="intruder-controls__intel-dot" />
            Key {metrics.intruderCapturedKey ? "Captured" : "Not captured"}
          </div>
          <div className={`intruder-controls__intel-item${metrics.intruderCapturedFile ? " intruder-controls__intel-item--captured" : ""}`}>
            <span className="intruder-controls__intel-dot" />
            File {metrics.intruderCapturedFile ? "Captured" : "Not captured"}
          </div>
        </div>
      </div>
    </div>
  );
}
