"use client";

import { useState } from "react";

export function SessionModePicker() {
  const [mode, setMode] = useState<10 | 15>(15);

  return (
    <div className="panel">
      <h3 style={{ marginTop: 0 }}>Session Policy</h3>
      <p className="page-sub">Allowed modes are fixed at 10 or 15 minutes. Default is 15 minutes.</p>
      <div className="controls" role="group" aria-label="Session mode">
        <button
          className={`btn ${mode === 10 ? "primary" : ""}`}
          onClick={() => setMode(10)}
          type="button"
        >
          10 dk
        </button>
        <button
          className={`btn ${mode === 15 ? "primary" : ""}`}
          onClick={() => setMode(15)}
          type="button"
        >
          15 dk
        </button>
      </div>
      <p className="footer-note">Aktif mod: {mode} dk</p>
    </div>
  );
}
