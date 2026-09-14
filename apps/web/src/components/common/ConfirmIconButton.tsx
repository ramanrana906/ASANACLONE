import { useState, type ReactNode } from "react";
import { Check, X } from "@phosphor-icons/react";

interface ConfirmIconButtonProps {
  icon: ReactNode;
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
}

export function ConfirmIconButton({ icon, label, onConfirm, disabled }: ConfirmIconButtonProps) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="confirm-inline">
        <button
          type="button"
          className="confirm-inline__yes"
          onClick={() => {
            onConfirm();
            setConfirming(false);
          }}
          disabled={disabled}
          aria-label={`Confirm: ${label}`}
        >
          <Check size={13} weight="bold" />
        </button>
        <button
          type="button"
          className="confirm-inline__no"
          onClick={() => setConfirming(false)}
          aria-label="Cancel"
        >
          <X size={13} weight="bold" />
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      className="settings-icon-button"
      onClick={() => setConfirming(true)}
      aria-label={label}
    >
      {icon}
    </button>
  );
}
