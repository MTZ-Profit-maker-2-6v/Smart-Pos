import type { Expense, ManagementOverview, SalesMixItem, StockTakeSession, StockVariance } from '@/types';
import type { Order } from '@/types/pos';
import type { GRV } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export type DashboardStaffRow = {
  id: string;
  name: string;
  role: string;
  totalSales: number;
};

export function computeDashboardMetrics(params: {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  orders: Order[];
  grvs: GRV[];
  expenses: Expense[];
  stockTakes: StockTakeSession[];
}): {
  overview: ManagementOverview;
  topSellers: SalesMixItem[];
  lowSeller: SalesMixItem | null;
  staffRows: DashboardStaffRow[];
  varianceItems: StockVariance[];
} {
  const { startDate, endDate } = params;

  const paidOrders: Order[] = [];
  let turnoverInclAcc = 0;
  let taxAcc = 0;
  let costAcc = 0;
  const customerKeys = new Set<string>();
  const tableNos = new Set<number>();

  for (const o of params.orders) {
    if (o.status !== 'paid') continue;
    const key = dateKeyFromIso(o.paidAt ?? o.createdAt);
    if (key < startDate || key > endDate) continue;

    paidOrders.push(o);
    const total = Number.isFinite(o.total) ? o.total : 0;
    const tax = Number.isFinite(o.tax) ? o.tax : 0;
    const cost = Number.isFinite(o.totalCost) ? o.totalCost : 0;
    turnoverInclAcc += total;
    taxAcc += tax;
    costAcc += cost;

    const customerKey = o.customerPhone?.trim()
      ? o.customerPhone.trim()
      : o.customerName?.trim()
        ? o.customerName.trim()
        : null;
    if (customerKey) customerKeys.add(customerKey);

    if (typeof o.tableNo === 'number') tableNos.add(o.tableNo);
  }

  const turnoverIncl = round2(turnoverInclAcc);
  const tax = round2(taxAcc);
  const turnoverExcl = round2(turnoverIncl - tax);

  const costOfSales = round2(costAcc);
  const costOfSalesPercent = turnoverExcl > 0 ? round2((costOfSales / turnoverExcl) * 100) : 0;

  const grossProfit = round2(turnoverExcl - costOfSales);
  const grossProfitPercent = turnoverExcl > 0 ? round2((grossProfit / turnoverExcl) * 100) : 0;

  let expensesAcc = 0;
  for (const e of params.expenses) {
    if (e.date < startDate || e.date > endDate) continue;
    const amt = Number.isFinite(e.amount) ? e.amount : 0;
    expensesAcc += amt;
  }
  const expenses = round2(expensesAcc);

  const netProfit = round2(grossProfit - expenses);

  const paymentTotals = computePaymentTotals(paidOrders);

  const invoiceCount = paidOrders.length;
  const avgPerInvoice = invoiceCount > 0 ? round2(turnoverIncl / invoiceCount) : 0;

  const hoursPerDay = computeAvgOpenHoursPerDay(paidOrders, startDate, endDate);
  const minsPerTable = tableNos.size > 0 && hoursPerDay > 0 ? round2((hoursPerDay * 60) / tableNos.size) : 0;
  const tablesPerHour = hoursPerDay > 0 ? round2(tableNos.size / hoursPerDay) : 0;

  let purchasesAcc = 0;
  for (const g of params.grvs) {
    if (g.status !== 'confirmed') continue;
    if (g.date < startDate || g.date > endDate) continue;
    const total = Number.isFinite(g.total) ? g.total : 0;
    purchasesAcc += total;
  }
  const purchases = round2(purchasesAcc);

  const { varianceValue: stockVarianceValue, items: varianceItems } = computeStockVarianceFromTakes(params.stockTakes, startDate, endDate);

  const { sessions, orderTypes } = computeSessionAndOrderTypeBreakdowns(paidOrders, turnoverIncl);

  const drnRange = computeDrnRange(paidOrders);

  const overview: ManagementOverview = {
    reportDate: endDate,
    drnRange,

    cashTotal: paymentTotals.cash,
    chequeTotal: paymentTotals.cheque,
    cardTotal: paymentTotals.card,
    accountTotal: paymentTotals.account,
    nonBankTotal: paymentTotals.non_bank,
    totalPaytypes: round2(
      paymentTotals.cash + paymentTotals.cheque + paymentTotals.card + paymentTotals.account + paymentTotals.non_bank
    ),

    turnoverIncl,
    tax,
    turnoverExcl,

    openingStock: 0,
    purchases,
    stockTransIn: 0,
    stockTransOut: 0,
    closingStock: 0,
    costOfSales,
    costOfSalesPercent,

    grossProfit,
    grossProfitPercent,
    expenses,
    netProfit,

    invoiceCount,
    customerCount: customerKeys.size,
    tableCount: tableNos.size,
    avgPerInvoice,
    tablesPerHour,
    minsPerTable,
    hoursPerDay,

    stockVarianceValue,
    wastageValue: 0,

    sessions,
    orderTypes,
  };

  const salesMix = computeSalesMix(paidOrders, turnoverIncl);

  const topSellers = salesMix
    .slice()
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 5);

  const lowSeller = salesMix.length
    ? salesMix
        .slice()
        .sort((a, b) => {
          // primarily by qty (volume), then by sales
          if (a.quantity !== b.quantity) return a.quantity - b.quantity;
          return a.totalSales - b.totalSales;
        })[0]
    : null;

  const staffRows = computeStaffSales(paidOrders, turnoverIncl);

  return { overview, topSellers, lowSeller, staffRows, varianceItems };
}

