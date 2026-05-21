/**
 * API Client for POC Next Backend
 * 
 * This module provides typed functions to interact with the FastAPI backend.
 */

export function getApiBaseUrl(): string {
  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  // Si hay configuración explícita, usarla
  if (configuredApiUrl) {
    return configuredApiUrl.endsWith('/')
      ? configuredApiUrl.slice(0, -1)
      : configuredApiUrl;
  }

  // Sin configuración: usar rutas relativas
  // - Local: Next.js proxy reenvía /api a localhost:5001
  // - OVH: Ingress enruta /api al backend service
  if (typeof window !== 'undefined') {
    return '';
  }

  // En servidor (SSR): fallback a localhost para desarrollo
  return 'http://localhost:5001';
}

const API_BASE_URL = getApiBaseUrl();

/**
 * Generic API request function
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `API Error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Helper function to get file extension from content-type
 */
function getExtensionFromContentType(contentType: string): string {
  const type = contentType.toLowerCase().split(';')[0].trim();
  
  const extensionMap: Record<string, string> = {
    'application/pdf': '.pdf',
    'text/csv': '.csv',
    'application/json': '.json',
    'application/xml': '.xml',
    'text/xml': '.xml',
    'text/plain': '.txt',
    'application/zip': '.zip',
    'application/x-zip-compressed': '.zip',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/gif': '.gif',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
  };
  
  return extensionMap[type] || '.dat';
}

/**
 * Organized API client
 */
