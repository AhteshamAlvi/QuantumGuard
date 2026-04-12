import type { DeviceInfo, Role } from "../types";

interface Props {
  devices: DeviceInfo[];
  myRole: Role | null;
}

const ROLE_LABELS: Record<string, string> = {
  origin: "Origin",
  target: "Target",
  intruder: "Intruder",
};

export function DeviceStatus({ devices, myRole }: Props) {
  const allRoles = ["origin", "target", "intruder"] as const;

  return (
    <div className="device-status">
      <h3 className="device-status__heading">Devices</h3>
      <div className="device-status__list">
        {allRoles.map((role) => {
          const device = devices.find((d) => d.role === role);
          const isConnected = device?.connected ?? false;
          const isMe = role === myRole;

          const classes = [
            "device-status__item",
            isConnected ? "device-status__item--connected" : "",
            isMe && isConnected ? "device-status__item--me" : "",
          ].filter(Boolean).join(" ");

          return (
            <div key={role} className={classes}>
              <span className="device-status__dot" />
              <span className="device-status__role">
                {ROLE_LABELS[role]}
                {isMe && <span className="device-status__you"> (you)</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
