import { supabase } from "@/lib/supabase";
import type { SnackProduct } from "@/types";

export class SnackProductRepository {
  async findAll(): Promise<SnackProduct[]> {
    const { data } = await supabase
      .from("snack_products")
      .select("*")
      .order("name", { ascending: true });
    return data || [];
  }

  async findById(id: string): Promise<SnackProduct | null> {
    const { data } = await supabase
      .from("snack_products")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data;
  }

  async create(data: {
    name: string;
    price: number;
    image_url?: string | null;
    stock_quantity?: number | null;
    is_active?: boolean;
  }): Promise<SnackProduct> {
    const { data: row, error } = await supabase
      .from("snack_products")
      .insert({
        name: data.name,
        price: data.price,
        image_url: data.image_url ?? null,
        stock_quantity: data.stock_quantity ?? null,
        is_active: data.is_active ?? true,
      })
      .select("*")
      .single();
    if (error) throw error;
    return row;
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      price: number;
      image_url: string | null;
      stock_quantity: number | null;
      is_active: boolean;
    }>
  ): Promise<SnackProduct> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) payload.name = data.name;
    if (data.price !== undefined) payload.price = data.price;
    if (data.image_url !== undefined) payload.image_url = data.image_url;
    if (data.stock_quantity !== undefined) payload.stock_quantity = data.stock_quantity;
    if (data.is_active !== undefined) payload.is_active = data.is_active;

    const { data: row, error } = await supabase
      .from("snack_products")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("snack_products").delete().eq("id", id);
    if (error) throw error;
  }
}