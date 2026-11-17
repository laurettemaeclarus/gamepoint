import { SnackProductRepository } from "@/lib/repositories/SnackProductRepository";
import { SnackSaleRepository } from "@/lib/repositories/SnackSaleRepository";
import type { SnackProduct, SnackSale } from "@/types";

export class SnackStoreService {
  private productRepo = new SnackProductRepository();
  private saleRepo = new SnackSaleRepository();

  async getProducts(): Promise<{ data: SnackProduct[] }> {
    const data = await this.productRepo.findAll();
    return { data };
  }

  async getProduct(id: string): Promise<SnackProduct | null> {
    return this.productRepo.findById(id);
  }

  async createProduct(data: {
    name: string;
    price: number;
    image_url?: string | null;
    stock_quantity?: number | null;
    is_active?: boolean;
  }): Promise<{ data: SnackProduct } | { error: string }> {
    if (!data.name?.trim()) return { error: "Name is required" };
    if (!data.price || data.price <= 0) return { error: "Price must be greater than 0" };
    try {
      const row = await this.productRepo.create(data);
      return { data: row };
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : "Failed to create product" };
    }
  }

  async updateProduct(
    id: string,
    data: Partial<{
      name: string;
      price: number;
      image_url: string | null;
      stock_quantity: number | null;
      is_active: boolean;
    }>
  ): Promise<{ data: SnackProduct } | { error: string }> {
    try {
      const row = await this.productRepo.update(id, data);
      return { data: row };
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : "Failed to update product" };
    }
  }

  async deleteProduct(id: string): Promise<{ success: true } | { error: string }> {
    try {
      await this.productRepo.delete(id);
      return { success: true };
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : "Failed to delete product" };
    }
  }

  async recordSale(data: {
    product_id: string;
    quantity: number;
    payment_method: "cash" | "gfunds" | "points";
    customer_user_id?: string | null;
    station_name?: string | null;
    sold_by?: string | null;
  }): Promise<{ data: SnackSale } | { error: string }> {
    const product = await this.productRepo.findById(data.product_id);
    if (!product) return { error: "Product not found" };
    if (!product.is_active) return { error: "Product is inactive" };
    const qty = Number(data.quantity) || 0;
    if (qty <= 0) return { error: "Quantity must be greater than 0" };
    const unitPrice = Number(product.price);
    const total = unitPrice * qty;
    try {
      const row = await this.saleRepo.create({
        product_id: data.product_id,
        quantity: qty,
        unit_price: unitPrice,
        total,
        payment_method: data.payment_method,
        customer_user_id: data.customer_user_id ?? null,
        station_name: data.station_name ?? null,
        sold_by: data.sold_by ?? null,
      });
      return { data: row };
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : "Failed to record sale" };
    }
  }

  async getRecentSales(limit = 50): Promise<{ data: SnackSale[] }> {
    const data = await this.saleRepo.findRecent(limit);
    return { data };
  }

  async getReport(from?: string, to?: string, groupBy: "day" | "month" = "day") {
    const sales = await this.saleRepo.findByRange(from, to);

    const bucketKey = (iso: string) => {
      const d = new Date(iso);
      if (groupBy === "day") return d.toISOString().split("T")[0];
      const m = String(d.getMonth() + 1).padStart(2, "0");
      return `${d.getFullYear()}-${m}`;
    };

    const totalRevenue = sales.reduce((s, r) => s + (Number(r.total) || 0), 0);
    const totalUnits = sales.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    const uniqueProducts = new Set(sales.map((s) => s.product_id)).size;

    // breakdown
    const buckets = new Map<string, { total: number; count: number; units: number }>();
    sales.forEach((s) => {
      if (!s.created_at) return;
      const k = bucketKey(s.created_at);
      const cur = buckets.get(k) ?? { total: 0, count: 0, units: 0 };
      cur.total += Number(s.total) || 0;
      cur.count += 1;
      cur.units += Number(s.quantity) || 0;
      buckets.set(k, cur);
    });
    const breakdown = [...buckets.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, v]) => ({
        date,
        sale_count: v.count,
        total: v.total,
        units: v.units,
      }));

    // top products
    const perProduct = new Map<string, { name: string; total: number; units: number; count: number }>();
    sales.forEach((s) => {
      const name = s.snack_products?.name ?? "Unknown";
      const cur = perProduct.get(s.product_id) ?? { name, total: 0, units: 0, count: 0 };
      cur.total += Number(s.total) || 0;
      cur.units += Number(s.quantity) || 0;
      cur.count += 1;
      perProduct.set(s.product_id, cur);
    });
    const topProducts = [...perProduct.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // by payment method
    const byPayment = new Map<string, { total: number; count: number }>();
    sales.forEach((s) => {
      const cur = byPayment.get(s.payment_method) ?? { total: 0, count: 0 };
      cur.total += Number(s.total) || 0;
      cur.count += 1;
      byPayment.set(s.payment_method, cur);
    });
    const paymentBreakdown = [...byPayment.entries()].map(([method, v]) => ({
      method,
      total: v.total,
      count: v.count,
    }));

    // recent
    const recent = sales.slice(0, 50).map((s) => ({
      id: s.id,
      product: s.snack_products?.name ?? "Unknown",
      quantity: s.quantity,
      unit_price: s.unit_price,
      total: s.total,
      payment_method: s.payment_method,
      customer: s.users?.name ?? null,
      station: s.station_name,
      created_at: s.created_at,
    }));

    return {
      summary: {
        total_revenue: totalRevenue,
        sale_count: sales.length,
        total_units: totalUnits,
        unique_products: uniqueProducts,
      },
      breakdown,
      top_products: topProducts,
      payment_breakdown: paymentBreakdown,
      recent_sales: recent,
      groupby: groupBy,
    };
  }
}