// Fetch precomputed aggregates from DB via RPC `get_dashboard_stats` when available.
export async function fetchDashboardStatsFromDb(brandId: string, startDate: string, endDate: string) {
  if (!isSupabaseConfigured() || !supabase) return null;
  if (!brandId) return null;
  try {
    const { data, error } = await supabase.rpc('get_dashboard_stats', { p_brand_id: brandId, p_start_date: startDate, p_end_date: endDate });
    if (error) {
      console.warn('[dashboardMetrics] rpc get_dashboard_stats error', error);
      return null;
    }
    // Map the RPC result to the UI keys expected by Dashboard
    const raw = Array.isArray(data) && data.length ? data[0] : data;
    if (!raw) return null;
    return {
      ...raw,
      cashierShiftCount: Number(raw.cashier_shift_count ?? 0),
      cashierShiftClosedCount: Number(raw.cashier_shift_closed_count ?? 0),
      cashierShiftOpeningTotal: Number(raw.cashier_shift_opening_total ?? 0),
      cashierShiftClosingTotal: Number(raw.cashier_shift_closing_total ?? 0),
      cashierShiftVarianceTotal: Number(raw.cashier_shift_variance_total ?? 0),
      cashierShiftsByStaff: Array.isArray(raw.cashier_shifts_by_staff) ? raw.cashier_shifts_by_staff : [],
      staffRows: Array.isArray(raw.staff_performance)
        ? raw.staff_performance.map((row: any) => ({
            name: row.name,
            totalSales: Number(row.totalSales) || 0,
          }))
        : [],
      topSellers: Array.isArray(raw.top_selling)
        ? raw.top_selling.map((item: any) => ({
            itemName: item.name,
            quantity: item.qty,
            totalSales: item.sales,
            gpAfterDiscount: 0,
          }))
        : [],
      paymentBreakdown: typeof raw.payment_breakdown === 'object' && raw.payment_breakdown !== null ? raw.payment_breakdown : {},
      hoursPerDay: Array.isArray(raw.hours_per_day) ? raw.hours_per_day : [],
      invoiceCount: typeof raw.invoices_count === 'number' ? raw.invoices_count : 0,
    };
  } catch (e) {
    console.warn('[dashboardMetrics] fetchDashboardStatsFromDb exception', e);
    return null;
  }
}

