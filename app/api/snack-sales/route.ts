import { SnackStoreService } from "@/lib/services/SnackStoreService";

const service = new SnackStoreService();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit")) || 50;
  const result = await service.getRecentSales(limit);
  return Response.json(result.data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { product_id, quantity, payment_method, customer_user_id, station_name, sold_by } = body;
  if (!product_id || !quantity || !payment_method) {
    return Response.json(
      { error: "product_id, quantity and payment_method are required" },
      { status: 400 }
    );
  }
  const result = await service.recordSale({
    product_id,
    quantity: Number(quantity),
    payment_method,
    customer_user_id: customer_user_id ?? null,
    station_name: station_name ?? null,
    sold_by: sold_by ?? null,
  });
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json(result.data);
}