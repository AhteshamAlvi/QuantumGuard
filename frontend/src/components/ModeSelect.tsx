import type { Mode } from "../types";

interface Props {
  selected: Mode | null;
  onSelect: (mode: Mode) => void;
  disabled?: boolean;
}

export function ModeSelect({ selected, onSelect, disabled }: Props) {
  return (
    <div className="mode-select">
      <h2 className="mode-select__heading">Select mode</h2>
      <div className="mode-select__options">
        <button
          className={`mode-select__btn mode-select__btn--classical${selected === "classical" ? " mode-select__btn--active" : ""}`}
          onClick={() => onSelect("classical")}
          disabled={disabled}
        >
          <span className="mode-select__btn-title">Classical</span>
          <span className="mode-select__btn-sub">Traditional key exchange</span>
        </button>
        <button
          className={`mode-select__btn mode-select__btn--quantum${selected === "quantum" ? " mode-select__btn--active" : ""}`}
          onClick={() => onSelect("quantum")}
          disabled={disabled}
        >
          <span className="mode-select__btn-title">Quantum (BB84)</span>
          <span className="mode-select__btn-sub">Quantum key distribution</span>
        </button>
      </div>
    </div>
  );
}
