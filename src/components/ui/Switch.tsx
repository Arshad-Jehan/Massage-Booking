interface Props {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export function Switch({ checked, onChange, label, disabled, ariaLabel }: Props) {
  return (
    <label className="switch">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel ?? label}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch-track" />
      {label && <span className="switch-label">{label}</span>}
    </label>
  );
}
