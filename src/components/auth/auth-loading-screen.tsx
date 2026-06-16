"use client";

import { useState, useEffect, useCallback } from "react";

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
  variant,
}: AuthLoadingScreenProps) {
  const [elapsed, setElapsed] = useState(0);
  const [stage, setStage] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const start = performance.now();
    const interval = setInterval(() => {
      setElapsed(performance.now() - start);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (elapsed > MIN_DISPLAY_MS * 0.4 && stage < 1) setStage(1);
    if (elapsed > MIN_DISPLAY_MS * 0.75 && stage < 2) setStage(2);
  }, [elapsed, stage]);

  const finish = useCallback(() => {
    if (done) return;
    setDone(true);
    onComplete();
  }, [done, onComplete]);

  useEffect(() => {
    if (stage === 2 && elapsed >= MIN_DISPLAY_MS) {
      finish();
    }
  }, [stage, elapsed, finish]);

  const progress = Math.min((elapsed / MIN_DISPLAY_MS) * 100, 100);
  const seconds = (elapsed / 1000).toFixed(1);

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
