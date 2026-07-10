"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, User, Eye, EyeOff } from "lucide-react";

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
  const [showPassword, setShowPassword] = useState<boolean>(false);
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
      setError('Please select a partner and enter the password');
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
            Mondragon Assembly Data Space
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
                Loading partners...
              </p>
            </div>
          ) : partners.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p style={{ color: "#e74c3c", fontSize: "16px" }}>
                No partners found
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
                Retry
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
                  Select Partner
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
                      <strong>Company:</strong> {selectedPartner.company_name}
                    </div>
                    <div style={{ marginBottom: "4px" }}>
                      <strong>Name:</strong> {selectedPartner.firstname} {selectedPartner.lastname}
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
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{
                      width: "100%",
                      padding: "12px",
                      paddingRight: "45px",
                      border: "2px solid #e0e0e0",
                      borderRadius: "8px",
                      fontSize: "14px",
                      outline: "none",
                      transition: "border 0.3s ease",
                      boxSizing: "border-box"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#667eea"}
                    onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "5px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#999",
                      transition: "color 0.2s ease"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "#667eea"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "#999"}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p style={{
                  marginTop: "6px",
                  fontSize: "12px",
                  color: "#999",
                  fontStyle: "italic"
                }}>
                  Default password: 1234
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
                {authenticating ? "Authenticating..." : "Log in"}
              </button>
            </form>
          )}
        </div>

        {/* Powered by section */}
        <div style={{
          padding: "20px 30px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderTop: "none",
          textAlign: "center",
          borderBottomLeftRadius: "15px",
          borderBottomRightRadius: "15px"
        }}>
          <p style={{
            fontSize: "12px",
            color: "rgba(255, 255, 255, 0.8)",
            margin: "0 0 10px 0"
          }}>
            Powered by
          </p>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px"
          }}>
            {/* Tractus-X Logo */}
            <a 
              href="https://eclipse-tractusx.github.io/" 
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                transition: "opacity 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.7"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            >
              <Image
                src="/tractus-x-logo.png"
                alt="Eclipse Tractus-X"
                width={140}
                height={50}
                style={{
                  height: "auto",
                  width: "140px",
                  maxHeight: "36px",
                  objectFit: "contain"
                }}
              />
            </a>
            
            <span style={{ color: "rgba(255, 255, 255, 0.5)" }}>•</span>
            
            {/* Catena-X Logo */}
            <a 
              href="https://catena-x.net/" 
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                transition: "opacity 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.7"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            >
              <Image
                src="/catena-x-logo-text-white.svg"
                alt="Catena-X"
                width={100}
                height={36}
                style={{
                  height: "auto",
                  width: "100px",
                  maxHeight: "36px",
                  objectFit: "contain"
                }}
              />
            </a>
          </div>
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
