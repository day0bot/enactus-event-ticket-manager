import React, { useEffect } from "react";

/**
 * Canva OAuth Callback Page
 * This page receives the authorization code from Canva after the user grants permission.
 * It posts the code back to the opener window (the CanvaIntegrationModal popup listener).
 */
export default function CanvaCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error) {
      // User denied or error occurred
      if (window.opener) {
        window.opener.postMessage(
          { type: "canva_oauth_callback", error },
          window.location.origin
        );
      }
      window.close();
      return;
    }

    if (code && state) {
      // Post the authorization code back to the opener
      if (window.opener) {
        window.opener.postMessage(
          { type: "canva_oauth_callback", code, state },
          window.location.origin
        );
      }
      // Close the popup after a brief moment
      setTimeout(() => window.close(), 500);
    }
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        color: "white",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
        Connecting to Canva...
      </h1>
      <p style={{ fontSize: 14, color: "#999", maxWidth: 300, textAlign: "center" }}>
        This window will close automatically. If it doesn&apos;t, you can close it manually.
      </p>
      <div
        style={{
          marginTop: 24,
          width: 32,
          height: 32,
          border: "3px solid #333",
          borderTopColor: "#14b8a6",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
