import type { Role } from "../types";

const ROLES: { value: Role; label: string; description: string; icon: string }[] = [
  { value: "origin", label: "Origin", description: "Send the file", icon: "\u2191" },
  { value: "target", label: "Target", description: "Receive the file", icon: "\u2193" },
  { value: "intruder", label: "Intruder", description: "Man-in-the-middle", icon: "\u2621" },
];

interface Props {
  selected: Role | null;
  onSelect: (role: Role) => void;
  disabled?: boolean;
}

export function RoleSelect({ selected, onSelect, disabled }: Props) {
  return (
    <div className="role-select">
      <h2 className="role-select__heading">Choose your role</h2>
      <div className="role-select__grid">
        {ROLES.map((r) => (
          <button
            key={r.value}
            className={`role-select__card role-select__card--${r.value}${selected === r.value ? " role-select__card--active" : ""}`}
            onClick={() => onSelect(r.value)}
            disabled={disabled}
          >
            <span className="role-select__icon">{r.icon}</span>
            <span className="role-select__label">{r.label}</span>
            <span className="role-select__desc">{r.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
