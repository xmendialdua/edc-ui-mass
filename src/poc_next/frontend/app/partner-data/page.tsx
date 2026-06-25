"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Phase5Content from "@/components/phases/phase5-content";
import NegotiationsContent from "@/components/phases/negotiations-content";
import TransfersContent from "@/components/phases/transfers-content";
import { api } from "@/lib/api";
import Image from "next/image";
import { RefreshCw, LogOut } from "lucide-react";

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

export default function PartnerDataPage() {
  const router = useRouter();
  const [authenticatedPartner, setAuthenticatedPartner] = useState<PartnerInfo | null>(null);
  const [partnerDetails, setPartnerDetails] = useState<PartnerDetails | null>(null);
  const [loadingPartner, setLoadingPartner] = useState<boolean>(true);
  const [connectorStatus] = useState<"checking" | "connected" | "disconnected">("connected");
  const [isMounted, setIsMounted] = useState(false);
  const [globalLogs, setGlobalLogs] = useState<string[]>([]);
  const [sharePointConnected, setSharePointConnected] = useState(false);
  const [sharePointUser, setSharePointUser] = useState<string | null>(null);
  const [sharePointAuthenticating, setSharePointAuthenticating] = useState(false);
  const phase5Ref = useRef<any>(null);
  const negotiationsRef = useRef<any>(null);
  const transfersRef = useRef<any>(null);

  useEffect(() => {
    setIsMounted(true);
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    setLoadingPartner(true);
    
    try {
      // Check if partner is authenticated
      const partnerJson = sessionStorage.getItem('authenticated_partner');
      
      if (!partnerJson) {
        // No authentication, redirect to login
        router.push('/partner-login');
        return;
      }
      
      const partner: PartnerInfo = JSON.parse(partnerJson);
      setAuthenticatedPartner(partner);
      
      // Fetch full partner details from backend
      await fetchPartnerDetails(partner.email);
      
      // Check SharePoint status
      await checkSharePointStatus();
      
    } catch (error) {
      console.error('Error checking authentication:', error);
      router.push('/partner-login');
    } finally {
      setLoadingPartner(false);
    }
  };

  const fetchPartnerDetails = async (email: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/partners/${encodeURIComponent(email)}/details`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch partner details');
      }
      
      const details: PartnerDetails = await response.json();
      setPartnerDetails(details);
      console.log('✅ Partner details loaded:', details);
      
    } catch (error) {
      console.error('Error fetching partner details:', error);
      // If fails to fetch details, still show basic info from session
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('authenticated_partner');
    router.push('/partner-login');
  };

  // Verificar estado de conexión SharePoint del backend
  const checkSharePointStatus = async () => {
    if (sharePointAuthenticating) return;
    
    setSharePointAuthenticating(true);
    
    try {
      const response = await fetch('http://localhost:5001/api/sharepoint/status');
      
      if (!response.ok) {
        console.error('Error fetching SharePoint status:', response.statusText);
        setSharePointConnected(false);
        setSharePointUser(null);
        return;
      }
      
      const data = await response.json();
      
      if (data.connected) {
        setSharePointConnected(true);
        setSharePointUser(data.application || 'Service Principal');
        console.log('✅ SharePoint conectado:', data.application);
      } else {
        setSharePointConnected(false);
        setSharePointUser(null);
        console.log('❌ SharePoint desconectado:', data.error);
      }
    } catch (error) {
      console.error('Error checking SharePoint status:', error);
      setSharePointConnected(false);
      setSharePointUser(null);
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

  const handleInitiateTransfer = async (contractId: string, assetId: string) => {
    addLog(`📥 Iniciando transferencia para contrato: ${contractId}`);

    // Refrescar inmediatamente el panel de transferencias al pulsar "Init Transfer"
    if (transfersRef.current) {
      transfersRef.current.refresh();
      addLog(`🔄 Refrescando panel Transfers...`);
    }

    try {
      const result = await api.phase6.initiateTransfer({
        contractAgreementId: contractId,
        assetId: assetId,
        consumerBpn: partnerDetails?.bpn,
        consumerManagementUrl: partnerDetails?.management_url
      });
      
      if (result.logs) {
        result.logs.forEach((log: string) => addLog(log));
      }

      if (result.success) {
        addLog(`✅ Transferencia iniciada exitosamente`);
        
        // Refrescar el panel de transferencias después de 2 segundos
        setTimeout(() => {
          if (transfersRef.current) {
            transfersRef.current.refresh();
            addLog(`🔄 Auto-refresco activado. Monitoreando EDR...`);
          }
        }, 2000);
      } else {
        addLog(`⚠️ La transferencia no se completó correctamente`);
      }
    } catch (error) {
      addLog(`❌ Error al iniciar transferencia: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div style={{ 
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      minHeight: "100vh",
      padding: "20px"
    }}>
      {loadingPartner ? (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh"
        }}>
          <div style={{
            textAlign: "center",
            background: "white",
            padding: "40px",
            borderRadius: "15px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
          }}>
            <div style={{
              display: "inline-block",
              width: "50px",
              height: "50px",
              border: "5px solid #f3f3f3",
              borderTop: "5px solid #667eea",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }} />
            <p style={{ marginTop: "20px", color: "#666", fontSize: "16px" }}>
              Cargando información del partner...
            </p>
          </div>
        </div>
      ) : (
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
            {/* Panel A: Logo + Título + User Info */}
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
                  margin: "0",
                  fontSize: "24px",
                  whiteSpace: "nowrap"
                }}>Partner Dashboard</h1>
              </div>
            </div>

            {/* Panel B: Información del Conector */}
            <div style={{
              background: "#f0f4f8",
              padding: "12px 20px",
              borderRadius: "8px",
              display: "grid",
              gridTemplateColumns: "auto auto auto auto",
              gap: "20px",
              alignItems: "center",
              fontSize: "13px",
              width: "fit-content",
              marginLeft: "auto"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{
                  color: "#333",
                  fontFamily: "'Courier New', monospace",
                  fontSize: "13px",
                  fontWeight: "600"
                }}>{partnerDetails?.bpn || authenticatedPartner?.bpn || 'Loading...'}</div>
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
                  background: partnerDetails ? "#28a745" : "#ffc107",
                  boxShadow: partnerDetails 
                    ? "0 0 8px rgba(40, 167, 69, 0.6)" 
                    : "0 0 8px rgba(255, 193, 7, 0.6)"
                }} />
                <div style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: partnerDetails ? "#28a745" : "#ffc107"
                }}>
                  {partnerDetails ? "Conectado" : "Cargando..."}
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
                  whiteSpace: "nowrap",
                  maxWidth: "400px",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }} title={partnerDetails?.management_url || 'Loading...'}>{partnerDetails?.management_url || 'Loading...'}</div>
              </div>

              {/* User Info */}
              {authenticatedPartner && (
                <div style={{
                  paddingLeft: "15px",
                  borderLeft: "2px solid #d1d5db",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px"
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}>
                    <div style={{
                      fontSize: "13px",
                      color: "#333",
                      fontWeight: "600"
                    }}>
                      👤 {authenticatedPartner.firstname} {authenticatedPartner.lastname}
                    </div>
                    <button
                      onClick={handleLogout}
                      title="Logout"
                      style={{
                        padding: "4px 6px",
                        background: "#e74c3c",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <LogOut size={12} />
                    </button>
                  </div>
                  <div style={{
                    fontSize: "11px",
                    color: "#666"
                  }}>
                    ({authenticatedPartner.email})
                  </div>
                </div>
              )}
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
                <span>Catalogs</span>
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
                partnerDetails={partnerDetails}
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
                <span>Negotiations</span>
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
              <NegotiationsContent 
                ref={negotiationsRef} 
                onLog={addLog}
                onInitiateTransfer={handleInitiateTransfer}
                partnerDetails={partnerDetails}
              />
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
                <span>Transfers</span>
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
                        SharePoint: No conectado
                      </span>
                    </>
                  )}
                </div>
                
                {/* Botón de refrescar */}
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
            </div>
            <div style={{
              padding: "20px",
              minHeight: "400px"
            }}>
              <TransfersContent 
                ref={transfersRef} 
                onLog={addLog}
                sharePointConnected={sharePointConnected}
                sharePointUser={sharePointUser}
                onAuthenticateSharePoint={checkSharePointStatus}
                partnerDetails={partnerDetails}
              />
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
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

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
