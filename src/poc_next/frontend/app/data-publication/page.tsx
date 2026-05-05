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
import { useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { loginRequest } from "@/lib/authConfig";

export default function DataPublicationPage() {
  const { instance, accounts } = useMsal();
  const [connectorStatus] = useState<"checking" | "connected" | "disconnected">("connected");
  const [globalLogs, setGlobalLogs] = useState<string[]>([]);
  const [contractFilter, setContractFilter] = useState('all');
  const [isMounted, setIsMounted] = useState(false);
  const [isPoliciesExpanded, setIsPoliciesExpanded] = useState(false);
  const [sharePointConnected, setSharePointConnected] = useState(false);
  const [sharePointUser, setSharePointUser] = useState<string | null>(null);
  const [sharePointAuthenticating, setSharePointAuthenticating] = useState(false);
  const phase2Ref = useRef<any>(null);
  const phase3Ref = useRef<any>(null);
  const phase4Ref = useRef<any>(null);
  
  // Get partners list
  const partners = getAvailablePartners();

  useEffect(() => {
    setIsMounted(true);
    // Autenticación automática con SharePoint al cargar la página
    authenticateSharePoint();
  }, []);

  // Autenticación silenciosa con SharePoint
  const authenticateSharePoint = async () => {
    if (sharePointAuthenticating) return;
    
    setSharePointAuthenticating(true);
    
    try {
      const activeAccount = accounts[0];
      
      if (!activeAccount) {
        // Si no hay cuenta, intentar login silencioso
        console.log('No active account, attempting silent login...');
        try {
          const loginResult = await instance.loginPopup(loginRequest);
          if (loginResult.account) {
            setSharePointConnected(true);
            setSharePointUser(loginResult.account.username || loginResult.account.name || 'Usuario');
            console.log('✅ SharePoint authentication successful (popup)');
          }
        } catch (loginError: any) {
          // Usuario canceló o error de login - no mostramos error, simplemente quedamos desconectados
          console.log('SharePoint login not completed:', loginError.errorCode);
          setSharePointConnected(false);
        }
      } else {
        // Ya hay una cuenta, intentar obtener token silenciosamente
        const request = {
          ...loginRequest,
          account: activeAccount,
        };

        try {
          const tokenResponse = await instance.acquireTokenSilent(request);
          setSharePointConnected(true);
          setSharePointUser(activeAccount.username || activeAccount.name || 'Usuario');
          console.log('✅ SharePoint authentication successful (silent)');
        } catch (silentError: any) {
          if (silentError instanceof InteractionRequiredAuthError) {
            // Necesita interacción, intentar popup automáticamente
            try {
              const tokenResponse = await instance.acquireTokenPopup(request);
              setSharePointConnected(true);
              setSharePointUser(activeAccount.username || activeAccount.name || 'Usuario');
              console.log('✅ SharePoint authentication successful (popup after silent fail)');
            } catch (popupError) {
              console.log('SharePoint popup authentication failed');
              setSharePointConnected(false);
            }
          } else {
            console.error('SharePoint authentication error:', silentError);
            setSharePointConnected(false);
          }
        }
      }
    } catch (error) {
      console.error('SharePoint authentication error:', error);
      setSharePointConnected(false);
    } finally {
      setSharePointAuthenticating(false);
    }
  };

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
              padding: "4px 25px",
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
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}>
                {/* Indicador de estado de SharePoint */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  background: "rgba(255, 255, 255, 0.15)",
                  borderRadius: "6px",
                  fontSize: "13px",
                  color: "white",
                  border: `1px solid ${sharePointConnected ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`
                }}>
                  {sharePointConnected ? (
                    <>
                      <span style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#10b981",
                        boxShadow: "0 0 6px rgba(16, 185, 129, 0.8)"
                      }}></span>
                      <span style={{ fontSize: "12px", fontWeight: "500" }}>
                        SharePoint: Conectado
                      </span>
                      {sharePointUser && (
                        <span style={{ 
                          fontSize: "11px", 
                          opacity: 0.8,
                          marginLeft: "4px"
                        }}>
                          ({sharePointUser})
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#ef4444"
                      }}></span>
                      <span style={{ fontSize: "12px", fontWeight: "500" }}>
                        SharePoint: Desconectado
                      </span>
                    </>
                  )}
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
            </div>
            <div style={{
              padding: "25px",
              maxHeight: "600px",
              overflowY: "auto"
            }}>
              <Phase2Content ref={phase2Ref} onLog={addLog} phase4Ref={phase4Ref} />
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
              padding: "4px 25px",
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
              padding: "4px 25px",
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