export const api = {
  /**
   * Health check
   */
  healthCheck: () => apiRequest<{ status: string }>('/health'),

  /**
   * Phase 1: Infrastructure checks
   */
  phase1: {
    checkConnectivity: () => apiRequest<{ success: boolean; logs: string[] }>(
      '/api/phase1/check-connectivity',
      { method: 'POST' }
    ),
    checkPods: () => apiRequest<{ success: boolean; logs: string[] }>(
      '/api/phase1/check-pods',
      { method: 'POST' }
    ),
    checkTrust: () => apiRequest<{ success: boolean; logs: string[] }>(
      '/api/phase1/check-trust',
      { method: 'POST' }
    ),
  },

  /**
   * Phase 2: Asset management
   */
  phase2: {
    listAssets: () => apiRequest<{ success: boolean; assets: any[]; logs: string[] }>(
      '/api/phase2/list-assets',
      { method: 'POST' }
    ),
    createAsset: (assetId: string, url?: string, description?: string) => apiRequest<{ success: boolean; logs: string[] }>(
      '/api/phase2/create-asset',
      { method: 'POST', body: JSON.stringify({ assetId, url, description }) }
    ),
    deleteAsset: (assetId: string) => apiRequest<{ success: boolean; logs: string[] }>(
      '/api/phase2/delete-asset',
      { method: 'POST', body: JSON.stringify({ assetId }) }
    ),
  },

  /**
   * Phase 3: Policy management
   */
  phase3: {
    listPolicies: () => apiRequest<{ success: boolean; policies: any[]; logs: string[] }>(
      '/api/phase3/list-policies',
      { method: 'POST' }
    ),
    createAccessPolicy: (bpn: string) => apiRequest<{ success: boolean; logs: string[] }>(
      '/api/phase3/create-access-policy',
      { method: 'POST', body: JSON.stringify({ bpn }) }
    ),
    createContractPolicy: () => apiRequest<{ success: boolean; logs: string[] }>(
      '/api/phase3/create-contract-policy',
      { method: 'POST' }
    ),
    deletePolicy: (policyId: string) => apiRequest<{ success: boolean; logs: string[] }>(
      '/api/phase3/delete-policy',
      { method: 'POST', body: JSON.stringify({ policyId }) }
    ),
  },

  /**
   * Phase 4: Contract definitions
   */
  phase4: {
    listContractDefinitions: () => apiRequest<{ success: boolean; contracts: any[]; logs: string[] }>(
      '/api/phase4/list-contract-definitions',
      { method: 'POST' }
    ),
    createContractDefinition: (data: {
      contractName: string;
      assetId: string;
      accessPolicyId: string;
      contractPolicyId: string;
    }) => apiRequest<{ success: boolean; logs: string[] }>(
      '/api/phase4/create-contract-definition',
      { method: 'POST', body: JSON.stringify(data) }
    ),
    deleteContractDefinition: (contractId: string) => apiRequest<{ success: boolean; logs: string[] }>(
      '/api/phase4/delete-contract-definition',
      { method: 'POST', body: JSON.stringify({ contractId }) }
    ),
  },

  /**
   * Phase 5: Catalog
   */
  phase5: {
    catalogRequest: () => apiRequest<{ success: boolean; catalog: any; datasets: any[]; logs: string[] }>(
      '/api/phase5/catalog-request',
      { method: 'POST' }
    ),
  },

  /**
   * Phase 6: Negotiation and Transfer
   */
  phase6: {
    catalogRequest: (consumerBpn?: string, consumerManagementUrl?: string) => {
      const params = new URLSearchParams();
      if (consumerBpn) params.append('consumer_bpn', consumerBpn);
      if (consumerManagementUrl) params.append('consumer_management_url', consumerManagementUrl);
      
      return apiRequest<{ success: boolean; catalog: any; datasets: any[]; logs: string[] }>(
        `/api/phase6/catalog-request${params.toString() ? '?' + params.toString() : ''}`,
        { method: 'POST' }
      );
    },
    negotiate: (data: { assetId: string; policy: any; consumerBpn?: string; consumerManagementUrl?: string }) => apiRequest<{ success: boolean; logs: string[] }>(
      '/api/phase6/negotiate-asset',
      { method: 'POST', body: JSON.stringify(data) }
    ),
    listNegotiations: (consumerManagementUrl?: string) => {
      const params = new URLSearchParams();
      if (consumerManagementUrl) params.append('consumer_management_url', consumerManagementUrl);
      
      return apiRequest<{ success: boolean; negotiations: any[]; logs: string[] }>(
        `/api/phase6/list-negotiations${params.toString() ? '?' + params.toString() : ''}`,
        { method: 'GET' }
      );
    },
    listTransfers: (consumerManagementUrl?: string) => {
      const params = new URLSearchParams();
      if (consumerManagementUrl) params.append('consumer_management_url', consumerManagementUrl);
      
      return apiRequest<{ success: boolean; transfers: any[]; logs: string[] }>(
        `/api/phase6/list-transfers${params.toString() ? '?' + params.toString() : ''}`,
        { method: 'GET' }
      );
    },
    initiateTransfer: (data: { contractAgreementId: string; assetId: string; consumerBpn?: string; consumerManagementUrl?: string }) =>
      apiRequest<{ success: boolean; logs: string[] }>(
        '/api/phase6/initiate-transfer-for-contract',
        { method: 'POST', body: JSON.stringify(data) }
      ),
    downloadFile: async (data: { transferId: string; endpoint: string; token: string }): Promise<{ blob: Blob; contentType: string; filename: string }> => {
      const response = await fetch(`${API_BASE_URL}/api/phase6/download-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `API Error: ${response.status} ${response.statusText}`
        );
      }

      const blob = await response.blob();
      const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
      const contentDisposition = response.headers.get('Content-Disposition') || '';
      
      // Extract filename from Content-Disposition header
      let filename = `data-${data.transferId}`;
      
      // Try to parse filename from Content-Disposition
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=(['"]?)([^'"\n]*\.[^'"\n]+)\1/);
        if (filenameMatch && filenameMatch[2]) {
          filename = filenameMatch[2];
        } else {
          // If no filename with extension found, try to get extension from content-type
          const extension = getExtensionFromContentType(contentType);
          filename = `${filename}${extension}`;
        }
      } else {
        // No Content-Disposition, use content-type to determine extension
        const extension = getExtensionFromContentType(contentType);
        filename = `${filename}${extension}`;
      }

      return { blob, contentType, filename };
    },
    getTransferEdr: (transferId: string) => apiRequest<{ success: boolean; edr: any; cached: boolean }>(
      `/api/phase6/transfer-edr/${transferId}`,
      { method: 'GET' }
    ),
    getFreshToken: (transferId: string) => apiRequest<{ success: boolean; token: string; endpoint: string; error?: string }>(
      `/api/phase6/get-fresh-token/${transferId}`,
      { method: 'GET' }
    ),
    getTransferStatus: (transferId: string) => apiRequest<{ 
      success: boolean; 
      transfer: any;
      error?: string;
    }>(
      `/api/phase6/transfer-status/${transferId}`,
      { method: 'GET' }
    ),
    getSharePointInfo: (transferId: string) => apiRequest<{
      success: boolean;
      is_sharepoint: boolean;
      drive_id?: string;
      item_id?: string;
      base_url?: string;
      error?: string;
      message?: string;
    }>(
      `/api/phase6/sharepoint-info/${transferId}`,
      { method: 'GET' }
    ),
  },

  /**
   * SharePoint: File access via Microsoft Graph API
   */
  sharepoint: {
    /**
     * Health check for SharePoint service
     */
    healthCheck: (accessToken: string) => apiRequest<{ 
      status: string; 
      service: string; 
      has_default_drive_id: boolean 
    }>(
      '/api/sharepoint/health',
      { 
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    ),

    /**
     * List files from SharePoint drive
     * Backend uses Application Permissions (no token required from frontend)
     */
    listFiles: (driveId?: string, folderId?: string) => {
      const params = new URLSearchParams();
      if (driveId) params.append('drive_id', driveId);
      if (folderId) params.append('folder_id', folderId);
      
      return apiRequest<{ 
        items: Array<{
          id: string;
          name: string;
          webUrl: string;
          size?: number;
          lastModified?: string;
          isFolder: boolean;
          folder?: { childCount: number };
        }>;
        count: number;
      }>(
        `/api/sharepoint/files${params.toString() ? '?' + params.toString() : ''}`,
        { 
          method: 'GET'
        }
      );
    },

    /**
     * List files from SharePoint by site URL
     * Backend uses Application Permissions (no token required from frontend)
     */
    listFilesBySiteUrl: (siteUrl: string, folderId?: string) => {
      const params = new URLSearchParams({ site_url: siteUrl });
      if (folderId) params.append('folder_id', folderId);
      
      return apiRequest<{ 
        items: Array<{
          id: string;
          name: string;
          webUrl: string;
          size?: number;
          lastModified?: string;
          isFolder: boolean;
          folder?: { childCount: number };
        }>;
        count: number;
        drive_id?: string;
      }>(
        `/api/sharepoint/files/by-site-url?${params.toString()}`,
        { 
          method: 'GET'
        }
      );
    },

    /**
     * List files inside a specific folder
     */
    listFilesByFolder: (accessToken: string, folderId: string, driveId?: string) => {
      const params = new URLSearchParams();
      params.append('folder_id', folderId);
      if (driveId) params.append('drive_id', driveId);
      
      return apiRequest<{ 
        items: Array<{
          id: string;
          name: string;
          webUrl: string;
          size?: number;
          lastModified?: string;
          isFolder: boolean;
          folder?: { childCount: number };
        }>;
        count: number;
        drive_id?: string;
      }>(
        `/api/sharepoint/files/by-folder?${params.toString()}`,
        { 
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
    },

    /**
     * Get pre-authenticated temporary download URL for a SharePoint file (valid ~1 hour)
     */
    getDownloadUrl: (accessToken: string, driveId: string, itemId: string) => {
      return apiRequest<{ 
        download_url: string;
        success: boolean;
      }>(
        '/api/sharepoint/get-download-url',
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}` 
          },
          body: JSON.stringify({
            drive_id: driveId,
            item_id: itemId
          })
        }
      );
    },

    /**
     * Create a public sharing link with direct download capability (valid ~1 year)
     */
    createSharingLink: (accessToken: string, driveId: string, itemId: string, expirationDays: number = 365) => {
      return apiRequest<{ 
        download_url: string;
        success: boolean;
        message?: string;
      }>(
        '/api/sharepoint/create-sharing-link',
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}` 
          },
          body: JSON.stringify({
            drive_id: driveId,
            item_id: itemId,
            expiration_days: expirationDays
          })
        }
      );
    },

    /**
     * Download a file from SharePoint
     */
    downloadFile: async (accessToken: string, fileId: string, driveId?: string): Promise<{ blob: Blob; filename: string }> => {
      const params = new URLSearchParams();
      if (driveId) params.append('drive_id', driveId);
      
      const response = await fetch(
        `${API_BASE_URL}/api/sharepoint/download/${encodeURIComponent(fileId)}${params.toString() ? '?' + params.toString() : ''}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `API Error: ${response.status} ${response.statusText}`
        );
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition') || '';
      
      // Extract filename from Content-Disposition header
      let filename = 'downloaded-file';
      if (contentDisposition) {
        // Try RFC 5987 format first: filename*=UTF-8''filename
        const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;\n]+)/);
        if (utf8Match && utf8Match[1]) {
          filename = decodeURIComponent(utf8Match[1]);
        } else {
          // Try standard format: filename="filename" or filename=filename
          const standardMatch = contentDisposition.match(/filename=(["']?)(.+?)\1(?:;|$)/);
          if (standardMatch && standardMatch[2]) {
            filename = standardMatch[2];
          }
        }
      }

      return { blob, filename };
    },

    /**
     * Download a folder from SharePoint as ZIP
     */
    downloadFolder: async (accessToken: string, folderId: string, driveId?: string): Promise<{ blob: Blob; filename: string }> => {
      const params = new URLSearchParams();
      if (driveId) params.append('drive_id', driveId);
      
      const response = await fetch(
        `${API_BASE_URL}/api/sharepoint/download-folder/${encodeURIComponent(folderId)}${params.toString() ? '?' + params.toString() : ''}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `API Error: ${response.status} ${response.statusText}`
        );
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition') || '';
      
      // Extract filename from Content-Disposition header
      let filename = 'folder.zip';
      if (contentDisposition) {
        // Try RFC 5987 format first: filename*=UTF-8''filename
        const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;\n]+)/);
        if (utf8Match && utf8Match[1]) {
          filename = decodeURIComponent(utf8Match[1]);
        } else {
          // Try standard format: filename="filename" or filename=filename
          const standardMatch = contentDisposition.match(/filename=(["']?)(.+?)\1(?:;|$)/);
          if (standardMatch && standardMatch[2]) {
            filename = standardMatch[2];
          }
        }
      }

      return { blob, filename };
    },

    /**
     * Download a file via SharePoint Proxy (for testing EDC integration)
     * Uses OAuth 2.0 Service Principal authentication via proxy service
     */
    downloadFileViaProxy: async (fileId: string, driveId: string): Promise<{ blob: Blob; filename: string }> => {
      // Encode driveId|fileId in base64 URL-safe format
      const fileInfo = `${driveId}|${fileId}`;
      const encodedFileInfo = btoa(fileInfo)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      
      const response = await fetch(
        `${API_BASE_URL}/api/sharepoint-proxy/download/${encodedFileInfo}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Proxy Error: ${response.status} ${response.statusText}`
        );
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition') || '';
      
      // Extract filename from Content-Disposition header
      let filename = 'downloaded-file';
      if (contentDisposition) {
        // Try RFC 5987 format first: filename*=UTF-8''filename
        const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;\n]+)/);
        if (utf8Match && utf8Match[1]) {
          filename = decodeURIComponent(utf8Match[1]);
        } else {
          // Try standard format: filename="filename" or filename=filename
          const standardMatch = contentDisposition.match(/filename=(["']?)(.+?)\1(?:;|$)/);
          if (standardMatch && standardMatch[2]) {
            filename = standardMatch[2];
          }
        }
      }

      return { blob, filename };
    },

    /**
     * Download a file via SharePoint Proxy using user token (Delegated permissions)
     * This version uses the authenticated user's token instead of Service Principal
     */
    downloadFileViaProxyWithUserToken: async (fileId: string, driveId: string, accessToken: string): Promise<{ blob: Blob; filename: string }> => {
      // Encode driveId|fileId in base64 URL-safe format
      const fileInfo = `${driveId}|${fileId}`;
      const encodedFileInfo = btoa(fileInfo)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      
      const response = await fetch(
        `${API_BASE_URL}/api/sharepoint-proxy/download-with-user-token/${encodedFileInfo}`,
        { 
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Proxy Error: ${response.status} ${response.statusText}`
        );
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition') || '';
      
      // Extract filename from Content-Disposition header
      let filename = 'downloaded-file';
      if (contentDisposition) {
        // Try RFC 5987 format first: filename*=UTF-8''filename
        const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;\n]+)/);
        if (utf8Match && utf8Match[1]) {
          filename = decodeURIComponent(utf8Match[1]);
        } else {
          // Try standard format: filename="filename" or filename=filename
          const standardMatch = contentDisposition.match(/filename=(["']?)(.+?)\1(?:;|$)/);
          if (standardMatch && standardMatch[2]) {
            filename = standardMatch[2];
          }
        }
      }

      return { blob, filename };
    },

    /**
     * Get file metadata
     */
    getFileMetadata: (accessToken: string, fileId: string, driveId?: string) => {
      const params = new URLSearchParams();
      if (driveId) params.append('drive_id', driveId);
      
      return apiRequest<{
        id: string;
        name: string;
        webUrl: string;
        size?: number;
        lastModified?: string;
        isFolder: boolean;
        folder?: { childCount: number };
      }>(
        `/api/sharepoint/file/${fileId}/metadata${params.toString() ? '?' + params.toString() : ''}`,
        { 
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
    },

    /**
     * Debug: List all available drives
     */
    debugDrives: (accessToken: string) => apiRequest<{
      drives: Array<{
        id: string;
        name: string;
        driveType: string;
        webUrl: string;
        owner: string;
      }>;
      count: number;
      configured_drive_id: string | null;
    }>(
      '/api/sharepoint/debug/drives',
      { 
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    ),
  },
};
