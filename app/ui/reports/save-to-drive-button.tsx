"use client";

import { useState } from "react";
import { useI18n } from "@/app/i18n-provider";

interface TokenResponse {
  access_token?: string;
  error?: string;
}

interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
}

interface GoogleAccountsOAuth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
  }) => TokenClient;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: GoogleAccountsOAuth2;
      };
    };
  }
}

const GSI_SRC = "https://accounts.google.com/gsi/client";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("gsi-load-failed")));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("gsi-load-failed"));
    document.head.appendChild(script);
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function uploadToDrive(accessToken: string, filename: string, blob: Blob): Promise<{ name: string; webViewLink?: string }> {
  const boundary = "cafesync-drive-upload-boundary";
  const metadata = { name: filename, mimeType: XLSX_MIME };
  const base64Data = arrayBufferToBase64(await blob.arrayBuffer());

  const body =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\n` +
    `Content-Type: ${XLSX_MIME}\r\n` +
    "Content-Transfer-Encoding: base64\r\n\r\n" +
    base64Data +
    `\r\n--${boundary}--`;

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary="${boundary}"`,
      },
      body,
    },
  );

  if (!response.ok) {
    throw new Error(`drive-upload-failed-${response.status}`);
  }
  return response.json();
}

type Status = "idle" | "loading" | "success" | "error";

export function SaveToDriveButton({ exportUrl, filename }: { exportUrl: string; filename: string }) {
  const { t } = useI18n();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setStatus("error");
      setMessage(t("reports.driveErrorMissingConfig"));
      return;
    }

    setStatus("loading");
    setMessage(null);

    try {
      await loadGsiScript();
    } catch {
      setStatus("error");
      setMessage(t("reports.driveErrorGeneric"));
      return;
    }

    const tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: async (response) => {
        if (!response.access_token) {
          setStatus("error");
          setMessage(t("reports.driveErrorGeneric"));
          return;
        }
        try {
          const blob = await fetch(exportUrl).then((r) => r.blob());
          const file = await uploadToDrive(response.access_token, filename, blob);
          setStatus("success");
          setMessage(t("reports.savedToDriveSuccess", { name: file.name }));
        } catch {
          setStatus("error");
          setMessage(t("reports.driveErrorGeneric"));
        }
      },
    });
    tokenClient.requestAccessToken();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "loading"}
        className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? t("reports.savingToDrive") : t("reports.saveToDrive")}
      </button>
      {message && (
        <p className={`text-xs ${status === "error" ? "text-red-600" : "text-emerald-600"}`}>{message}</p>
      )}
    </div>
  );
}
