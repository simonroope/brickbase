import { fetchAssetDetail, serializeAssetDetail } from "@/lib/contracts";
import { resolveDeployedAddress } from "@/lib/deployedAddresses";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId: assetIdParam } = await params;
  const assetId = parseInt(assetIdParam, 10);
  if (Number.isNaN(assetId) || assetId < 1) {
    return Response.json({ error: "Invalid asset ID" }, { status: 400 });
  }
  try {
    const asset = await fetchAssetDetail(
      assetId,
      resolveDeployedAddress("ASSET_VAULT_ADDRESS"),
      resolveDeployedAddress("ASSET_SHARES_ADDRESS")
    );
    if (!asset) {
      return Response.json({ error: "Asset not found" }, { status: 404 });
    }
    return Response.json(serializeAssetDetail(asset));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Asset unavailable";
    return Response.json({ error: message }, { status: 502 });
  }
}
