/**
 * Authentication Provider Component
 * Wraps the application with MSAL authentication context
 */

'use client';

import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from '@/lib/authConfig';
import { ReactNode, useEffect, useState } from 'react';

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [msalInstance, setMsalInstance] = useState<PublicClientApplication | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isInitialized = false;
    
    const initializeMsal = async () => {
      try {
        console.log('🔐 Initializing MSAL...');
        const instance = new PublicClientApplication(msalConfig);
        await instance.initialize();
        console.log('✅ MSAL initialized successfully');
        
        // Clear timeout on successful initialization
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        isInitialized = true;
        
        setMsalInstance(instance);
        setError(null);
        setIsLoading(false);
      } catch (err) {
        console.error('❌ MSAL initialization failed:', err);
        
        // Clear timeout on error as well
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        isInitialized = true;
        
        setError(err instanceof Error ? err.message : 'Unknown error');
        setMsalInstance(null);
        setIsLoading(false);
      }
    };

    // Set a timeout to prevent infinite loading (30 seconds)
    timeoutId = setTimeout(() => {
      if (!isInitialized) {
        console.warn('⚠️ MSAL initialization timeout - continuing without authentication');
        setIsLoading(false);
        setError('Authentication initialization timeout');
      }
    }, 30000);

    initializeMsal();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div>Loading authentication...</div>
        <div style={{ fontSize: '0.875rem', color: '#666' }}>
          Initializing Microsoft authentication...
        </div>
      </div>
    );
  }

  // If MSAL failed to initialize, render children without MSAL provider
  // SharePoint features will be unavailable but the rest of the app will work
  if (error || !msalInstance) {
    console.warn('⚠️ Running without MSAL authentication:', error);
    return (
      <>
        {error && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#fff3cd',
            borderLeft: '4px solid #ffc107',
            marginBottom: '1rem'
          }}>
            <strong>⚠️ SharePoint authentication unavailable:</strong> {error}
            <br />
            <small>The dashboard will work normally, but SharePoint features will be disabled.</small>
          </div>
        )}
        {children}
      </>
    );
  }

  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}
