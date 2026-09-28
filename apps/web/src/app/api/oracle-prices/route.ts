import { fetchOraclePrices, serializeOraclePrices } from "@/lib/contracts";
import { resolveDeployedAddress } from "@/lib/deployedAddresses";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const prices = await fetchOraclePrices(
      resolveDeployedAddress("ORACLE_ROUTER_ADDRESS")
    );
    return Response.json(serializeOraclePrices(prices));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Oracle prices unavailable";
    return Response.json({ error: message }, { status: 502 });
  }
}
