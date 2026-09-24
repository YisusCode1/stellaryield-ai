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

const requiredNumber = (value: unknown, field: string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`XOXNO returned an invalid ${field}; market data cannot be displayed safely.`);
  }
  return parsed;
};

const requiredInteger = (value: unknown, field: string): number => {
  const parsed = requiredNumber(value, field);
  if (!Number.isInteger(parsed)) throw new Error(`XOXNO returned an invalid ${field}; an integer is required.`);
  return parsed;
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
  hubId: number;
  spokeId: number;
  supplyEnabled: boolean;
}

export async function getStellarMarkets(): Promise<FormattedMarket[]> {
  // A reserve is the exact (spoke, hub, asset) coordinate required by XOXNO
  // supply/withdraw builders. Assets alone are not sufficient to create a safe
  // transaction, so never invent hub or spoke values in the UI.
  const [rawReserves, rawAssets] = await Promise.all([
    sdk.stellarLending.reserves(),
    sdk.stellarLending.assets(),
  ]);
  const assetsByAddress = new Map((rawAssets as any[]).map((asset) => [asset.asset, asset]));
  const byAsset = new Map<string, any>();

  for (const reserve of rawReserves as any[]) {
    const current = byAsset.get(reserve.asset);
    // Prefer the primary market with actual supplied liquidity. This prevents
    // duplicate UI rows for the same token while retaining a real coordinate.
    if (!current || Number(reserve.totalDepositsUsd ?? 0) > Number(current.totalDepositsUsd ?? 0)) {
      byAsset.set(reserve.asset, reserve);
    }
  }

  return [...byAsset.values()].map((item) => {
    const asset = assetsByAddress.get(item.asset);
    const known = ASSET_MAP[item.asset];
    const supplyApy = requiredNumber(item.supplyApy, 'supply APY') * 100;
    const borrowApy = requiredNumber(item.borrowApy, 'borrow APY') * 100;
    const deposits = requiredNumber(item.totalDepositsUsd, 'total deposits');
    const borrows = requiredNumber(item.totalBorrowsUsd, 'total borrows');
    const utilizationRate = requiredNumber(item.utilizationRate, 'utilization rate') * 100;
    const availableLiquidityUsd = requiredNumber(item.availableLiquidityUsd, 'available liquidity');
    const remainingCapacityUsd = requiredNumber(item.remainingCapacityUsd, 'remaining capacity');
    const priceUsd = requiredNumber(asset?.price ?? item.priceUsd, 'asset price');

    return {
      assetId: item.asset,
      symbol: known?.symbol || `${item.asset.slice(0, 4)}...${item.asset.slice(-4)}`,
      name: known?.name || 'Unknown Token',
      decimals: requiredInteger(asset?.decimals ?? item.decimals, 'asset decimals'),
      priceUsd,
      supplyApy: Number(supplyApy.toFixed(6)),
      borrowApy: Number(borrowApy.toFixed(6)),
      totalDepositsUsd: Number(deposits.toFixed(2)),
      totalBorrowsUsd: Number(borrows.toFixed(2)),
      availableLiquidityUsd: Number(availableLiquidityUsd.toFixed(2)),
      utilizationRate: Number(utilizationRate.toFixed(6)),
      hubId: requiredInteger(item.hubId, 'hub ID'),
      spokeId: requiredInteger(item.spokeId, 'spoke ID'),
      supplyEnabled: remainingCapacityUsd > 0,
    };
  });
}

export async function getStellarUserPositions(address: string) {
  return sdk.stellarLending.users.owner(address).positions();
}

export async function getStellarUserActivity(address: string) {
  return sdk.stellarLending.users.owner(address).activity({ top: 30 });
}
