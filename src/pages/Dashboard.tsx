import { useCurrency } from '@/contexts/CurrencyContext';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Users, 
  Receipt,
  AlertTriangle,
  Clock,
  ShoppingBag,
  Truck,
  UtensilsCrossed
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { PageHeader, KPICard, DataTableWrapper, NumericCell, StatusBadge } from '@/components/common/PageComponents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { subscribeOrders, getOrdersSnapshot } from '@/lib/orderStore';
import { subscribeGRVs, getGRVsSnapshot, refreshGRVs } from '@/lib/grvDbStore';
import { subscribeExpenses, getExpensesSnapshot, addExpense } from '@/lib/expenseStore';
import { subscribeStockTakes, getStockTakesSnapshot } from '@/lib/stockTakeStore';
import { computeDashboardMetrics, fetchDashboardStatsFromDb } from '@/lib/dashboardMetrics';
import { useAuth } from '@/contexts/AuthContext';
import { useReportSharer } from '@/hooks/useReportSharer';
import { subscribeToRealtimeOrders } from '@/lib/orderStore';
import { subscribeToRealtimeStockItems } from '@/lib/stockStore';
import { subscribeToRealtimeExpenses } from '@/lib/expenseStore';

export default function Dashboard() {
  const { user, brand, accountUser } = useAuth();
  const { formatMoneyPrecise, currencySymbol } = useCurrency();
  const orders = useSyncExternalStore(subscribeOrders, getOrdersSnapshot);
  const grvs = useSyncExternalStore(subscribeGRVs, getGRVsSnapshot);
  const expenses = useSyncExternalStore(subscribeExpenses, getExpensesSnapshot);
  const stockTakes = useSyncExternalStore(subscribeStockTakes, getStockTakesSnapshot);

  const brandId = (user?.brand_id ?? brand?.id ?? '') as string;
  useEffect(() => {
    if (!accountUser) return;
    if (!brandId) return;
    void refreshGRVs(brandId).catch((e) => console.error('Failed to load GRVs', e));

    // Setup realtime subscriptions so KPI cards update instantly when other devices change data.
    const unsubbers: Array<(() => void) | null> = [];
    try {
      const oUnsub = subscribeToRealtimeOrders();
      if (oUnsub) unsubbers.push(oUnsub);
    } catch {}
    try {
      const sUnsub = subscribeToRealtimeStockItems();
      if (sUnsub) unsubbers.push(sUnsub);
    } catch {}
    try {
      const eUnsub = subscribeToRealtimeExpenses();
      if (eUnsub) unsubbers.push(eUnsub);
    } catch {}

    return () => {
      for (const u of unsubbers) {
        try { if (u) u(); } catch {}
      }
    };
  }, [accountUser, brandId]);

  

  const today = useMemo(() => dateKeyLocal(new Date()), []);
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);
  const [dbSnapshot, setDbSnapshot] = useState<any | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const rangeLabel = useMemo(() => {
    if (startDate === endDate && startDate === today) {
      return "Today's reports";
    }
    if (startDate === endDate) {
      return `Report for ${startDate}`;
    }
    return `Reports: ${startDate} → ${endDate}`;
  }, [startDate, endDate, today]);

  // Always fetch DB metrics on mount and when brand/date changes
  const refreshDbMetrics = async () => {
    setIsLoading(true);
    const start = Date.now();
    try {
      const res = await fetchDashboardStatsFromDb(brandId, startDate, endDate);
      if (res) {
        setDbSnapshot(res);
        if (res.last_updated) setLastUpdated(String(res.last_updated));
      }
    } catch (e) {
      console.error('Failed to fetch dashboard stats from DB', e);
    } finally {
      const elapsed = Date.now() - start;
      const minDelay = 600;
      const wait = elapsed < minDelay ? minDelay - elapsed : 0;
      window.setTimeout(() => setIsLoading(false), wait);
    }
  };

  useEffect(() => {
    if (!accountUser || !brandId) return;
    refreshDbMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountUser, brandId, startDate, endDate]);

  // Always compute local metrics for instant feedback
  const metrics = useMemo(() => {
    const safeStart = startDate <= endDate ? startDate : endDate;
    const safeEnd = startDate <= endDate ? endDate : startDate;
    return computeDashboardMetrics({
      startDate: safeStart,
      endDate: safeEnd,
      orders,
      grvs,
      expenses,
      stockTakes,
    });
  }, [startDate, endDate, orders, grvs, expenses, stockTakes]);

  // Keep all displayed metrics firmly bound to selected date range via the local computeDashboardMetrics result.
  const data = useMemo(() => metrics.overview, [metrics.overview]);

  // Unified data state: prefer local metrics for date-range consistency.
  const topSellers = metrics.topSellers;
  const staffRows = metrics.staffRows;
  const topVariances = metrics.varianceItems;
  const lowSeller = metrics.lowSeller;

  const shouldUseDbSnapshot = Boolean(dbSnapshot && dbSnapshot.reportDate === endDate);

  const { shareDailyReport, downloadCsv, downloadDoc, shareViaWhatsApp, downloadMetricCsv } = useReportSharer();

  const paymentBreakdown = useMemo(() => {
    if (shouldUseDbSnapshot && dbSnapshot?.paymentBreakdown && typeof dbSnapshot.paymentBreakdown === 'object') {
      const cashTotal = Number(dbSnapshot.paymentBreakdown.cash || dbSnapshot.paymentBreakdown.cashTotal || 0);
      const cardTotal = Number(dbSnapshot.paymentBreakdown.card || dbSnapshot.paymentBreakdown.cardTotal || 0);
      const chequeTotal = Number(dbSnapshot.paymentBreakdown.cheque || dbSnapshot.paymentBreakdown.chequeTotal || 0);
      const totalPaytypes = Object.values(dbSnapshot.paymentBreakdown).reduce((sum: number, v: any) => sum + Number(v || 0), 0);
      return {
        cashTotal,
        cardTotal,
        chequeTotal,
        totalPaytypes: Number(totalPaytypes),
      };
    }
    return {
      cashTotal: Number(data.cashTotal),
      cardTotal: Number(data.cardTotal),
      chequeTotal: Number(data.chequeTotal),
      totalPaytypes: Number(data.totalPaytypes),
    };
  }, [shouldUseDbSnapshot, dbSnapshot, data]);

  const hoursPerDay = useMemo(() => {
    if (shouldUseDbSnapshot && Array.isArray(dbSnapshot?.hoursPerDay) && dbSnapshot.hoursPerDay.length > 0) {
      const total = dbSnapshot.hoursPerDay.reduce((sum: number, h: any) => sum + Number(h.total || 0), 0);
      return Number((total / dbSnapshot.hoursPerDay.length).toFixed(1));
    }
    return data.hoursPerDay;
  }, [shouldUseDbSnapshot, dbSnapshot, data.hoursPerDay]);

  const cashierShiftsByStaff = shouldUseDbSnapshot && Array.isArray(dbSnapshot?.cashierShiftsByStaff)
    ? dbSnapshot.cashierShiftsByStaff
    : [];

  const cashierShiftCount = shouldUseDbSnapshot ? Number(dbSnapshot?.cashierShiftCount ?? 0) : 0;
  const cashierShiftClosedCount = shouldUseDbSnapshot ? Number(dbSnapshot?.cashierShiftClosedCount ?? 0) : 0;
  const cashierShiftOpeningTotal = shouldUseDbSnapshot ? Number(dbSnapshot?.cashierShiftOpeningTotal ?? 0) : 0;
  const cashierShiftClosingTotal = shouldUseDbSnapshot ? Number(dbSnapshot?.cashierShiftClosingTotal ?? 0) : 0;
  const cashierShiftVarianceTotal = shouldUseDbSnapshot ? Number(dbSnapshot?.cashierShiftVarianceTotal ?? 0) : 0;

  const dashboardReport = useMemo(() => {
    return {
      date: endDate,
      startDate,
      endDate,
      brandName: brand?.name || user?.name || 'Profit Maker POS',
      totals: {
        netSales: Number(data.turnoverExcl || 0),
        grossSales: Number(data.turnoverIncl || 0),
        cogs: Number(data.costOfSales || 0),
        profit: Number(data.grossProfit || 0),
        laborCost: Number(data.expenses || 0),
      },
      topSellingItems: topSellers.slice(0, 20).map((item: any) => ({
        name: item.itemName || item.name || 'N/A',
        quantity: Number(item.quantity || item.qty || 0),
        totalSales: Number(item.totalSales || item.sales || 0),
      })),
      stockVariances: topVariances.slice(0, 20).map((item: any) => ({
        item: item.itemName || 'N/A',
        theoretical: Number(item.varianceQty || 0),
        actual: Number(item.varianceQty || 0),
        uom: 'units',
        cost: Number(item.varianceValue || 0),
      })),
      voids: [],
    };
  }, [endDate, data, topSellers, topVariances]);

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseDate, setExpenseDate] = useState<string>(endDate);
  const [expenseCategory, setExpenseCategory] = useState<string>('utilities');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseDescription, setExpenseDescription] = useState<string>('');

  const totalStaffSales = useMemo(
    () => staffRows.reduce((sum, s) => sum + (Number.isFinite(s.totalSales) ? s.totalSales : 0), 0),
    [staffRows]
  );

  function handleAddExpense() {
    const amount = Number(expenseAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    addExpense({
      date: expenseDate,
      category: expenseCategory as any,
      amount,
      description: expenseDescription,
    });
    setExpenseAmount('');
    setExpenseDescription('');
    setExpenseOpen(false);
  }

  return (
    <div className="p-4 sm:p-6">
      <PageHeader 
        title="Management Overview" 
        description={`Report Date: ${data.reportDate}${data?.drnRange?.from ? ` | DRN: ${data.drnRange.from} → ${data.drnRange.to}` : ''}`}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[220px]">
              <DropdownMenuLabel>Export Options</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => downloadCsv(dashboardReport)}>
                All Metrics (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => downloadDoc(dashboardReport)}>
                All Metrics (DOC)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => shareDailyReport(dashboardReport)}>
                All Metrics (PDF)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => shareViaWhatsApp(dashboardReport)}>
                Share via WhatsApp
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <div className="mb-3 text-sm text-muted-foreground font-medium">{rangeLabel}</div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div
          className="flex items-center gap-4 rounded border border-muted/40 p-2 cursor-pointer"
          onClick={() => {
            fromInputRef.current?.focus();
            fromInputRef.current?.showPicker?.();
          }}
        >
          <div className="grid gap-1">
            <Label className="text-xs">From</Label>
            <Input
              ref={fromInputRef}
              className="h-9"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              onClick={(e) => {
                e.stopPropagation();
                fromInputRef.current?.focus();
                fromInputRef.current?.showPicker?.();
              }}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">To</Label>
            <Input
              ref={toInputRef}
              className="h-9"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              onClick={(e) => {
                e.stopPropagation();
                toInputRef.current?.focus();
                toInputRef.current?.showPicker?.();
              }}
            />
          </div>
        </div>
        <Button variant="outline" onClick={() => {
          setExpenseDate(endDate);
          setExpenseOpen(true);
        }}>
          Add Expense
        </Button>
        {lastUpdated && (
          <div className="text-xs text-muted-foreground">
            Last Updated: {new Date(lastUpdated).toLocaleString()}
          </div>
        )}
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            title: 'Total Turnover (Incl)',
            value: formatMoneyPrecise(data.turnoverIncl, 2),
            rawValue: data.turnoverIncl,
            subtitle: `Excl Tax: ${formatMoneyPrecise(data.turnoverExcl, 2)}`,
            icon: <DollarSign className="h-5 w-5 text-primary" />,
            metricName: 'Total Turnover',
          },
          {
            title: 'Cost of Sales',
            value: formatMoneyPrecise(data.costOfSales, 2),
            rawValue: data.costOfSales,
            subtitle: `${data.costOfSalesPercent.toFixed(2)}% of sales`,
            variant: 'warning',
            icon: <TrendingDown className="h-5 w-5 text-warning" />,
            metricName: 'Cost of Sales',
          },
            {
            title: 'Net Profit',
            value: formatMoneyPrecise(data.netProfit, 2),
            rawValue: data.netProfit,
            subtitle: `Expenses: ${formatMoneyPrecise(data.expenses, 2)}`,
            variant: data.netProfit >= 0 ? 'success' : 'danger',
            icon: <DollarSign className={`h-5 w-5 ${data.netProfit >= 0 ? 'text-success' : 'text-destructive'}`} />,
            metricName: 'Net Profit',
          },
        ].map((kpi) => (
          <div key={kpi.title} className="relative">
            <KPICard
              title={kpi.title}
              value={kpi.value}
              loading={isLoading}
              subtitle={kpi.subtitle}
              variant={kpi.variant as any}
              icon={kpi.icon}
            />
            <button
              className="absolute top-2 right-2 rounded px-2 py-1 text-xs border border-secondary text-secondary hover:bg-secondary/10"
              onClick={() => downloadMetricCsv(kpi.metricName, kpi.rawValue, dashboardReport)}
              title={`Export ${kpi.metricName}`}
            >
              Export
            </button>
          </div>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <KPICard
          title="Invoices"
          value={dbSnapshot?.invoiceCount ?? data.invoiceCount}
          loading={isLoading}
          subtitle={`Avg: ${formatMoneyPrecise(data.avgPerInvoice, 2)}`}
          icon={<Receipt className="h-4 w-4 text-muted-foreground" />}
        />
        <KPICard
          title="Customers"
          value={data.customerCount}
          loading={isLoading}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <KPICard
          title="Tables"
          value={data.tableCount}
          loading={isLoading}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
        <KPICard
          title="Stock Variance"
          value={formatMoneyPrecise(data.stockVarianceValue, 2)}
          icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
        />
        <KPICard
          title="Purchases"
          value={formatMoneyPrecise(data.purchases, 2)}
          icon={<Package className="h-4 w-4 text-muted-foreground" />}
        />
        <KPICard
          title="Hours/Day"
          value={(() => {
            if (dbSnapshot && Array.isArray(dbSnapshot.hoursPerDay) && dbSnapshot.hoursPerDay.length > 0) {
              // Show average sales per hour as a summary
              const total = dbSnapshot.hoursPerDay.reduce((sum: number, h: any) => sum + Number(h.total || 0), 0);
              return (total / dbSnapshot.hoursPerDay.length).toFixed(1);
            }
            return data.hoursPerDay.toFixed(1);
          })()}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
        <KPICard
          title="Shift Closed"
          value={Number(dbSnapshot?.cashierShiftClosedCount ?? 0)}
          loading={isLoading}
          subtitle={`Total shifts: ${Number(dbSnapshot?.cashierShiftCount ?? 0)}`}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <KPICard
          title="Open Shifts"
          value={
            Number(dbSnapshot?.cashierShiftCount ?? 0) - Number(dbSnapshot?.cashierShiftClosedCount ?? 0)
          }
          loading={isLoading}
          subtitle="Open shifts currently"
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
        <KPICard
          title="Cashier Overage/Short"
          value={formatMoneyPrecise(Number(dbSnapshot?.cashierShiftVarianceTotal ?? 0), 2)}
          loading={isLoading}
          subtitle={`Opening: ${formatMoneyPrecise(Number(dbSnapshot?.cashierShiftOpeningTotal ?? 0), 2)} · Closing: ${formatMoneyPrecise(Number(dbSnapshot?.cashierShiftClosingTotal ?? 0), 2)}`}
          variant={Number(dbSnapshot?.cashierShiftVarianceTotal ?? 0) >= 0 ? 'success' : 'danger'}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <Card className="mthunzi-card mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Cashier Shift Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {Array.isArray(dbSnapshot?.cashierShiftsByStaff) && dbSnapshot.cashierShiftsByStaff.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-white/10">
                    <TableHead>Cashier</TableHead>
                    <TableHead className="text-right">Shifts</TableHead>
                    <TableHead className="text-right">Opening Cash</TableHead>
                    <TableHead className="text-right">Closing Cash</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dbSnapshot.cashierShiftsByStaff.map((item: any) => (
                    <TableRow key={item.staff_id} className="border-b-white/10">
                      <TableCell className="font-medium">{item.staff_name}</TableCell>
                      <TableCell className="text-right">{Number(item.shifts || 0)}</TableCell>
                      <TableCell className="text-right">{formatMoneyPrecise(Number(item.opening_cash || 0), 2)}</TableCell>
                      <TableCell className="text-right">{formatMoneyPrecise(Number(item.closing_cash || 0), 2)}</TableCell>
                      <TableCell className="text-right">{formatMoneyPrecise(Number(item.total_variance || 0), 2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-muted-foreground">
              No closed cashier shifts found for this period.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Payment Breakdown */}
        <Card className="mthunzi-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Payment Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {typeof paymentBreakdown.totalPaytypes === 'number' && paymentBreakdown.totalPaytypes > 0 ? (
              <>
                <div className="flex justify-between text-sm">
                  <span>Cash</span>
                  <span className="font-medium">{formatMoneyPrecise(Number(paymentBreakdown.cashTotal), 2)}</span>
                </div>
                <Progress value={(Number(paymentBreakdown.cashTotal) / Number(paymentBreakdown.totalPaytypes)) * 100} className="h-2" />

                <div className="flex justify-between text-sm">
                  <span>Credit Card</span>
                  <span className="font-medium">{formatMoneyPrecise(Number(paymentBreakdown.cardTotal), 2)}</span>
                </div>
                <Progress value={(Number(paymentBreakdown.cardTotal) / Number(paymentBreakdown.totalPaytypes)) * 100} className="h-2" />

                <div className="flex justify-between text-sm">
                  <span>Cheque</span>
                  <span className="font-medium">{formatMoneyPrecise(Number(paymentBreakdown.chequeTotal), 2)}</span>
                </div>
                <Progress value={(Number(paymentBreakdown.chequeTotal) / Number(paymentBreakdown.totalPaytypes)) * 100} className="h-2" />

                <div className="border-t pt-3 mt-3 flex justify-between font-medium">
                  <span>Total Paytypes</span>
                  <span>{formatMoneyPrecise(Number(paymentBreakdown.totalPaytypes), 2)}</span>
                </div>
              </>
            ) : (
              <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-muted-foreground">
                No payments recorded for this period.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Types */}
        <Card className="mthunzi-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Order Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              // Use DB snapshot if available, else fallback to local
              let eatIn = { value: 0, percent: 0 };
              let takeOut = { value: 0, percent: 0 };
              let delivery = { value: 0, percent: 0 };
              if (dbSnapshot && dbSnapshot.order_types) {
                const ot = dbSnapshot.order_types;
                const total =
                  Number(ot.eat_in || 0) + Number(ot.take_out || 0) + Number(ot.delivery || 0);
                eatIn.value = Number(ot.eat_in || 0);
                takeOut.value = Number(ot.take_out || 0);
                delivery.value = Number(ot.delivery || 0);
                eatIn.percent = total > 0 ? Number(((eatIn.value / total) * 100).toFixed(1)) : 0;
                takeOut.percent = total > 0 ? Number(((takeOut.value / total) * 100).toFixed(1)) : 0;
                delivery.percent = total > 0 ? Number(((delivery.value / total) * 100).toFixed(1)) : 0;
              } else if (data.orderTypes) {
                eatIn = data.orderTypes.eatIn;
                takeOut = data.orderTypes.takeOut;
                delivery = data.orderTypes.delivery;
              }
              return (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Eat-In</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{formatMoneyPrecise(eatIn.value, 2)}</span>
                      <span className="text-xs text-muted-foreground ml-2">({eatIn.percent}%)</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Take-Out</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{formatMoneyPrecise(takeOut.value, 2)}</span>
                      <span className="text-xs text-muted-foreground ml-2">({takeOut.percent}%)</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Delivery</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{formatMoneyPrecise(delivery.value, 2)}</span>
                      <span className="text-xs text-muted-foreground ml-2">({delivery.percent}%)</span>
                    </div>
                  </div>
                </>
              );
            })()}

            <div className="border-t pt-3 mt-3">
              <p className="text-sm font-medium mb-2">Session Breakdown</p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-primary/10 rounded p-2">
                  <p className="font-medium">05h-11h</p>
                  <p className="text-muted-foreground">{data.sessions.morning.percent}%</p>
                </div>
                <div className="bg-primary/10 rounded p-2">
                  <p className="font-medium">11h-17h</p>
                  <p className="text-muted-foreground">{data.sessions.afternoon.percent}%</p>
                </div>
                <div className="bg-primary/10 rounded p-2">
                  <p className="font-medium">17h-05h</p>
                  <p className="text-muted-foreground">{data.sessions.evening.percent}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Stock Variances Alert */}
        <Card className="mthunzi-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Stock Variance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTableWrapper>
              <Table>
                <TableHeader>
                  <TableRow className="border-b-white/10">
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Variance Qty</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <TableRow key={`variance-loading-${idx}`} className="border-b-white/10 animate-pulse">
                        <TableCell className="font-medium"><div className="h-4 w-24 bg-muted/20 rounded" /></TableCell>
                        <TableCell className="text-right"><div className="h-4 w-10 bg-muted/20 rounded ml-auto" /></TableCell>
                        <TableCell className="text-right"><div className="h-4 w-16 bg-muted/20 rounded ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : topVariances.length ? (
                    topVariances.map((item) => (
                      <TableRow key={item.id} className="border-b-white/10">
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell className="text-right">
                          <NumericCell value={item.varianceQty} showSign colorCode />
                        </TableCell>
                        <TableCell className="text-right">
                          <NumericCell value={item.varianceValue} money showSign colorCode />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="border-b-white/10">
                      <TableCell colSpan={3} className="text-sm text-muted-foreground">
                        No stock take saved for this period.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </DataTableWrapper>
          </CardContent>
        </Card>

        {/* Top Sellers */}
        <Card className="mthunzi-card">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-base font-medium">Top Selling Items</CardTitle>
              {lowSeller && !isLoading && (
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                    <TrendingDown className="h-3.5 w-3.5" />
                    <span>Low selling</span>
                  </div>
                  <div className="text-sm font-medium leading-tight max-w-[240px] truncate">
                    {lowSeller.itemName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Qty {lowSeller.quantity} · {formatMoneyPrecise(lowSeller.totalSales, 0)}
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <DataTableWrapper>
              <Table>
                <TableHeader>
                  <TableRow className="border-b-white/10">
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">GP%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    // Loading skeleton rows
                    Array.from({ length: 5 }).map((_, idx) => (
                      <TableRow key={`skeleton-top-seller-${idx}`} className="border-b-white/10 animate-pulse">
                        <TableCell className="font-medium">
                          <div className="h-4 w-24 bg-muted/20 rounded" />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="h-4 w-10 bg-muted/20 rounded ml-auto" />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="h-4 w-16 bg-muted/20 rounded ml-auto" />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="h-4 w-10 bg-muted/20 rounded ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <>
                      {topSellers.map((item, idx) => (
                        <TableRow key={`${item.itemName}-${idx}`} className="border-b-white/10">
                          <TableCell className="font-medium">{item.itemName}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            <NumericCell value={item.totalSales} money />
                          </TableCell>
                          <TableCell className="text-right">
                            <StatusBadge status={item.gpAfterDiscount >= 45 ? 'positive' : item.gpAfterDiscount >= 35 ? 'neutral' : 'negative'}>
                              {item.gpAfterDiscount.toFixed(1)}%
                            </StatusBadge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!topSellers.length && (
                        <TableRow className="border-b-white/10">
                          <TableCell colSpan={4} className="text-sm text-muted-foreground">
                            No paid orders in this period.
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </DataTableWrapper>
          </CardContent>
        </Card>
      </div>

      {/* Staff Performance */}
      <Card className="mthunzi-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Staff Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTableWrapper>
            <Table>
              <TableHeader>
                <TableRow className="border-b-white/10">
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Total Sales</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={`skeleton-staff-${idx}`} className="border-b-white/10 animate-pulse">
                      <TableCell className="font-medium">
                        <div className="h-4 w-24 bg-muted/20 rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-16 bg-muted/20 rounded" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="h-4 w-16 bg-muted/20 rounded ml-auto" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="h-4 w-10 bg-muted/20 rounded ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <>
                    {staffRows.map((member) => {
                      const percent = totalStaffSales > 0 ? (member.totalSales / totalStaffSales) * 100 : 0;
                      return (
                        <TableRow key={member.id} className="border-b-white/10">
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell className="capitalize">{member.role ? member.role.replace('_', ' ') : ''}</TableCell>
                          <TableCell className="text-right">
                            <NumericCell value={member.totalSales} money />
                          </TableCell>
                          <TableCell className="text-right">
                            <NumericCell value={percent} decimals={1} />%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!staffRows.length && (
                      <TableRow className="border-b-white/10">
                        <TableCell colSpan={4} className="text-sm text-muted-foreground">
                          No staff sales yet for this period.
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </DataTableWrapper>
        </CardContent>
      </Card>

      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Date</Label>
              <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="salaries">Salaries</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="fuel">Fuel</SelectItem>
                  <SelectItem value="repairs">Repairs</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Amount ({currencySymbol})</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0.00"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Description (optional)</Label>
              <Input value={expenseDescription} onChange={(e) => setExpenseDescription(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddExpense} disabled={!Number.isFinite(Number(expenseAmount)) || Number(expenseAmount) <= 0}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function dateKeyLocal(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
