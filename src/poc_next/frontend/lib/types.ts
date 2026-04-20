/**
 * TypeScript types for POC Next application
 */

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  logs?: string[];
}

// ============================================================================
// EDC Entity Types
// ============================================================================

export interface Asset {
  '@id': string;
  '@type': string;
  properties?: {
    description?: string;
    [key: string]: any;
  };
  dataAddress?: DataAddress;
}

export interface DataAddress {
  '@type': string;
  baseUrl?: string;
  type?: string;
  proxyPath?: string;
  proxyMethod?: string;
  proxyQueryParams?: string;
  proxyBody?: string;
  [key: string]: any;
}

export interface Policy {
  '@id': string;
  '@type': string;
  '@context'?: any;
  permission?: any[];
  prohibition?: any[];
  obligation?: any[];
  [key: string]: any;
}

export interface ContractDefinition {
  '@id': string;
  '@type': string;
  accessPolicyId?: string;
  contractPolicyId?: string;
  assetsSelector?: any[];
  [key: string]: any;
}

export interface Negotiation {
  '@id': string;
  '@type': string;
  state?: string;
  contractAgreementId?: string;
  [key: string]: any;
}

export interface Transfer {
  '@id': string;
  '@type': string;
  state?: string;
  [key: string]: any;
}

// ============================================================================
// Form Types
// ============================================================================

export interface AssetFormData {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
}

export interface PolicyFormData {
  id?: string;
  bpn?: string;
  type: 'access' | 'contract';
}

export interface ContractFormData {
  id?: string;
  name: string;
  assetId: string;
  accessPolicyId: string;
  contractPolicyId: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface LogEntry {
  timestamp: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
}

export interface Partner {
  bpn: string;
  name: string;
  description: string;
}

// ============================================================================
// Phase-specific Types
// ============================================================================

export interface ConnectivityCheckResult {
  success: boolean;
  logs: string[];
}

export interface PodStatus {
  name: string;
  namespace: string;
  status: string;
  ready: string;
  restarts: number;
  age: string;
}
