/**
 * Partner data type
 */
export interface Partner {
  bpn: string;
  name: string;
  description: string;
}

/**
 * Get list of available partners
 * 
 * This function returns a hardcoded list of partners for now.
 * In the future, this can be modified to fetch partners from a database or API.
 * 
 * @returns Array of available partners
 */
export function getAvailablePartners(): Partner[] {
  return [
    {
      bpn: "BPNL00000002IKLN",
      name: "Ikerlan",
      description: "IKERLAN Technology Centre"
    },
    {
      bpn: "BPNL00000000MASS",
      name: "MondragonAssembly",
      description: "Mondragon Assembly"
    },
    {
      bpn: "BPNL00000001PTR1",
      name: "Partner1",
      description: "Partner 1"
    },
    {
      bpn: "BPNL00000001PTR2",
      name: "Partner2",
      description: "Partner 2"
    },
    {
      bpn: "BPNL00000001PTR3",
      name: "Partner3",
      description: "Partner 3"
    }
  ];
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
