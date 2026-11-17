-- Snack store tables
CREATE TABLE IF NOT EXISTS snack_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price > 0),
  image_url TEXT,
  stock_quantity INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS snack_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES snack_products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash','gfunds','points')),
  customer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  station_name TEXT,
  sold_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snack_sales_product ON snack_sales(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_snack_sales_created ON snack_sales(created_at DESC);

ALTER TABLE snack_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE snack_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service-layer access control" ON snack_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service-layer access control" ON snack_sales FOR ALL USING (true) WITH CHECK (true);