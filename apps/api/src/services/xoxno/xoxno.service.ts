import { buildSdk, XOXNOClient } from '@xoxno/sdk-js';

const sdk = buildSdk(
  new XOXNOClient({
    apiUrl: 'https://api.xoxno.com',
  })
);

// Mapeo conocido de IDs de contratos Soroban a Tickers de Stellar
const ASSET_MAP: Record<string, { symbol: string; name: string }> = {
  'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA': { symbol: 'XLM', name: 'Stellar Lumens' },
  'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75': { symbol: 'USDC', name: 'USD Coin' },
  'CDTKPWPLOURQA2SGTKTUQOWRCBZEORB4BWBOMJ3D3ZTQQSGE5F6JBQLV': { symbol: 'EURC', name: 'Euro Coin' },
};

export interface FormattedMarket {
  assetId: string;
  symbol: string;
  name: string;
  decimals: number;
  priceUsd: number;
  supplyApy: number; // Porcentaje (ej. 1.36)
  borrowApy: number; // Porcentaje (ej. 3.13)
  totalDepositsUsd: number;
  totalBorrowsUsd: number;
  availableLiquidityUsd: number;
  utilizationRate: number; // Porcentaje de utilización
}

export async function getStellarMarkets(): Promise<FormattedMarket[]> {
  const rawAssets = await sdk.stellarLending.assets();

  return rawAssets.map((item: any) => {
    const known = ASSET_MAP[item.asset];
    const supplyApy = (item.supplyApyRange?.[0] || 0) * 100;
    const borrowApy = (item.borrowApyRange?.[0] || 0) * 100;
    
    const deposits = item.totalDepositsUsd || 0;
    const borrows = item.totalBorrowsUsd || 0;
    const utilizationRate = deposits > 0 ? (borrows / deposits) * 100 : 0;

    return {
      assetId: item.asset,
      symbol: known?.symbol || `${item.asset.slice(0, 4)}...${item.asset.slice(-4)}`,
      name: known?.name || 'Unknown Token',
      decimals: item.decimals,
      priceUsd: item.price,
      supplyApy: Number(supplyApy.toFixed(2)),
      borrowApy: Number(borrowApy.toFixed(2)),
      totalDepositsUsd: Number(deposits.toFixed(2)),
      totalBorrowsUsd: Number(borrows.toFixed(2)),
      availableLiquidityUsd: Number((item.availableLiquidityUsd || 0).toFixed(2)),
      utilizationRate: Number(utilizationRate.toFixed(2)),
    };
  });
}