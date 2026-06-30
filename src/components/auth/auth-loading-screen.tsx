"use client";

import { useState, useEffect } from "react";

interface AuthLoadingScreenProps {
  onComplete: () => void;
  variant: "login" | "register";
}

const STAGES = [
  { active: "Validating credentials...", done: "Credentials validated" },
  { active: "Authenticating...", done: "Authenticated" },
  { active: "Preparing your dashboard...", done: "Dashboard ready" },
];

const MIN_DISPLAY_MS = 2000;

export function AuthLoadingScreen({
  onComplete,
}: AuthLoadingScreenProps) {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const onCompleteRef = onComplete;

    const interval = setInterval(() => {
      const elapsed = performance.now() - start;
      const pct = Math.min((elapsed / MIN_DISPLAY_MS) * 100, 100);
      setProgress(pct);

      if (elapsed > MIN_DISPLAY_MS * 0.4) {
        setStage((prev) => (prev < 1 ? 1 : prev));
      }
      if (elapsed > MIN_DISPLAY_MS * 0.75) {
        setStage((prev) => (prev < 2 ? 2 : prev));
      }
      if (elapsed >= MIN_DISPLAY_MS) {
        clearInterval(interval);
        onCompleteRef();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [onComplete]);

  const seconds = (progress / 100 * MIN_DISPLAY_MS / 1000).toFixed(1);

  return (
    <div className="auth-loading-screen">
      <div className="auth-loading-screen__card">
        <span className="auth-loading-screen__title">AutoCompose</span>

        <div className="auth-loading-screen__steps">
          {STAGES.map((s, i) => (
            <div
              key={i}
              className={`auth-loading-screen__step ${
                i < stage
                  ? "auth-loading-screen__step--done"
                  : i === stage
                    ? "auth-loading-screen__step--active"
                    : ""
              }`}
            >
              <span className="auth-loading-screen__step-icon">
                {i < stage ? "✓" : i === stage ? "●" : "○"}
              </span>
              <span className="auth-loading-screen__step-text">
                {i < stage ? s.done : i <= stage ? s.active : ""}
              </span>
            </div>
          ))}
        </div>

        <div className="auth-loading-screen__progress">
          <div
            className="auth-loading-screen__progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="auth-loading-screen__time">{seconds}s</span>
      </div>
    </div>
  );
}
