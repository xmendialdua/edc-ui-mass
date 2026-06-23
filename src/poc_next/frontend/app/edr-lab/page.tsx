"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface PartnerInfo {
  email: string;
  firstname: string;
  lastname: string;
  company_name: string;
  bpn: string;
}

interface PartnerDetails {
  email: string;
  firstname: string;
  lastname: string;
  company_name: string;
  bpn: string;
  management_url: string;
  dsp_url: string;
}

interface LabDiagnostics {
  success: boolean;
  serverTimeUtc?: string;
  transfer?: any;
  currentEdr?: any;
  refreshAttempt?: any;
  error?: string;
}

interface JwtTiming {
  iatUtc?: string;
  expUtc?: string;
  secondsToExpiration?: number;
}

export default function EdrLabPage() {
  const router = useRouter();

  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [partnerDetails, setPartnerDetails] = useState<PartnerDetails | null>(null);
  const [loadingPartner, setLoadingPartner] = useState(true);

  const [assetId, setAssetId] = useState("P2_UserManual");
  const [contractAgreementId, setContractAgreementId] = useState("");
  const [transferId, setTransferId] = useState("");

  const [edrEndpoint, setEdrEndpoint] = useState("");
  const [edrToken, setEdrToken] = useState("");
  const [diagnostics, setDiagnostics] = useState<LabDiagnostics | null>(null);

  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [autoProbe, setAutoProbe] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const ts = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${ts}] ${message}`, ...prev].slice(0, 300));
  };

  const formatTimelineTime = (raw?: string) => {
    if (!raw) return "n/a";

    const hasTz = /Z$|[+-]\d{2}:\d{2}$/.test(raw);
    const parsed = new Date(raw);

    if (Number.isNaN(parsed.getTime())) {
      return `${raw} (raw)`;
    }

    const local = parsed.toLocaleString("es-ES", { hour12: false });
    if (hasTz) {
      return `${local} (local) | ${parsed.toISOString()} (UTC)`;
    }

    return `${local} (local, origen sin zona: ${raw})`;
  };

  const logEdrTimeline = (context: string, timing?: JwtTiming, capturedAt?: string | null) => {
    const createdAt = formatTimelineTime(timing?.iatUtc);
    const refreshedAt = formatTimelineTime(timing?.iatUtc);
    const expiresAt = formatTimelineTime(timing?.expUtc);
    const ttl = typeof timing?.secondsToExpiration === "number" ? `${timing.secondsToExpiration}s` : "n/a";

    addLog(`${context} | EDR creado: ${createdAt}`);
    addLog(`${context} | Ultimo refresh: ${refreshedAt}`);
    addLog(`${context} | Expiracion: ${expiresAt} (TTL: ${ttl})`);
    if (capturedAt) {
      addLog(`${context} | Capturado en cache: ${formatTimelineTime(capturedAt)}`);
    }
  };

  const ttlSummary = useMemo(() => {
    const ttl = diagnostics?.currentEdr?.tokenTiming?.timing?.secondsToExpiration;
    const expired = diagnostics?.currentEdr?.tokenTiming?.timing?.expired;
    if (typeof ttl !== "number") return "TTL no disponible";
    if (expired) return `Expirado (${ttl}s)`;
    return `Vigente (${ttl}s para expirar)`;
  }, [diagnostics]);

  const fetchPartnerDetails = async (email: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    const resp = await fetch(`${apiUrl}/api/partners/${encodeURIComponent(email)}/details`);
    if (!resp.ok) {
      throw new Error("No se pudo cargar partner details");
    }
    const details: PartnerDetails = await resp.json();
    setPartnerDetails(details);
    addLog(`Partner cargado: ${details.company_name} (${details.bpn})`);
  };

  useEffect(() => {
    const init = async () => {
      setLoadingPartner(true);
      try {
        const partnerRaw = sessionStorage.getItem("authenticated_partner");
        if (!partnerRaw) {
          router.push("/partner-login");
          return;
        }
        const parsed: PartnerInfo = JSON.parse(partnerRaw);
        setPartner(parsed);
        await fetchPartnerDetails(parsed.email);
      } catch (e) {
        addLog(`Error autenticacion: ${e instanceof Error ? e.message : "Unknown"}`);
        router.push("/partner-login");
      } finally {
        setLoadingPartner(false);
      }
    };

    init();
  }, [router]);

  useEffect(() => {
    if (!autoProbe || !transferId.trim()) return;

    const timer = setInterval(() => {
      runDiagnostics(false, true);
    }, 15000);

    return () => clearInterval(timer);
  }, [autoProbe, transferId]);

  const pullLatestTransfer = async () => {
    if (!partnerDetails?.management_url) return;
    setRunningAction("latest");
    try {
      const result = await api.phase6.listTransfers(partnerDetails.management_url, "consumer");
      const latest = (result.transfers || [])[0];
      if (!latest) {
        addLog("No hay transferencias disponibles");
        return;
      }
      setTransferId(latest.id || "");
      setAssetId(latest.assetId || assetId);
      setContractAgreementId(latest.contractAgreementId || latest.contractId || contractAgreementId);
      setEdrEndpoint(latest.edrEndpoint || "");
      setEdrToken(latest.edrToken || "");
      addLog(`Transferencia seleccionada: ${latest.id} (${latest.state})`);
    } catch (e) {
      addLog(`Error cargando ultima transferencia: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setRunningAction(null);
    }
  };

  const createTransfer = async () => {
    if (!contractAgreementId.trim()) {
      addLog("Necesitas contractAgreementId para crear transferencia");
      return;
    }
    if (!assetId.trim()) {
      addLog("Necesitas assetId para crear transferencia");
      return;
    }

    setRunningAction("create");
    try {
      addLog("Iniciando transferencia...");
      const result = await api.phase6.initiateTransfer({
        contractAgreementId: contractAgreementId.trim(),
        assetId: assetId.trim(),
        consumerBpn: partnerDetails?.bpn,
        consumerManagementUrl: partnerDetails?.management_url,
      });

      if (!result.success) {
        addLog(`Error creando transferencia: ${result.error || "sin detalle"}`);
        return;
      }

      const newTransferId = result.transfer?.id;
      if (newTransferId) {
        setTransferId(newTransferId);
        addLog(`Transfer creada: ${newTransferId}`);
      } else {
        addLog("Transfer creada, recuperando ultima transferencia...");
        await pullLatestTransfer();
      }
    } catch (e) {
      addLog(`Excepcion creando transferencia: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setRunningAction(null);
    }
  };

  const fetchCurrentEdr = async () => {
    if (!transferId.trim()) {
      addLog("Indica un transferId");
      return;
    }

    setRunningAction("edr");
    try {
      const result = await api.phase6.getTransferEdr(transferId.trim());
      if (!result.success || !result.edr) {
        addLog(`EDR no disponible: ${result.error || "sin detalle"}${result.message ? ` (${result.message})` : ""}`);
        return;
      }
      const endpoint = result.edr.endpoint || "";
      const token = result.edr.authorization || "";

      if (!endpoint || !token) {
        addLog(`EDR incompleto: endpoint=${endpoint ? "ok" : "missing"}, tokenLen=${token.length}`);
        return;
      }

      setEdrEndpoint(endpoint);
      setEdrToken(token);
      addLog(`EDR obtenido (${result.cached ? "cache" : "on-demand"}), tokenLen=${token.length}`);

      const diag = await api.phase6.getEdrDiagnostics(transferId.trim(), false);
      if (diag.success) {
        const t = diag.currentEdr?.tokenTiming?.timing as JwtTiming | undefined;
        const capturedAt = diag.currentEdr?.capturedAt as string | undefined;
        logEdrTimeline("EDR actual", t, capturedAt || null);
      }
    } catch (e) {
      addLog(`Error obteniendo EDR: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setRunningAction(null);
    }
  };

  const runDiagnostics = async (forceRefresh: boolean, silent: boolean = false) => {
    if (!transferId.trim()) {
      addLog("Indica un transferId para diagnosticar");
      return;
    }

    if (!silent) setRunningAction(forceRefresh ? "diag-refresh" : "diag");
    try {
      const result = await api.phase6.getEdrDiagnostics(transferId.trim(), forceRefresh);
      setDiagnostics(result);

      if (!result.success) {
        addLog(`Diagnostico error: ${result.error || "sin detalle"}`);
        return;
      }

      const state = result.transfer?.state;
      const ttl = result.currentEdr?.tokenTiming?.timing?.secondsToExpiration;
      const expired = result.currentEdr?.tokenTiming?.timing?.expired;
      const refreshError = result.refreshAttempt?.error;

      if (!silent) {
        addLog(
          `Diagnostico OK: state=${state}, ttl=${typeof ttl === "number" ? ttl : "n/a"}, expired=${String(expired)}, refreshError=${refreshError || "none"}`
        );

        const currentTiming = result.currentEdr?.tokenTiming?.timing as JwtTiming | undefined;
        logEdrTimeline("Diagnostico EDR", currentTiming, result.currentEdr?.capturedAt || null);

        const rejectedTiming = result.refreshAttempt?.rejectedTokenTiming?.timing as JwtTiming | undefined;
        if (rejectedTiming) {
          logEdrTimeline("Token rechazado por STS", rejectedTiming, null);
        }
      }

      const endpoint = result.currentEdr?.endpoint;
      if (endpoint) {
        setEdrEndpoint(endpoint);
      }
    } catch (e) {
      addLog(`Error diagnostico: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      if (!silent) setRunningAction(null);
    }
  };

  const requestFreshToken = async (forceRefresh: boolean) => {
    if (!transferId.trim()) {
      addLog("Indica un transferId para renovar token");
      return;
    }

    setRunningAction(forceRefresh ? "fresh-force" : "fresh");
    try {
      const result = await api.phase6.getFreshToken(transferId.trim(), forceRefresh);
      if (!result.success) {
        addLog(`Renovacion fallo: ${result.error || "sin detalle"}`);
        return;
      }

      setEdrToken(result.token || "");
      if (result.endpoint) setEdrEndpoint(result.endpoint);

      const ttl = result.tokenDiagnostics?.timing?.secondsToExpiration;
      addLog(`Token renovado (${forceRefresh ? "forzado" : "normal"}), ttl=${typeof ttl === "number" ? ttl : "n/a"}`);

      const refreshTiming = result.tokenDiagnostics?.timing as JwtTiming | undefined;
      logEdrTimeline(`Refresh ${forceRefresh ? "forzado" : "normal"}`, refreshTiming, null);
    } catch (e) {
      addLog(`Error renovando token: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setRunningAction(null);
    }
  };

  const tryDownload = async () => {
    if (!transferId.trim() || !edrEndpoint.trim() || !edrToken.trim()) {
      addLog("Necesitas transferId + endpoint + token para probar download");
      return;
    }

    setRunningAction("download");
    try {
      const { blob, filename, contentType } = await api.phase6.downloadFile({
        transferId: transferId.trim(),
        endpoint: edrEndpoint.trim(),
        token: edrToken.trim(),
      });
      addLog(`Download OK: ${filename} (${blob.size} bytes, ${contentType})`);
    } catch (e) {
      addLog(`Download error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setRunningAction(null);
    }
  };

  if (loadingPartner) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Segoe UI, sans-serif" }}>
        Cargando EDR Lab...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px",
        background: "linear-gradient(120deg, #0f172a 0%, #1f2937 40%, #111827 100%)",
        color: "#e5e7eb",
        fontFamily: "Segoe UI, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gap: "16px" }}>
        <div style={{ background: "rgba(17,24,39,0.9)", border: "1px solid #334155", borderRadius: "12px", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "24px", color: "#f8fafc" }}>EDR Lab - Diagnostico paso a paso</h1>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "6px" }}>
                Partner: {partner?.firstname} {partner?.lastname} | BPN: {partnerDetails?.bpn || "n/a"}
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => router.push("/partner-data")}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #475569", background: "#0f172a", color: "#e2e8f0", cursor: "pointer" }}
              >
                Volver a Partner Data
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "2fr 1fr", alignItems: "start" }}>
          <div style={{ background: "rgba(17,24,39,0.9)", border: "1px solid #334155", borderRadius: "12px", padding: "16px", minWidth: 0 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "18px" }}>Setup</h2>

            <div style={{ display: "grid", gap: "10px" }}>
              <label style={{ fontSize: "12px", color: "#cbd5e1" }}>
                Contract Agreement ID
                <input
                  value={contractAgreementId}
                  onChange={(e) => setContractAgreementId(e.target.value)}
                  placeholder="857cd53e-..."
                  style={{ width: "100%", marginTop: "4px", borderRadius: "8px", border: "1px solid #475569", background: "#0b1220", color: "#e2e8f0", padding: "8px" }}
                />
              </label>
              <label style={{ fontSize: "12px", color: "#cbd5e1" }}>
                Asset ID
                <input
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  style={{ width: "100%", marginTop: "4px", borderRadius: "8px", border: "1px solid #475569", background: "#0b1220", color: "#e2e8f0", padding: "8px" }}
                />
              </label>
              <label style={{ fontSize: "12px", color: "#cbd5e1" }}>
                Transfer ID
                <input
                  value={transferId}
                  onChange={(e) => setTransferId(e.target.value)}
                  placeholder="43e1c0e1-..."
                  style={{ width: "100%", marginTop: "4px", borderRadius: "8px", border: "1px solid #475569", background: "#0b1220", color: "#e2e8f0", padding: "8px" }}
                />
              </label>
            </div>

            <div style={{ marginTop: "14px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <button onClick={createTransfer} disabled={!!runningAction} style={{ padding: "8px 10px", borderRadius: "8px", border: "none", background: "#1d4ed8", color: "white", cursor: "pointer" }}>
                1) Crear Transfer
              </button>
              <button onClick={pullLatestTransfer} disabled={!!runningAction} style={{ padding: "8px 10px", borderRadius: "8px", border: "none", background: "#0369a1", color: "white", cursor: "pointer" }}>
                2) Cargar Ultima Transfer
              </button>
              <button onClick={fetchCurrentEdr} disabled={!!runningAction} style={{ padding: "8px 10px", borderRadius: "8px", border: "none", background: "#0f766e", color: "white", cursor: "pointer" }}>
                3) Obtener EDR actual
              </button>
              <button onClick={() => runDiagnostics(false)} disabled={!!runningAction} style={{ padding: "8px 10px", borderRadius: "8px", border: "none", background: "#6d28d9", color: "white", cursor: "pointer" }}>
                4) Diagnosticar TTL (sin refresh)
              </button>
              <button onClick={() => requestFreshToken(false)} disabled={!!runningAction} style={{ padding: "8px 10px", borderRadius: "8px", border: "none", background: "#a16207", color: "white", cursor: "pointer" }}>
                5) Refresh normal
              </button>
              <button onClick={() => requestFreshToken(true)} disabled={!!runningAction} style={{ padding: "8px 10px", borderRadius: "8px", border: "none", background: "#dc2626", color: "white", cursor: "pointer" }}>
                6) Refresh forzado (auto_refresh)
              </button>
              <button onClick={() => runDiagnostics(true)} disabled={!!runningAction} style={{ padding: "8px 10px", borderRadius: "8px", border: "none", background: "#be123c", color: "white", cursor: "pointer" }}>
                7) Diagnostico + refresh forzado
              </button>
              <button onClick={tryDownload} disabled={!!runningAction} style={{ padding: "8px 10px", borderRadius: "8px", border: "none", background: "#16a34a", color: "white", cursor: "pointer" }}>
                8) Probar Download
              </button>
            </div>

            <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
              <input id="autoProbe" type="checkbox" checked={autoProbe} onChange={(e) => setAutoProbe(e.target.checked)} />
              <label htmlFor="autoProbe">Auto-diagnostico cada 15s (para observar caducidad)</label>
              {runningAction && <span style={{ color: "#fbbf24" }}>Ejecutando: {runningAction}</span>}
            </div>
          </div>

          <div style={{ background: "rgba(17,24,39,0.9)", border: "1px solid #334155", borderRadius: "12px", padding: "16px", minWidth: 0 }}>
            <h2 style={{ margin: "0 0 10px", fontSize: "18px" }}>Estado rapido</h2>
            <div style={{ fontSize: "12px", display: "grid", gap: "6px", color: "#cbd5e1", minWidth: 0 }}>
              <div><strong>Transfer state:</strong> {diagnostics?.transfer?.state || "n/a"}</div>
              <div><strong>State code:</strong> {diagnostics?.transfer?.stateCode ?? "n/a"}</div>
              <div><strong>EDR source:</strong> {diagnostics?.currentEdr?.source || "n/a"}</div>
              <div><strong>EDR available:</strong> {String(!!diagnostics?.currentEdr?.available)}</div>
              <div><strong>EDR cache error:</strong> {diagnostics?.currentEdr?.error || "none"}</div>
              <div><strong>Token TTL:</strong> {ttlSummary}</div>
              <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" }}><strong>Refresh attempt error:</strong> {diagnostics?.refreshAttempt?.error || "none"}</div>
              <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" }}><strong>Refresh attempt msg:</strong> {diagnostics?.refreshAttempt?.message || "none"}</div>
              <div>
                <strong>Rejected token TTL:</strong>{" "}
                {typeof diagnostics?.refreshAttempt?.rejectedTokenTiming?.timing?.secondsToExpiration === "number"
                  ? `${diagnostics.refreshAttempt.rejectedTokenTiming.timing.secondsToExpiration}s`
                  : "n/a"}
              </div>
              <div>
                <strong>Rejected token exp:</strong>{" "}
                {diagnostics?.refreshAttempt?.rejectedTokenTiming?.timing?.expUtc || "n/a"}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
          <div style={{ background: "rgba(17,24,39,0.9)", border: "1px solid #334155", borderRadius: "12px", padding: "16px", minWidth: 0 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: "16px" }}>EDR inputs actuales</h3>
            <label style={{ fontSize: "12px", color: "#cbd5e1" }}>
              Endpoint
              <input
                value={edrEndpoint}
                onChange={(e) => setEdrEndpoint(e.target.value)}
                style={{ width: "100%", marginTop: "4px", borderRadius: "8px", border: "1px solid #475569", background: "#0b1220", color: "#e2e8f0", padding: "8px" }}
              />
            </label>
            <label style={{ fontSize: "12px", color: "#cbd5e1", display: "block", marginTop: "10px" }}>
              Token (Bearer)
              <textarea
                value={edrToken}
                onChange={(e) => setEdrToken(e.target.value)}
                rows={5}
                style={{ width: "100%", marginTop: "4px", borderRadius: "8px", border: "1px solid #475569", background: "#0b1220", color: "#e2e8f0", padding: "8px", fontFamily: "monospace", fontSize: "11px" }}
              />
            </label>
          </div>

          <div style={{ background: "rgba(17,24,39,0.9)", border: "1px solid #334155", borderRadius: "12px", padding: "16px", minWidth: 0 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: "16px" }}>Timeline de pruebas</h3>
            <div style={{ maxHeight: "260px", overflowY: "auto", overflowX: "hidden", fontFamily: "monospace", fontSize: "11px", color: "#d1d5db", display: "grid", gap: "4px", minWidth: 0 }}>
              {logs.length === 0 && <div style={{ color: "#94a3b8" }}>Sin eventos todavia</div>}
              {logs.map((line, idx) => (
                <div
                  key={`${line}-${idx}`}
                  style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" }}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(17,24,39,0.9)", border: "1px solid #334155", borderRadius: "12px", padding: "16px" }}>
          <h3 style={{ margin: "0 0 10px", fontSize: "16px" }}>Raw diagnostics JSON</h3>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "11px", color: "#cbd5e1" }}>
            {JSON.stringify(diagnostics, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
