import { SnackStoreService } from "@/lib/services/SnackStoreService";

const service = new SnackStoreService();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const groupBy = searchParams.get("groupby") === "month" ? "month" : "day";
  try {
    const data = await service.getReport(from, to, groupBy);
    return Response.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to build report";
    return Response.json({ error: message }, { status: 500 });
  }
}