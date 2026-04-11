import type { DeviceInfo } from "../types";

interface Props {
  devices: DeviceInfo[];
}

const ROLE_LABELS: Record<string, string> = {
  origin: "Origin",
  target: "Target",
  intruder: "Intruder",
};

export function DeviceStatus({ devices }: Props) {
  const allRoles = ["origin", "target", "intruder"] as const;

  return (
    <div className="device-status">
      <h3 className="device-status__heading">Devices</h3>
      <div className="device-status__list">
        {allRoles.map((role) => {
          const device = devices.find((d) => d.role === role);
          const isConnected = device?.connected ?? false;
          return (
            <div key={role} className={`device-status__item${isConnected ? " device-status__item--connected" : ""}`}>
              <span className="device-status__dot" />
              <span className="device-status__role">{ROLE_LABELS[role]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
