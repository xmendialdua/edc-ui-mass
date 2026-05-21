"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, User } from "lucide-react";

interface Partner {
  email: string;
  firstname: string;
  lastname: string;
  company_name: string;
  bpn: string;
}

export default function PartnerLoginPage() {
  const router = useRouter();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [authenticating, setAuthenticating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch partners list on mount
  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/partners/list`);
      
      if (!response.ok) {
        throw new Error(`Error fetching partners: ${response.statusText}`);
      }
      
      const data: Partner[] = await response.json();
      setPartners(data);
      
      // Auto-select first partner
      if (data.length > 0) {
        setSelectedEmail(data[0].email);
      }
    } catch (err) {
      console.error('Error fetching partners:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar partners');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmail || !password) {
      setError('Por favor, selecciona un partner e introduce la contraseña');
      return;
    }
    
    setAuthenticating(true);
    setError(null);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/partners/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: selectedEmail,
          password: password,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Login failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.partner) {
        // Store partner info in sessionStorage
        sessionStorage.setItem('authenticated_partner', JSON.stringify(data.partner));
        
        // Redirect to partner-data
        router.push('/partner-data');
      } else {
        setError(data.message || 'Credenciales inválidas');
      }
    } catch (err) {
      console.error('Error during login:', err);
      setError(err instanceof Error ? err.message : 'Error durante el login');
    } finally {
      setAuthenticating(false);
    }
  };

  const selectedPartner = partners.find(p => p.email === selectedEmail);

  return (
    <div style={{
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{
        background: "white",
        borderRadius: "15px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
        maxWidth: "450px",
        width: "100%",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "30px",
          textAlign: "center"
        }}>
          <Image 
            src="/logo-mondragon.png" 
            alt="Mondragon Assembly" 
            width={180} 
            height={36}
            style={{ 
              height: "40px", 
              width: "auto",
              filter: "brightness(0) invert(1)",
              marginBottom: "15px"
            }}
          />
          <h1 style={{
            color: "white",
            fontSize: "24px",
            margin: "10px 0 5px 0",
            fontWeight: "600"
          }}>
            Partner Login
          </h1>
          <p style={{
            color: "rgba(255, 255, 255, 0.9)",
            fontSize: "14px",
            margin: "0"
          }}>
            Tractus-X Data Space
          </p>
        </div>

        {/* Form */}
        <div style={{ padding: "30px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{
                display: "inline-block",
                width: "40px",
                height: "40px",
                border: "4px solid #f3f3f3",
                borderTop: "4px solid #667eea",
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
              }} />
              <p style={{ marginTop: "15px", color: "#666" }}>
                Cargando partners...
              </p>
            </div>
          ) : partners.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p style={{ color: "#e74c3c", fontSize: "16px" }}>
                No se encontraron partners registrados
              </p>
              <button
                onClick={fetchPartners}
                style={{
                  marginTop: "15px",
                  padding: "10px 20px",
                  background: "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                Reintentar
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin}>
              {/* Partner Selection */}
              <div style={{ marginBottom: "25px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#333",
                  fontSize: "14px"
                }}>
                  <User size={16} style={{ verticalAlign: "middle", marginRight: "6px" }} />
                  Selecciona Partner
                </label>
                <select
                  value={selectedEmail}
                  onChange={(e) => setSelectedEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                    transition: "border 0.3s ease",
                    background: "white"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#667eea"}
                  onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
                >
                  {partners.map((partner) => (
                    <option key={partner.email} value={partner.email}>
                      {partner.email} ({partner.company_name})
                    </option>
                  ))}
                </select>
                
                {/* Partner Info Display */}
                {selectedPartner && (
                  <div style={{
                    marginTop: "10px",
                    padding: "10px",
                    background: "#f8f9fa",
                    borderRadius: "6px",
                    fontSize: "12px"
                  }}>
                    <div style={{ marginBottom: "4px" }}>
                      <strong>Compañía:</strong> {selectedPartner.company_name}
                    </div>
                    <div style={{ marginBottom: "4px" }}>
                      <strong>Nombre:</strong> {selectedPartner.firstname} {selectedPartner.lastname}
                    </div>
                    <div>
                      <strong>BPN:</strong> <code style={{ 
                        background: "#e0e0e0", 
                        padding: "2px 6px", 
                        borderRadius: "3px",
                        fontFamily: "monospace"
                      }}>{selectedPartner.bpn}</code>
                    </div>
                  </div>
                )}
              </div>

              {/* Password */}
              <div style={{ marginBottom: "25px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#333",
                  fontSize: "14px"
                }}>
                  <Lock size={16} style={{ verticalAlign: "middle", marginRight: "6px" }} />
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Introduce tu contraseña"
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                    transition: "border 0.3s ease"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#667eea"}
                  onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
                />
                <p style={{
                  marginTop: "6px",
                  fontSize: "12px",
                  color: "#999",
                  fontStyle: "italic"
                }}>
                  Contraseña por defecto: 1234
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div style={{
                  marginBottom: "20px",
                  padding: "12px",
                  background: "#fee",
                  border: "1px solid #fcc",
                  borderRadius: "6px",
                  color: "#c33",
                  fontSize: "14px"
                }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={authenticating || !selectedEmail || !password}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: authenticating ? "#ccc" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: authenticating ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: authenticating ? "none" : "0 4px 6px rgba(0,0,0,0.1)"
                }}
                onMouseEnter={(e) => {
                  if (!authenticating) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.15)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
                }}
              >
                {authenticating ? "Autenticando..." : "Iniciar Sesión"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* CSS for spinner animation */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
