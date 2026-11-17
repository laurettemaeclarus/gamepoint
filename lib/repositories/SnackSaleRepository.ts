import { supabase } from "@/lib/supabase";
import type { SnackSale } from "@/types";

export class SnackSaleRepository {
  async create(data: {
    product_id: string;
    quantity: number;
    unit_price: number;
    total: number;
    payment_method: "cash" | "gfunds" | "points";
    customer_user_id?: string | null;
    station_name?: string | null;
    sold_by?: string | null;
  }): Promise<SnackSale> {
    const { data: row, error } = await supabase
      .from("snack_sales")
      .insert({
        product_id: data.product_id,
        quantity: data.quantity,
        unit_price: data.unit_price,
        total: data.total,
        payment_method: data.payment_method,
        customer_user_id: data.customer_user_id ?? null,
        station_name: data.station_name ?? null,
        sold_by: data.sold_by ?? null,
      })
      .select("*, snack_products(*)")
      .single();
    if (error) throw error;
    return row;
  }

  async findRecent(limit = 50): Promise<SnackSale[]> {
    const { data } = await supabase
      .from("snack_sales")
      .select("*, snack_products(*), users:customer_user_id(name)")
      .order("created_at", { ascending: false })
      .limit(limit);
    return data || [];
  }

  async findByRange(from?: string, to?: string): Promise<SnackSale[]> {
    let q = supabase
      .from("snack_sales")
      .select("*, snack_products(*), users:customer_user_id(name)")
      .order("created_at", { ascending: false })
      .limit(100000);
    if (from) q = q.gte("created_at", new Date(`${from}T00:00:00+08:00`).toISOString());
    if (to) {
      q = q.lte("created_at", new Date(`${to}T23:59:59.999+08:00`).toISOString());
    }
    const { data } = await q;
    return data || [];
  }
}