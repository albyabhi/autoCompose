"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/card";

interface TelegramStatus {
  linked: boolean;
  username: string | null;
  linkedAt: string | null;
  enabled: boolean;
  botEnabled: boolean;
  botUsername: string | null;
}

interface LoginCodeResponse {
  code: string;
  expiresAt: string;
  deepLink: string;
  botUsername: string | null;
  botEnabled: boolean;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "just now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function useTelegramStatus() {
  const [data, setData] = useState<TelegramStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await api.get<TelegramStatus>("/api/telegram/status");
      setData(status);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load status";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timeout);
  }, [refresh]);

  return { data, error, loading, refresh };
}

function CountdownTimer({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) {
  const target = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const [remaining, setRemaining] = useState(() => Math.max(0, target - Date.now()));

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, target - Date.now());
      setRemaining(left);
      if (left <= 0) onExpire();
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, [target, onExpire]);

  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  return (
    <span className="telegram-card__countdown">
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </span>
  );
}

export function TelegramCard() {
  const { data, error, loading, refresh } = useTelegramStatus();
  const [code, setCode] = useState<LoginCodeResponse | null>(null);
  const [actionLoading, setActionLoading] = useState<"generate" | "revoke" | "disconnect" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
    setActionLoading("generate");
    setActionError(null);
    try {
      const response = await api.post<LoginCodeResponse>("/api/telegram/login-code");
      setCode(response);
      setCopied(false);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to generate code");
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleRevoke = useCallback(async () => {
    setActionLoading("revoke");
    setActionError(null);
    try {
      await api.delete("/api/telegram/login-code");
      setCode(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to revoke code");
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    if (!confirm("Disconnect Telegram? You can re-link any time.")) return;
    setActionLoading("disconnect");
    setActionError(null);
    try {
      await api.delete("/api/telegram/link");
      setCode(null);
      await refresh();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to disconnect");
    } finally {
      setActionLoading(null);
    }
  }, [refresh]);

  const handleCopy = useCallback(async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [code]);

  if (loading && !data) {
    return (
      <Card className="telegram-card">
        <CardHeader>
          <h2 className="telegram-card__title">Telegram Integration</h2>
        </CardHeader>
        <CardBody>
          <p className="telegram-card__muted">Loading…</p>
        </CardBody>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card className="telegram-card">
        <CardHeader>
          <h2 className="telegram-card__title">Telegram Integration</h2>
        </CardHeader>
        <CardBody>
          <p className="telegram-card__error">{error}</p>
          <Button variant="secondary" onClick={refresh}>Retry</Button>
        </CardBody>
      </Card>
    );
  }

  if (!data) return null;

  if (!data.botEnabled) {
    return (
      <Card className="telegram-card">
        <CardHeader>
          <h2 className="telegram-card__title">Telegram Integration</h2>
        </CardHeader>
        <CardBody>
          <p className="telegram-card__muted">
            The Telegram bot is not configured on this server. Set <code>TELEGRAM_BOT_TOKEN</code> and
            <code> TELEGRAM_WEBHOOK_SECRET</code> in the environment to enable.
          </p>
        </CardBody>
      </Card>
    );
  }

  if (data.linked) {
    return (
      <Card className="telegram-card">
        <CardHeader>
          <h2 className="telegram-card__title">Telegram Integration</h2>
        </CardHeader>
        <CardBody>
          <div className="telegram-card__status">
            <span className="telegram-card__pill telegram-card__pill--ok">Connected</span>
            {data.username && (
              <span className="telegram-card__username">@{data.username}</span>
            )}
            <span className="telegram-card__muted">Linked {formatRelative(data.linkedAt)}</span>
          </div>
          {data.botUsername && (
            <p className="telegram-card__muted">
              Open <a href={`https://t.me/${data.botUsername}`} target="_blank" rel="noreferrer">@${data.botUsername}</a> and type /menu.
            </p>
          )}
          {actionError && <p className="telegram-card__error">{actionError}</p>}
        </CardBody>
        <CardFooter>
          <Button
            variant="danger"
            onClick={handleDisconnect}
            loading={actionLoading === "disconnect"}
            disabled={actionLoading !== null}
          >
            Disconnect Telegram
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="telegram-card">
      <CardHeader>
        <h2 className="telegram-card__title">Telegram Integration</h2>
      </CardHeader>
      <CardBody>
        <p className="telegram-card__muted">
          Connect your Telegram account to compose and send emails on the go.
        </p>

        {code ? (
          <div className="telegram-card__code">
            <p className="telegram-card__label">Your login code</p>
            <div className="telegram-card__code-row">
              <code className="telegram-card__code-value">{code.code}</code>
              <Button variant="secondary" onClick={handleCopy}>
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            {code.deepLink && (
              <p className="telegram-card__muted">
                <a href={code.deepLink} target="_blank" rel="noreferrer">
                  Tap to open the bot
                </a>
              </p>
            )}
            <p className="telegram-card__muted">
              Expires in <CountdownTimer expiresAt={code.expiresAt} onExpire={() => setCode(null)} />
            </p>
            {actionError && <p className="telegram-card__error">{actionError}</p>}
          </div>
        ) : (
          <>
            {actionError && <p className="telegram-card__error">{actionError}</p>}
            <p className="telegram-card__muted">
              Generate a one-time code, then send it to <a href={`https://t.me/${data.botUsername ?? ""}`} target="_blank" rel="noreferrer">@${data.botUsername}</a>.
            </p>
          </>
        )}
      </CardBody>
      <CardFooter>
        {code ? (
          <Button
            variant="ghost"
            onClick={handleRevoke}
            loading={actionLoading === "revoke"}
            disabled={actionLoading !== null}
          >
            Revoke code
          </Button>
        ) : (
          <Button
            onClick={handleGenerate}
            loading={actionLoading === "generate"}
            disabled={actionLoading !== null}
          >
            Generate login code
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
