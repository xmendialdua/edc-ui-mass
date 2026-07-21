import { getApiBaseUrl } from '@/lib/api';

/**
 * Partner data type
 */
export interface Partner {
  bpn: string;
  name: string;
  description: string;
}

/**
 * Fetch list of available partners from the backend API (portal database).
 * Maps company_name -> name and description.
 *
 * @returns Promise resolving to array of partners
 */
export async function fetchAvailablePartners(): Promise<Partner[]> {
  const apiUrl = getApiBaseUrl();
  const response = await fetch(`${apiUrl}/api/partners/list`);
  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Error fetching partners: ${response.status} ${response.statusText} ${errorBody}`.trim());
  }
  const data: { bpn: string; company_name: string }[] = await response.json();
  return data.map(item => ({
    bpn: item.bpn,
    name: item.company_name,
    description: item.company_name,
  }));
}

/**
 * Get list of available partners (static fallback).
 * @deprecated Use fetchAvailablePartners() to load from the database instead.
 */
export function getAvailablePartners(): Partner[] {
  return [];
}

/**
 * Get partner by BPN
 * 
 * @param bpn Business Partner Number
 * @returns Partner object or undefined if not found
 */
export function getPartnerByBPN(bpn: string): Partner | undefined {
  return getAvailablePartners().find(p => p.bpn === bpn);
}

/**
 * Get partner name by BPN
 * 
 * @param bpn Business Partner Number
 * @returns Partner name or 'Unknown' if not found
 */
export function getPartnerName(bpn: string): string {
  const partner = getPartnerByBPN(bpn);
  return partner?.name || 'Unknown';
}
