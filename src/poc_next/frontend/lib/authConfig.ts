/**
 * MSAL (Microsoft Authentication Library) configuration for Azure AD authentication
 * 
 * SharePoint Integration Configuration:
 * - Application registered in Azure AD
 * - Enables access to corporate SharePoint via Microsoft Graph API
 */

import { Configuration, PopupRequest } from '@azure/msal-browser';

// MSAL configuration for Azure AD App
export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`,
    redirectUri: process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI || 'http://localhost:3020',
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

// Debug: Log configuration
console.log('🔧 MSAL Configuration:', {
  clientId: msalConfig.auth.clientId,
  authority: msalConfig.auth.authority,
  redirectUri: msalConfig.auth.redirectUri,
});

// Scopes needed for Microsoft Graph API to access SharePoint
export const loginRequest: PopupRequest = {
  scopes: [
    'User.Read',
    'Files.Read.All',
    'Sites.Read.All',
  ],
};

// Additional scopes for write operations (if needed)
export const writeRequest: PopupRequest = {
  scopes: [
    'User.Read',
    'Files.ReadWrite.All',
    'Sites.ReadWrite.All',
  ],
};
