import { useState } from "react";
import { X } from "@phosphor-icons/react";
import { ProfileTab } from "./ProfileTab";
import { AccountTab } from "./AccountTab";

type Tab = "profile" | "account";

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="settings-modal__header">
          <h2>Settings</h2>
          <button type="button" onClick={onClose} aria-label="Close settings">
            <X size={20} weight="bold" />
          </button>
        </header>
        <div className="settings-modal__body">
          <nav className="settings-modal__nav">
            <button
              type="button"
              className={tab === "profile" ? "is-active" : ""}
              onClick={() => setTab("profile")}
            >
              Profile
            </button>
            <button
              type="button"
              className={tab === "account" ? "is-active" : ""}
              onClick={() => setTab("account")}
            >
              Account
            </button>
          </nav>
          <div className="settings-modal__content">
            {tab === "profile" ? <ProfileTab /> : <AccountTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
