import { SnackStoreService } from "@/lib/services/SnackStoreService";

const service = new SnackStoreService();

export async function GET() {
  const result = await service.getProducts();
  return Response.json(result.data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const result = await service.createProduct(body);
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json(result.data);
}