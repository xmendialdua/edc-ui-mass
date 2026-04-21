"use client";

import { useState, useEffect, useRef } from "react";
import Phase5Content from "@/components/phases/phase5-content";
import NegotiationsContent from "@/components/phases/negotiations-content";
import TransfersContent from "@/components/phases/transfers-content";
import Image from "next/image";
import { RefreshCw } from "lucide-react";

export default function PartnerDataPage() {
  const [connectorStatus] = useState<"checking" | "connected" | "disconnected">("connected");
  const [isMounted, setIsMounted] = useState(false);
  const [globalLogs, setGlobalLogs] = useState<string[]>([]);
  const phase5Ref = useRef<any>(null);
  const negotiationsRef = useRef<any>(null);
  const transfersRef = useRef<any>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setGlobalLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const clearLogs = () => {
    setGlobalLogs([]);
  };

  return (
    <div style={{ 
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      minHeight: "100vh",
      padding: "20px"
    }}>
      <div style={{ maxWidth: "1800px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{
          background: "white",
          padding: "30px",
          borderRadius: "10px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          marginBottom: "20px"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "15px"
          }}>
            <Image 
              src="/logo-mondragon.png" 
              alt="Mondragon Assembly" 
              width={180} 
              height={36}
              style={{ height: "40px", width: "auto" }}
            />
            <div>
              <h1 style={{ 
                color: "#333", 
                margin: 0,
                fontSize: "28px" 
              }}>Partner Data Access Dashboard</h1>
            </div>
          </div>

          <div style={{
            background: "#f0f4f8",
            padding: "15px",
            borderRadius: "5px",
            marginTop: "15px",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "10px",
            fontSize: "13px"
          }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{
                fontWeight: "bold",
                color: "#555",
                marginBottom: "5px",
                fontSize: "14px"
              }}>IKLN Connector:</div>
              <div style={{
                color: "#333",
                fontFamily: "'Courier New', monospace",
                fontSize: "14px"
              }}>BPNL00000002IKLN</div>
            </div>

            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px"
            }}>
              <div style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "#28a745",
                boxShadow: "0 0 10px rgba(40, 167, 69, 0.6)"
              }} />
              <div style={{
                fontSize: "13px",
                fontWeight: "600",
                color: "#28a745"
              }}>
                Conectado
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{
                fontWeight: "bold",
                color: "#555",
                marginBottom: "5px",
                fontSize: "14px"
              }}>Management API:</div>
              <div style={{
                color: "#333",
                fontFamily: "'Courier New', monospace",
                fontSize: "12px",
                wordBreak: "break-all"
              }}>https://edc-ikln-control.51.178.94.25.nip.io/management</div>
            </div>
          </div>
        </div>

        {/* Main Panels: 3 Columns */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "15px",
          marginBottom: "20px"
        }}>
          {/* Catalog Panel */}
          <div style={{
            background: "white",
            borderRadius: "10px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            overflow: "hidden"
          }}>
            <div style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              padding: "15px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{
                fontSize: "18px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}>
                <span style={{ fontSize: "24px" }}>📋</span>
                <span>Catálogo Disponible</span>
              </div>
              <button
                onClick={() => phase5Ref.current?.refresh()}
                style={{
                  padding: "8px",
                  background: "rgba(255, 255, 255, 0.2)",
                  color: "white",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                }}
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <div style={{
              padding: "20px",
              minHeight: "400px"
            }}>
              <Phase5Content 
                ref={phase5Ref} 
                onLog={addLog}
                onNegotiationComplete={() => negotiationsRef.current?.refresh()}
              />
            </div>
          </div>

          {/* Negotiation Panel */}
          <div style={{
            background: "white",
            borderRadius: "10px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            overflow: "hidden"
          }}>
            <div style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              padding: "15px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{
                fontSize: "18px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}>
                <span style={{ fontSize: "24px" }}>🤝</span>
                <span>Negociaciones</span>
              </div>
              <button
                onClick={() => negotiationsRef.current?.refresh()}
                style={{
                  padding: "8px",
                  background: "rgba(255, 255, 255, 0.2)",
                  color: "white",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                }}
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <div style={{
              padding: "20px",
              minHeight: "400px"
            }}>
              <NegotiationsContent ref={negotiationsRef} onLog={addLog} />
            </div>
          </div>

          {/* Transfer Panel */}
          <div style={{
            background: "white",
            borderRadius: "10px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            overflow: "hidden"
          }}>
            <div style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              padding: "15px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{
                fontSize: "18px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}>
                <span style={{ fontSize: "24px" }}>📥</span>
                <span>Transferencias</span>
              </div>
              <button
                onClick={() => transfersRef.current?.refresh()}
                style={{
                  padding: "8px",
                  background: "rgba(255, 255, 255, 0.2)",
                  color: "white",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                }}
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <div style={{
              padding: "20px",
              minHeight: "400px"
            }}>
              <TransfersContent ref={transfersRef} onLog={addLog} />
            </div>
          </div>
        </div>

        {/* Operations Log */}
        <div style={{
          background: "white",
          borderRadius: "10px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          overflow: "hidden"
        }}>
          <div style={{
            background: "#2d3748",
            color: "white",
            padding: "15px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{
              fontSize: "18px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              📋 Registro de Operaciones
            </div>
            <button
              onClick={clearLogs}
              style={{
                padding: "8px 16px",
                background: "rgba(255, 255, 255, 0.2)",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "600"
              }}
            >
              Limpiar Logs
            </button>
          </div>
          <div style={{
            padding: "0",
            background: "#1a202c",
            color: "#a0aec0",
            fontFamily: "'Courier New', monospace",
            fontSize: "12px",
            maxHeight: "300px",
            overflowY: "auto"
          }}>
            <div style={{ padding: "15px" }}>
              {globalLogs.length === 0 ? (
                isMounted ? (
                  <>
                    <div>[{new Date().toLocaleTimeString()}] Sistema iniciado</div>
                    <div>[{new Date().toLocaleTimeString()}] Listo para consultar catálogos</div>
                  </>
                ) : (
                  <>
                    <div>[--:--:--] Sistema iniciado</div>
                    <div>[--:--:--] Listo para consultar catálogos</div>
                  </>
                )
              ) : (
                globalLogs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.1);
          }
        }
        
        @media (max-width: 1400px) {
          div[style*="gridTemplateColumns: 1fr 1fr 1fr"] {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        
        @media (max-width: 900px) {
          div[style*="gridTemplateColumns: 1fr 1fr 1fr"],
          div[style*="gridTemplateColumns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
