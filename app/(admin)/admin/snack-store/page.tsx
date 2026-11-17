"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  ShoppingBag,
  Plus,
  Pencil,
  Trash2,
  BarChart3,
  CalendarDays,
  ReceiptText,
  Trophy,
} from "lucide-react";
import type { SnackProduct, SnackSale } from "@/types";

type Tab = "products" | "sales" | "reports" | "monitoring";

type ReportData = {
  summary: {
    total_revenue: number;
    sale_count: number;
    total_units: number;
    unique_products: number;
  };
  breakdown: { date: string; sale_count: number; total: number; units: number }[];
  top_products: { name: string; total: number; units: number; count: number }[];
  payment_breakdown: { method: string; total: number; count: number }[];
  recent_sales: {
    id: string;
    product: string;
    quantity: number;
    unit_price: number;
    total: number;
    payment_method: string;
    customer: string | null;
    station: string | null;
    created_at: string;
  }[];
  groupby: string;
};

const GRADIENT =
  "bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500";

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}
function monthStartISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

const LAUNCH_DATE_ISO =
  process.env.NEXT_PUBLIC_SNACK_STORE_LAUNCH_DATE || todayISO();

function parseLocalMidnight(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function daysSinceLaunch(): number {
  const launch = parseLocalMidnight(LAUNCH_DATE_ISO);
  const todayMidnight = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const diffMs = todayMidnight.getTime() - launch.getTime();
  return Math.max(1, Math.floor(diffMs / 86400000) + 1);
}
function monthsSinceLaunch(): number {
  const launch = parseLocalMidnight(LAUNCH_DATE_ISO);
  const now = new Date();
  let months = (now.getFullYear() - launch.getFullYear()) * 12 + (now.getMonth() - launch.getMonth());
  if (now.getDate() < launch.getDate()) months -= 1;
  return Math.max(1, months + 1);
}

export default function SnackStoreAdmin() {
  const [authorized, setAuthorized] = useState(false);
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<SnackProduct[]>([]);
  const [sales, setSales] = useState<SnackSale[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // product modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SnackProduct | null>(null);
  const [pName, setPName] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pImage, setPImage] = useState("");
  const [pStock, setPStock] = useState("");
  const [pActive, setPActive] = useState(true);

  // record sale
  const [saleProductId, setSaleProductId] = useState("");
  const [saleQty, setSaleQty] = useState("1");
  const [salePayment, setSalePayment] = useState<"cash" | "gfunds" | "points">("cash");
  const [saleCustomerId, setSaleCustomerId] = useState("");
  const [saleStation, setSaleStation] = useState("");

  // reports
  const [fromDate, setFromDate] = useState(monthStartISO());
  const [toDate, setToDate] = useState(todayISO());
  const [groupBy, setGroupBy] = useState<"day" | "month">("day");
  const [report, setReport] = useState<ReportData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    const isAdmin = localStorage.getItem("isAdmin");
    if (isAdmin !== "true") {
      window.location.href = "/login";
    } else {
      setAuthorized(true);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/snack-products");
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSales = useCallback(async () => {
    try {
      const res = await fetch("/api/snack-sales?limit=50");
      const data = await res.json();
      setSales(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })) : []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!authorized) return;
    loadProducts();
    loadSales();
    loadUsers();
  }, [authorized, loadProducts, loadSales, loadUsers]);

  const openAddProduct = () => {
    setEditingProduct(null);
    setPName("");
    setPPrice("");
    setPImage("");
    setPStock("");
    setPActive(true);
    setShowProductModal(true);
  };

  const openEditProduct = (p: SnackProduct) => {
    setEditingProduct(p);
    setPName(p.name);
    setPPrice(String(p.price));
    setPImage(p.image_url || "");
    setPStock(p.stock_quantity != null ? String(p.stock_quantity) : "");
    setPActive(p.is_active);
    setShowProductModal(true);
  };

  const saveProduct = async () => {
    const body = {
      name: pName.trim(),
      price: Number(pPrice),
      image_url: pImage.trim() || null,
      stock_quantity: pStock.trim() === "" ? null : Number(pStock),
      is_active: pActive,
    };
    try {
      if (editingProduct) {
        await fetch(`/api/snack-products/${editingProduct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/snack-products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      setShowProductModal(false);
      loadProducts();
    } catch {
      // ignore
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/snack-products/${id}`, { method: "DELETE" });
    loadProducts();
  };

  const recordSale = async () => {
    if (!saleProductId) return;
    const body = {
      product_id: saleProductId,
      quantity: Number(saleQty) || 1,
      payment_method: salePayment,
      customer_user_id: saleCustomerId || null,
      station_name: saleStation.trim() || null,
    };
    try {
      await fetch("/api/snack-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSaleQty("1");
      setSaleStation("");
      loadSales();
    } catch {
      // ignore
    }
  };

  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    setReportError(null);
    try {
      const params = new URLSearchParams({ from: fromDate, to: toDate, groupby: groupBy });
      const res = await fetch(`/api/admin/snack-report?${params.toString()}`);
      const json = await res.json();
      if (json.error) {
        setReportError(json.error);
        setReport(null);
      } else {
        setReport(json);
      }
    } catch {
      setReportError("Cannot reach the server");
      setReport(null);
    } finally {
      setReportLoading(false);
    }
  }, [fromDate, toDate, groupBy]);

  useEffect(() => {
    if (authorized && tab === "reports") fetchReport();
  }, [authorized, tab, fetchReport]);

  const setPreset = (preset: "today" | "week" | "month" | "lastmonth" | "year") => {
    const now = new Date();
    const iso = (d: Date) => d.toISOString().split("T")[0];
    if (preset === "today") {
      setFromDate(iso(now));
      setToDate(iso(now));
    } else if (preset === "week") {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      setFromDate(iso(start));
      setToDate(iso(now));
    } else if (preset === "month") {
      setFromDate(monthStartISO());
      setToDate(todayISO());
    } else if (preset === "lastmonth") {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      setFromDate(iso(first));
      setToDate(iso(last));
    } else {
      setFromDate(`${now.getFullYear()}-01-01`);
      setToDate(todayISO());
    }
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#0b1220] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
      </div>
    );
  }

  const dayCount = daysSinceLaunch();
  const monthCount = monthsSinceLaunch();

  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-wide flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-pink-500" />
              Snack <span className="text-pink-500">Store</span>
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Manage snack products, pricing and sales
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {([
            { id: "products", label: "Products" },
            { id: "sales", label: "Record Sale" },
            { id: "reports", label: "Reports" },
            { id: "monitoring", label: "Monitoring" },
          ] as { id: Tab; label: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === t.id
                  ? `text-white ${GRADIENT} shadow-lg shadow-purple-900/40`
                  : "bg-zinc-800/60 text-zinc-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Products tab */}
        {tab === "products" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={openAddProduct}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white ${GRADIENT}`}
              >
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>
            {loading ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
              </div>
            ) : products.length === 0 ? (
              <div className="bg-[#0f1b2e] border border-white/5 rounded-2xl p-10 text-center text-sm text-zinc-500">
                No snack products yet.
              </div>
            ) : (
              <div className="bg-[#0f1b2e] border border-white/5 rounded-2xl overflow-x-auto">
                <table className="w-full text-sm text-zinc-400 min-w-[600px]">
                  <thead className="text-xs text-zinc-500 border-b border-white/5">
                    <tr>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-right">Price</th>
                      <th className="p-2 text-right">Stock</th>
                      <th className="p-2 text-center">Active</th>
                      <th className="p-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id} className="border-b border-white/5">
                        <td className="p-2 font-medium text-white">{p.name}</td>
                        <td className="p-2 text-right font-bold text-emerald-400">₱{Number(p.price).toFixed(2)}</td>
                        <td className="p-2 text-right">{p.stock_quantity ?? "∞"}</td>
                        <td className="p-2 text-center">{p.is_active ? "Yes" : "No"}</td>
                        <td className="p-2 text-right space-x-2">
                          <button onClick={() => openEditProduct(p)} className="text-sky-400 hover:text-sky-300">
                            <Pencil className="w-4 h-4 inline" />
                          </button>
                          <button onClick={() => deleteProduct(p.id)} className="text-red-400 hover:text-red-300">
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Record Sale tab */}
        {tab === "sales" && (
          <div className="space-y-4">
            <div className="bg-[#0f1b2e] border border-white/5 rounded-2xl p-4 space-y-3">
              <h2 className="font-bold">Record Sale</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={saleProductId}
                  onChange={(e) => setSaleProductId(e.target.value)}
                  className="px-3 py-2 bg-[#1e293b] border border-white/5 rounded-xl text-sm"
                >
                  <option value="">Select product</option>
                  {products.filter((p) => p.is_active).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₱{Number(p.price).toFixed(2)})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={saleQty}
                  onChange={(e) => setSaleQty(e.target.value)}
                  placeholder="Qty"
                  className="px-3 py-2 bg-[#1e293b] border border-white/5 rounded-xl text-sm"
                />
                <select
                  value={salePayment}
                  onChange={(e) => setSalePayment(e.target.value as "cash" | "gfunds" | "points")}
                  className="px-3 py-2 bg-[#1e293b] border border-white/5 rounded-xl text-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="gfunds">Gfunds</option>
                  <option value="points">Points</option>
                </select>
                <select
                  value={saleCustomerId}
                  onChange={(e) => setSaleCustomerId(e.target.value)}
                  className="px-3 py-2 bg-[#1e293b] border border-white/5 rounded-xl text-sm"
                >
                  <option value="">Customer (optional)</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <input
                  value={saleStation}
                  onChange={(e) => setSaleStation(e.target.value)}
                  placeholder="Station (optional)"
                  className="px-3 py-2 bg-[#1e293b] border border-white/5 rounded-xl text-sm"
                />
              </div>
              <button
                onClick={recordSale}
                disabled={!saleProductId}
                className={`px-4 py-2 rounded-xl text-sm font-semibold text-white ${GRADIENT} disabled:opacity-50`}
              >
                Record Sale
              </button>
            </div>

            <div className="bg-[#0f1b2e] border border-white/5 rounded-2xl p-4">
              <h2 className="font-bold mb-3 flex items-center gap-2">
                <ReceiptText className="w-4 h-4 text-purple-400" /> Recent Sales
              </h2>
              {sales.length === 0 ? (
                <div className="text-sm text-zinc-500 py-6 text-center">No sales recorded yet.</div>
              ) : (
                <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                  {sales.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 bg-zinc-900/50 border border-white/5 px-3 py-2.5 rounded-xl">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          <span className="font-bold text-emerald-400">{s.snack_products?.name ?? "Unknown"}</span>
                          <span className="text-zinc-400"> × {s.quantity}</span>
                        </div>
                        <div className="text-[11px] text-zinc-500 truncate">
                          ₱{Number(s.unit_price).toFixed(2)} each • {s.payment_method}
                          {s.users?.name ? ` • ${s.users.name}` : ""}
                          {s.station_name ? ` • ${s.station_name}` : ""}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-emerald-400 shrink-0">₱{Number(s.total).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reports tab */}
        {tab === "reports" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-black flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-pink-500" /> Sales <span className="text-pink-500">Reports</span>
              </h2>
              <button
                onClick={fetchReport}
                disabled={reportLoading}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white ${GRADIENT} disabled:opacity-50`}
              >
                {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Refresh
              </button>
            </div>

            <div className="bg-[#0f1b2e] border border-white/5 rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-3 py-2 bg-[#1e293b] border border-white/5 rounded-xl text-sm [color-scheme:dark]"
                />
                <span className="text-zinc-500 text-sm">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-3 py-2 bg-[#1e293b] border border-white/5 rounded-xl text-sm [color-scheme:dark]"
                />
                <div className="flex gap-1 bg-zinc-900/60 p-1 rounded-xl">
                  {(["day", "month"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGroupBy(g)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                        groupBy === g
                          ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {g === "day" ? "Daily" : "Monthly"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["today", "Today"],
                    ["week", "Last 7 days"],
                    ["month", "This month"],
                    ["lastmonth", "Last month"],
                    ["year", "This year"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setPreset(key)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800/70 text-zinc-400 hover:text-white transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {reportError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-2xl">
                {reportError}
              </div>
            )}

            {report && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: "Total Revenue", value: `₱${report.summary.total_revenue.toFixed(2)}`, color: "text-emerald-400 bg-emerald-500/10" },
                    { label: "Sales", value: `${report.summary.sale_count}`, color: "text-purple-400 bg-purple-500/10" },
                    { label: "Units Sold", value: `${report.summary.total_units}`, color: "text-pink-400 bg-pink-500/10" },
                    { label: "Products Sold", value: `${report.summary.unique_products}`, color: "text-amber-400 bg-amber-500/10" },
                  ].map((s) => (
                    <div key={s.label} className="bg-[#0f1b2e] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${s.color}`}>
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xl font-black leading-tight truncate">{s.value}</div>
                        <div className="text-[11px] text-zinc-500 truncate">{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-[#0f1b2e] border border-white/5 rounded-2xl p-4 sm:p-5">
                  <h2 className="font-bold mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-pink-500" />
                    {groupBy === "day" ? "Daily" : "Monthly"} sales
                  </h2>
                  {reportLoading ? (
                    <div className="py-10 flex justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
                    </div>
                  ) : report.breakdown.length === 0 ? (
                    <div className="text-sm text-zinc-500 py-8 text-center">No sales in this range.</div>
                  ) : (
                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                      {report.breakdown.map((b) => {
                        const maxTotal = Math.max(1, ...report.breakdown.map((x) => x.total));
                        return (
                          <div key={b.date} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-zinc-400 font-medium">{b.date}</span>
                              <span className="font-bold text-emerald-400">₱{b.total.toFixed(2)}</span>
                            </div>
                            <div className="h-3 rounded-full bg-zinc-800/70 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
                                style={{ width: `${(b.total / maxTotal) * 100}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              {b.sale_count} sales • {b.units} units
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-[#0f1b2e] border border-white/5 rounded-2xl p-4 sm:p-5">
                  <h2 className="font-bold mb-3 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" /> Top products by revenue
                  </h2>
                  {report.top_products.length === 0 ? (
                    <div className="text-sm text-zinc-500 py-6 text-center">No data</div>
                  ) : (
                    <div className="space-y-1.5">
                      {report.top_products.map((u, i) => (
                        <div key={u.name} className="flex items-center justify-between bg-zinc-900/50 border border-white/5 px-3 py-2.5 rounded-xl">
                          <div className="text-sm font-medium truncate">
                            <span className="text-zinc-500 mr-2">#{i + 1}</span>
                            {u.name}
                            <span className="text-zinc-500 text-xs ml-2">{u.count} sales • {u.units} units</span>
                          </div>
                          <div className="text-sm font-bold text-emerald-400">₱{u.total.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-[#0f1b2e] border border-white/5 rounded-2xl p-4 sm:p-5">
                  <h2 className="font-bold mb-3 flex items-center gap-2">
                    <ReceiptText className="w-4 h-4 text-purple-400" /> Recent sales
                  </h2>
                  {report.recent_sales.length === 0 ? (
                    <div className="text-sm text-zinc-500 py-6 text-center">No sales recorded yet.</div>
                  ) : (
                    <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                      {report.recent_sales.map((l) => (
                        <div key={l.id} className="flex items-center justify-between gap-2 bg-zinc-900/50 border border-white/5 px-3 py-2.5 rounded-xl">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              <span className="font-bold text-emerald-400">{l.product}</span>
                              <span className="text-zinc-400"> × {l.quantity}</span>
                            </div>
                            <div className="text-[11px] text-zinc-500 truncate">
                              {l.payment_method}
                              {l.customer ? ` • ${l.customer}` : ""}
                              {l.station ? ` • ${l.station}` : ""}
                            </div>
                          </div>
                          <div className="text-[11px] text-zinc-500 shrink-0">{new Date(l.created_at).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Monitoring tab */}
        {tab === "monitoring" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-black flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-pink-500" /> Monitoring
              </h2>
            </div>
            <div className="bg-[#0f1b2e] border border-white/5 rounded-2xl p-4">
              <div className="inline-flex items-center gap-1.5 bg-purple-500/10 border border-white/5 rounded-full px-3 py-1 text-xs font-semibold text-purple-300">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>
                  Day {dayCount} • Month {monthCount} since launch ({LAUNCH_DATE_ISO})
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-3">
                Monitoring starts from the date the Snack Store was pushed: {LAUNCH_DATE_ISO}.
              </p>
            </div>

            {report && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Total Revenue", value: `₱${report.summary.total_revenue.toFixed(2)}` },
                  { label: "Sales", value: `${report.summary.sale_count}` },
                  { label: "Units Sold", value: `${report.summary.total_units}` },
                  { label: "Products", value: `${products.length}` },
                ].map((s) => (
                  <div key={s.label} className="bg-[#0f1b2e] border border-white/5 rounded-2xl p-4">
                    <div className="text-xl font-black leading-tight">{s.value}</div>
                    <div className="text-[11px] text-zinc-500">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={fetchReport}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white ${GRADIENT}`}
            >
              Load Summary
            </button>
          </div>
        )}

        {/* Product modal */}
        {showProductModal && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-[#0f1b2e] border border-white/5 rounded-2xl p-5 w-full max-w-md space-y-3">
              <h2 className="font-bold text-lg">
                {editingProduct ? "Edit Product" : "Add Product"}
              </h2>
              <input
                value={pName}
                onChange={(e) => setPName(e.target.value)}
                placeholder="Name"
                className="w-full px-3 py-2 bg-[#1e293b] border border-white/5 rounded-xl text-sm"
              />
              <input
                type="number"
                step="0.01"
                value={pPrice}
                onChange={(e) => setPPrice(e.target.value)}
                placeholder="Price"
                className="w-full px-3 py-2 bg-[#1e293b] border border-white/5 rounded-xl text-sm"
              />
              <input
                value={pImage}
                onChange={(e) => setPImage(e.target.value)}
                placeholder="Image URL (optional)"
                className="w-full px-3 py-2 bg-[#1e293b] border border-white/5 rounded-xl text-sm"
              />
              <input
                type="number"
                value={pStock}
                onChange={(e) => setPStock(e.target.value)}
                placeholder="Stock (optional)"
                className="w-full px-3 py-2 bg-[#1e293b] border border-white/5 rounded-xl text-sm"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={pActive}
                  onChange={(e) => setPActive(e.target.checked)}
                />
                Active
              </label>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 rounded-xl text-sm bg-zinc-800/60 text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProduct}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold text-white ${GRADIENT}`}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}