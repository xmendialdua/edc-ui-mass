/**
 * API Client for POC Next Backend
 * 
 * This module provides typed functions to interact with the FastAPI backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

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
    catalogRequest: () => apiRequest<{ success: boolean; catalog: any; datasets: any[]; logs: string[] }>(
      '/api/phase6/catalog-request',
      { method: 'POST' }
    ),
    negotiate: (data: { assetId: string; policy: any }) => apiRequest<{ success: boolean; logs: string[] }>(
      '/api/phase6/negotiate-asset',
      { method: 'POST', body: JSON.stringify(data) }
    ),
    listNegotiations: () => apiRequest<{ success: boolean; negotiations: any[]; logs: string[] }>(
      '/api/phase6/list-negotiations',
      { method: 'GET' }
    ),
    listTransfers: () => apiRequest<{ success: boolean; transfers: any[]; logs: string[] }>(
      '/api/phase6/list-transfers',
      { method: 'GET' }
    ),
    initiateTransfer: (data: { contractAgreementId: string; assetId: string }) =>
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
     */
    listFiles: (accessToken: string, driveId?: string, folderId?: string) => {
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
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
    },

    /**
     * List files from SharePoint by site URL
     */
    listFilesBySiteUrl: (accessToken: string, siteUrl: string, folderId?: string) => {
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
      }>(
        `/api/sharepoint/files/by-site-url?${params.toString()}`,
        { 
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` }
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
