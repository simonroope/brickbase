export type RecordedAssetProbe = {
  metadataURI?: string;
  createdAt?: bigint;
};

const MAX_ASSET_ID_PROBE = 256;

export function isRecordedAsset(asset: RecordedAssetProbe | undefined): boolean {
  if (!asset) return false;
  if (asset.metadataURI) return true;
  return (asset.createdAt ?? BigInt(0)) > BigInt(0);
}

/** Event ids if present; otherwise sequential getAsset until the first empty slot. */
export async function resolveAssetIds(
  eventIds: number[],
  readAsset: (id: number) => Promise<RecordedAssetProbe>,
  maxId: number = MAX_ASSET_ID_PROBE
): Promise<number[]> {
  if (eventIds.length > 0) return eventIds;
  const ids: number[] = [];
  for (let id = 1; id <= maxId; id++) {
    const asset = await readAsset(id);
    if (!isRecordedAsset(asset)) break;
    ids.push(id);
  }
  return ids;
}
