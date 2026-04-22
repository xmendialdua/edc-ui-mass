"use client";

import { useState, useRef, useEffect } from "react";
import Phase2Content from "@/components/phases/phase2-content";
import Phase3Content from "@/components/phases/phase3-content";
import Phase4Content from "@/components/phases/phase4-content";
import Image from "next/image";
import { RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAvailablePartners } from "@/lib/partners";

export default function DataPublicationPage() {
  const [connectorStatus] = useState<"checking" | "connected" | "disconnected">("connected");
  const [globalLogs, setGlobalLogs] = useState<string[]>([]);
  const [contractFilter, setContractFilter] = useState('all');
  const [isMounted, setIsMounted] = useState(false);
  const [isPoliciesExpanded, setIsPoliciesExpanded] = useState(false);
  const phase2Ref = useRef<any>(null);
  const phase3Ref = useRef<any>(null);
  const phase4Ref = useRef<any>(null);
  
  // Get partners list
  const partners = getAvailablePartners();

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
      background: "#f5f7fa",
      minHeight: "100vh",
      padding: "20px"
    }}>
      <div style={{ maxWidth: "1800px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{
          background: "white",
          padding: "20px 30px",
          borderRadius: "10px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          marginBottom: "20px"
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "30px",
            alignItems: "center"
          }}>
            {/* Panel A: Logo + Título */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "20px"
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
                  fontSize: "24px",
                  whiteSpace: "nowrap"
                }}>Data Publication Dashboard</h1>
              </div>
            </div>

            {/* Panel B: Información del Conector */}
            <div style={{
              background: "#f0f4f8",
              padding: "12px 20px",
              borderRadius: "8px",
              display: "grid",
              gridTemplateColumns: "auto auto auto",
              gap: "20px",
              alignItems: "center",
              fontSize: "13px",
              width: "fit-content",
              marginLeft: "auto"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{
                  fontWeight: "bold",
                  color: "#555",
                  fontSize: "13px"
                }}>MASS Connector:</div>
                <div style={{
                  color: "#333",
                  fontFamily: "'Courier New', monospace",
                  fontSize: "13px"
                }}>BPNL000000MASS</div>
              </div>

              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                paddingLeft: "15px",
                borderLeft: "2px solid #d1d5db"
              }}>
                <div style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  background: "#28a745",
                  boxShadow: "0 0 8px rgba(40, 167, 69, 0.6)"
                }} />
                <div style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#28a745"
                }}>
                  Conectado
                </div>
              </div>

              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "8px",
                paddingLeft: "15px",
                borderLeft: "2px solid #d1d5db"
              }}>
                <div style={{
                  fontWeight: "bold",
                  color: "#555",
                  fontSize: "13px",
                  whiteSpace: "nowrap"
                }}>Management API:</div>
                <div style={{
                  color: "#333",
                  fontFamily: "'Courier New', monospace",
                  fontSize: "11px",
                  whiteSpace: "nowrap"
                }}>https://edc-mass-control.51.178.34.25.nip.io/management</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content: 2 Columns */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          marginBottom: "20px"
        }}>
          {/* Left Column: Assets */}
          <div style={{
            background: "white",
            borderRadius: "10px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            overflow: "hidden"
          }}>
            <div style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              padding: "20px 25px",
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
                📦 Assets Publicables
              </div>
              <button
                onClick={() => phase2Ref.current?.refresh()}
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
              padding: "25px",
              maxHeight: "600px",
              overflowY: "auto"
            }}>
              <Phase2Content ref={phase2Ref} onLog={addLog} />
            </div>
          </div>

          {/* Right Column: Contract Definitions */}
          <div style={{
            background: "white",
            borderRadius: "10px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            overflow: "hidden"
          }}>
            <div style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              padding: "20px 25px",
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
                📜 Contratos Publicados
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "13px", fontWeight: "600" }}>Filter:</span>
                <Select value={contractFilter} onValueChange={setContractFilter}>
                  <SelectTrigger 
                    className="w-[220px]"
                    style={{
                      background: "rgba(255, 255, 255, 0.2)",
                      borderColor: "rgba(255, 255, 255, 0.3)",
                      color: "white",
                      borderWidth: "1px",
                      borderStyle: "solid"
                    }}
                  >
                    <SelectValue placeholder="Todos los partners" />
                  </SelectTrigger>
                  <SelectContent 
                    className="bg-white"
                    style={{
                      backgroundColor: "white",
                      color: "black",
                      border: "1px solid black"
                    }}
                  >
                    <SelectItem value="all" className="text-black hover:bg-gray-100 cursor-pointer">
                      Todos los partners
                    </SelectItem>
                    {partners.map(partner => (
                      <SelectItem 
                        key={partner.bpn} 
                        value={partner.bpn} 
                        className="text-black hover:bg-gray-100 cursor-pointer"
                      >
                        {partner.name} ({partner.bpn})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => phase4Ref.current?.refresh()}
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
            </div>
            <div style={{
              padding: "25px",
              maxHeight: "600px",
              overflowY: "auto"
            }}>
              <Phase4Content ref={phase4Ref} onLog={addLog} filter={contractFilter} />
            </div>
          </div>
        </div>

        {/* Policies Section */}
        <div style={{
          background: "white",
          borderRadius: "10px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          overflow: "hidden",
          marginBottom: "20px"
        }}>
          <div 
            onClick={() => setIsPoliciesExpanded(!isPoliciesExpanded)}
            style={{
              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              color: "white",
              padding: "20px 25px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer"
            }}
          >
            <div style={{
              fontSize: "18px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              🔒 Políticas de Acceso y Contrato
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  phase3Ref.current?.refresh();
                }}
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
              <div style={{ fontSize: "20px" }}>{isPoliciesExpanded ? '▲' : '▼'}</div>
            </div>
          </div>
          {isPoliciesExpanded && (
            <div style={{
              padding: "25px"
            }}>
              <Phase3Content ref={phase3Ref} onLog={addLog} />
            </div>
          )}
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
                <div>
                  {isMounted ? `[${new Date().toLocaleTimeString()}] ` : '[--:--:--] '}
                  Sistema iniciado - Listo para operaciones
                </div>
              ) : (
                globalLogs.map((log, idx) => (
                  <div key={idx}>{log}</div>
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
        
        @media (max-width: 1200px) {
          div[style*="gridTemplateColumns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}