function dateKeyFromIso(value: unknown) {
  if (typeof value === 'string' && value.length >= 10) {
    const y = value.slice(0, 4);
    const m = value.slice(5, 7);
    const d = value.slice(8, 10);
    if (value[4] === '-' && value[7] === '-' && isDigits(y) && isDigits(m) && isDigits(d)) {
      return `${y}-${m}-${d}`;
    }
  }
  return dateKeyLocal(new Date(value as any));
}

function isDigits(s: string) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 48 || c > 57) return false;
  }
  return true;
}

function computeDrnRange(orders: Order[]): { from: number; to: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const o of orders) {
    const n = o.orderNo;
    if (!Number.isFinite(n)) continue;
    if (n < min) min = n;
    if (n > max) max = n;
  }
  if (min === Infinity || max === -Infinity) return { from: 0, to: 0 };
  return { from: min, to: max };
}

function computePaymentTotals(orders: Order[]) {
  const totals = { cash: 0, card: 0, cheque: 0, account: 0, non_bank: 0 };

  for (const o of orders) {
    const splits = o.splitPayments?.filter((s) => Number.isFinite(s.amount) && s.amount > 0) ?? [];
    if (splits.length) {
      for (const s of splits) {
        if (s.method in totals) (totals as any)[s.method] += s.amount;
      }
      continue;
    }

    const method = (o.paymentMethod ?? 'cash') as keyof typeof totals;
    const amt = Number.isFinite(o.total) ? o.total : 0;
    if (method in totals) (totals as any)[method] += amt;
  }

  return {
    cash: round2(totals.cash),
    card: round2(totals.card),
    cheque: round2(totals.cheque),
    account: round2(totals.account),
    non_bank: round2(totals.non_bank),
  };
}

function computeSessionAndOrderTypeBreakdowns(orders: Order[], turnoverIncl: number) {
  let morning = 0;
  let afternoon = 0;
  let evening = 0;

  let eatIn = 0;
  let takeOut = 0;
  let delivery = 0;

  for (const o of orders) {
    const total = Number.isFinite(o.total) ? o.total : 0;
    const dt = new Date(o.paidAt ?? o.createdAt);
    const hour = dt.getHours();

    // 05-11, 11-17, 17-05
    if (hour >= 5 && hour < 11) morning += total;
    else if (hour >= 11 && hour < 17) afternoon += total;
    else evening += total;

    if (o.orderType === 'eat_in') eatIn += total;
    else if (o.orderType === 'take_out') takeOut += total;
    else if (o.orderType === 'delivery') delivery += total;
  }

  const denom = turnoverIncl > 0 ? turnoverIncl : 1;

  const sessions = {
    morning: { recorded: round2(morning), percent: round2((morning / denom) * 100) },
    afternoon: { recorded: round2(afternoon), percent: round2((afternoon / denom) * 100) },
    evening: { recorded: round2(evening), percent: round2((evening / denom) * 100) },
  };

  const orderTypes = {
    eatIn: { value: round2(eatIn), percent: round2((eatIn / denom) * 100) },
    takeOut: { value: round2(takeOut), percent: round2((takeOut / denom) * 100) },
    delivery: { value: round2(delivery), percent: round2((delivery / denom) * 100) },
  };

  return { sessions, orderTypes };
}

function computeSalesMix(orders: Order[], turnoverIncl: number): SalesMixItem[] {
  const map = new Map<string, { name: string; qty: number; sales: number; cost: number }>();

  for (const o of orders) {
    for (const it of o.items ?? []) {
      if (it.isVoided) continue;
      const key = it.menuItemCode || it.menuItemId;
      const qty = Number.isFinite(it.quantity) ? it.quantity : 0;
      const sales = Number.isFinite(it.total) ? it.total : qty * (it.unitPrice ?? 0);
      const cost = qty * (Number.isFinite(it.unitCost) ? it.unitCost : 0);
      if (!key) continue;

      const prev = map.get(key);
      if (!prev) map.set(key, { name: it.menuItemName ?? key, qty, sales, cost });
      else map.set(key, { ...prev, qty: prev.qty + qty, sales: prev.sales + sales, cost: prev.cost + cost });
    }
  }

  const denom = turnoverIncl > 0 ? turnoverIncl : 1;

  return Array.from(map.entries()).map(([code, v]) => {
    const qty = v.qty > 0 ? v.qty : 1;
    const costPerItem = round2(v.cost / qty);
    const sellIncl = round2(v.sales / qty);
    const gpPct = sellIncl > 0 ? round2(((sellIncl - costPerItem) / sellIncl) * 100) : 0;

    return {
      itemNo: Number.isFinite(Number(code)) ? Number(code) : 0,
      itemName: v.name,
      quantity: round2(v.qty),
      costPerItem,
      sellExcl: sellIncl,
      sellIncl,
      gpBeforeDiscount: gpPct,
      gpAfterDiscount: gpPct,
      totalCost: round2(v.cost),
      totalSales: round2(v.sales),
      totalProfit: round2(v.sales - v.cost),
      percentOfTurnover: round2((v.sales / denom) * 100),
    };
  });
}

