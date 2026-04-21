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
    createAsset: (assetId: string) => apiRequest<{ success: boolean; logs: string[] }>(
      '/api/phase2/create-asset',
      { method: 'POST', body: JSON.stringify({ assetId }) }
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
    downloadFile: async (data: { transferId: string; endpoint: string; token: string }) => {
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

      return response.blob();
    },
  },
};
