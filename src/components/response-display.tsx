"use client";

interface ResponseDisplayProps {
  content: string | null;
  modelUsed: string | null;
  loading: boolean;
  error: string | null;
}

export function ResponseDisplay({ content, modelUsed, loading, error }: ResponseDisplayProps) {
  if (loading) {
    return (
      <div className="response-card response-loading">
        <div className="loading-spinner" />
        <p className="loading-text">Composing your email...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="response-card response-error">
        <h3 className="response-error-title">Generation Failed</h3>
        <p className="response-error-text">{error}</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="response-card response-empty">
        <div className="empty-icon">✉</div>
        <h3 className="empty-title">Your email will appear here</h3>
        <p className="empty-text">
          Enter a prompt above and click Generate to compose your email.
        </p>
      </div>
    );
  }

  return (
    <div className="response-card response-success">
      <div className="response-header">
        <h3 className="response-title">Generated Email</h3>
        {modelUsed && <span className="response-model">via {modelUsed}</span>}
      </div>
      <div className="response-content">
        {content.split("\n").map((line, i) => (
          <p key={i}>{line || "\u00A0"}</p>
        ))}
      </div>
      <button
        className="copy-btn"
        onClick={() => navigator.clipboard.writeText(content)}
      >
        Copy to Clipboard
      </button>
    </div>
  );
}