function computeStaffSales(orders: Order[], turnoverIncl: number): DashboardStaffRow[] {
  const map = new Map<string, { name: string; total: number }>();
  for (const o of orders) {
    const id = o.staffId || o.staffName || 'staff';
    const name = o.staffName || 'Staff';
    const total = Number.isFinite(o.total) ? o.total : 0;
    const prev = map.get(id);
    if (!prev) map.set(id, { name, total });
    else map.set(id, { ...prev, total: prev.total + total });
  }

  return Array.from(map.entries())
    .map(([id, v]) => ({ id, name: v.name, role: 'staff', totalSales: round2(v.total) }))
    .sort((a, b) => b.totalSales - a.totalSales);
}

function computeStockVarianceFromTakes(stockTakes: StockTakeSession[], startDate: string, endDate: string) {
  const inRange = stockTakes
    .filter((s) => s.date >= startDate && s.date <= endDate)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  // Aggregate all variance lines across the selected period so the dashboard
  // reflects the full date range instead of only the latest stock take.
  const aggregated = new Map<string, StockVariance>();
  for (const session of inRange) {
    for (const item of session.variances ?? []) {
      const key = String(item.itemId || item.itemCode || item.id);
      const existing = aggregated.get(key);
      if (!existing) {
        aggregated.set(key, { ...item });
        continue;
      }

      aggregated.set(key, {
        ...existing,
        systemQty: round2(existing.systemQty + item.systemQty),
        physicalQty: round2(existing.physicalQty + item.physicalQty),
        varianceQty: round2(existing.varianceQty + item.varianceQty),
        varianceValue: round2(existing.varianceValue + item.varianceValue),
        timesHadVariance: Number(existing.timesHadVariance ?? 0) + Number(item.timesHadVariance ?? 0),
        countDate: item.countDate || existing.countDate,
      });
    }
  }

  const items = Array.from(aggregated.values());
  const varianceValue = round2(sum(items.map((v) => v.varianceValue)));

  return {
    varianceValue,
    items: items
      .slice()
      .sort((a, b) => Math.abs(b.varianceValue) - Math.abs(a.varianceValue))
      .slice(0, 5),
  };
}

function computeAvgOpenHoursPerDay(orders: Order[], startDate: string, endDate: string) {
  const byDay = new Map<string, { min: number; max: number }>();
  for (const o of orders) {
    const iso = (o.paidAt ?? o.createdAt) as any;
    const key = dateKeyFromIso(iso);
    if (key < startDate || key > endDate) continue;
    const t = Date.parse(String(iso));
    if (!Number.isFinite(t)) continue;
    const prev = byDay.get(key);
    if (!prev) byDay.set(key, { min: t, max: t });
    else byDay.set(key, { min: Math.min(prev.min, t), max: Math.max(prev.max, t) });
  }

  const dayKeys = Array.from(byDay.keys());
  if (!dayKeys.length) return 0;

  const hours = dayKeys.map((k) => {
    const mm = byDay.get(k);
    if (!mm) return 0;
    if (mm.max <= mm.min) return 0;
    return (mm.max - mm.min) / (1000 * 60 * 60);
  });

  const avg = sum(hours) / hours.length;
  return round2(avg);
}

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function dateKeyLocal(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
