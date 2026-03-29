import React, { useMemo, useState } from 'react';
import { Save, Check, Filter } from 'lucide-react';
import { PageHeader, DataTableWrapper, NumericCell } from '@/components/common/PageComponents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCategoriesSnapshot, subscribeCategories } from '@/lib/categoriesStore';
import { DepartmentId } from '@/types';
import { getStockItemsSnapshot, subscribeStockItems } from '@/lib/stockStore';
import { getStockTakesSnapshot, recordStockTake, subscribeStockTakes } from '@/lib/stockTakeStore';
import { toast } from '@/hooks/use-toast';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useSyncExternalStore } from 'react';

export default function StockTake() {
  const { formatMoneyPrecise } = useCurrency();
  const stockItems = useSyncExternalStore(subscribeStockItems, getStockItemsSnapshot);
  const stockTakes = useSyncExternalStore(subscribeStockTakes, getStockTakesSnapshot);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const categoriesSnapshot = useSyncExternalStore(subscribeCategories, getCategoriesSnapshot);
  const categories = categoriesSnapshot.categories;
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, string>>({});
  const [isStockTakeMode, setIsStockTakeMode] = useState(false);

  const latestSession = stockTakes[0] ?? null;
  const variances = latestSession?.variances ?? [];

  const filteredItems = stockItems.filter((item) => {
    return selectedCategory === 'all' || item.departmentId === selectedCategory;
  });

  const getCategoryName = (deptId: DepartmentId) => {
    return categories.find(d => d.id === deptId)?.name || deptId;
  };

  const handleCountChange = (itemId: string, value: string) => {
    setPhysicalCounts((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const calculateVariance = (itemId: string, systemQty: number) => {
    const physical = parseFloat(physicalCounts[itemId] || '');
    if (isNaN(physical)) return null;
    return physical - systemQty;
  };

  const parsedPhysicalCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(physicalCounts)) {
      const n = parseFloat(v);
      if (Number.isFinite(n)) out[k] = n;
    }
    return out;
  }, [physicalCounts]);

  const canSave = isStockTakeMode && Object.keys(parsedPhysicalCounts).length > 0;

  // Calculate totals for variance summary
  const totalPositiveVariance = variances
    .filter(v => v.varianceValue > 0)
    .reduce((sum, v) => sum + v.varianceValue, 0);

  const totalNegativeVariance = variances
    .filter(v => v.varianceValue < 0)
    .reduce((sum, v) => sum + v.varianceValue, 0);

  const netVariance = variances.reduce((sum, v) => sum + v.varianceValue, 0);

  function csvEscape(val: any) {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function downloadSessionCsv(session: any) {
    const headers = [
      'Item Code','Item Name','Category','Unit','System Qty','Physical Qty','Variance Qty','Variance Value','Lowest','Highest','Current Cost','Count Date'
    ];

    const rows = session.variances.map((v: any) => [
      v.itemCode, v.itemName, getCategoryName(v.departmentId), v.unitType, v.systemQty, v.physicalQty, v.varianceQty, v.varianceValue, v.lowestCost, v.highestCost, v.currentCost, v.countDate
    ]);

    const meta = [
      [`Session ID: ${session.id}`],
      [`Date: ${session.date}`],
      [`Created By: ${session.createdBy}`],
      []
    ];

    const lines: string[] = [];
    for (const m of meta) {
      lines.push(m.map(csvEscape).join(','));
    }
    lines.push(headers.map(csvEscape).join(','));
    for (const r of rows) {
      lines.push(r.map(csvEscape).join(','));
    }

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeDate = session.date.replace(/[^0-9A-Za-z-]/g, '');
    a.download = `stock-take-${safeDate}-${session.id}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function startStockTake() {
    setIsStockTakeMode(true);
    setPhysicalCounts({});
  }

  function cancelStockTake() {
    setIsStockTakeMode(false);
    setPhysicalCounts({});
  }

  async function saveStockTake() {
    if (!canSave) return;
    try {
      const session = await recordStockTake({
        date: dateKeyLocal(new Date()),
        departmentId: (selectedCategory === 'all' ? 'all' : (selectedCategory as DepartmentId)),
        physicalCounts: parsedPhysicalCounts,
        createdBy: 'System',
        applyAdjustmentsToStock: true,
      });
      toast({ title: 'Stock take saved', description: `${session.variances.length} variances recorded` });
    } catch (err) {
      toast({ title: 'Save failed', description: (err as any)?.message ?? 'Please try again', variant: 'destructive' });
    } finally {
      setIsStockTakeMode(false);
      setPhysicalCounts({});
    }
  }

  return (
    <div>
      <PageHeader
        title="Stock Take"
        description={
          latestSession
            ? `Latest saved: ${latestSession.date} • Variance: ${formatMoneyPrecise(netVariance, 2)}`
            : 'Perform physical stock counts and generate variance reports'
        }
        actions={
          <div className="flex gap-2">
            {isStockTakeMode ? (
              <>
                <Button variant="outline" onClick={cancelStockTake}>
                  Cancel
                </Button>
                <Button onClick={saveStockTake} disabled={!canSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Stock Take
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                {latestSession && (
                  <Button variant="outline" onClick={() => downloadSessionCsv(latestSession)}>
                    Export
                  </Button>
                )}
                <Button onClick={startStockTake}>
                <Check className="h-4 w-4 mr-2" />
                Start Stock Take
                </Button>
              </div>
            )}
          </div>
        }
      />

      {!isStockTakeMode && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Positive Variance (Surplus)
              </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold text-success">
                {formatMoneyPrecise(totalPositiveVariance, 2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Negative Variance (Shortage)
              </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold text-destructive">
                {formatMoneyPrecise(Math.abs(totalNegativeVariance), 2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net Variance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${netVariance >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatMoneyPrecise(netVariance, 2)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Previous takes history */}
      {!isStockTakeMode && stockTakes.length > 1 && (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Previous Stock Takes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stockTakes.slice(1).map((s) => (
              <Card key={s.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{s.date}</div>
                      <div className="text-xs text-muted-foreground">By {s.createdBy} • {s.variances.length} items</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => downloadSessionCsv(s)}>
                        Export
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toast({ title: 'Selected', description: 'Preview not implemented' })}>
                        View
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                              <div className="text-sm text-muted-foreground">Category: {s.departmentId === 'all' ? 'All' : getCategoryName(s.departmentId)}</div>
                  <div className="text-sm mt-2">Variances: {s.variances.filter((v:any)=>v.varianceQty!==0).length}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[250px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isStockTakeMode ? (
        <DataTableWrapper>
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="w-[60px]">Unit</TableHead>
                <TableHead className="text-right">System Qty</TableHead>
                <TableHead className="w-[150px]">Physical Count</TableHead>
                <TableHead className="text-right">Variance Qty</TableHead>
                <TableHead className="text-right">Variance Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const variance = calculateVariance(item.id, item.currentStock);
                const varianceValue = variance !== null ? variance * item.currentCost : null;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.code}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-xs">{getCategoryName(item.departmentId)}</TableCell>
                    <TableCell className="text-xs">{item.unitType}</TableCell>
                    <TableCell className="text-right">
                      <NumericCell value={item.currentStock} />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Count..."
                        className="h-8"
                        value={physicalCounts[item.id] || ''}
                        onChange={(e) => handleCountChange(item.id, e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {variance !== null ? (
                        <NumericCell value={variance} showSign colorCode />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {varianceValue !== null ? (
                        <NumericCell value={varianceValue} money showSign colorCode />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableWrapper>
      ) : (
        <div className="space-y-6">
          {variances.length === 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">No variance report yet</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Start a stock take, enter physical counts, then click “Save Stock Take”.
                </p>
              </CardContent>
            </Card>
          ) : (
            categories.map((dept) => {
              const deptVariances = variances.filter(v => v.departmentId === dept.id);
              if (deptVariances.length === 0) return null;

              const deptTotal = deptVariances.reduce((sum, v) => sum + v.varianceValue, 0);

              return (
                <Card key={dept.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{dept.name}</CardTitle>
                      <span className={`font-medium ${deptTotal >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatMoneyPrecise(deptTotal, 2)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <DataTableWrapper className="border-0 rounded-none">
                      <Table className="data-table">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="w-[60px]">Unit</TableHead>
                            <TableHead className="text-right">Lowest</TableHead>
                            <TableHead className="text-right">Highest</TableHead>
                            <TableHead className="text-right">Current</TableHead>
                            <TableHead className="text-right">Times</TableHead>
                            <TableHead className="text-right">Var Qty</TableHead>
                            <TableHead className="text-right">Var Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deptVariances.map((v) => (
                            <TableRow key={v.id}>
                              <TableCell className="font-mono">{v.itemCode}</TableCell>
                              <TableCell className="font-medium">{v.itemName}</TableCell>
                              <TableCell className="text-xs">{v.unitType}</TableCell>
                              <TableCell className="text-right">
                                <NumericCell value={v.lowestCost} />
                              </TableCell>
                              <TableCell className="text-right">
                                <NumericCell value={v.highestCost} />
                              </TableCell>
                              <TableCell className="text-right">
                                <NumericCell value={v.currentCost} />
                              </TableCell>
                              <TableCell className="text-right">{v.timesHadVariance}</TableCell>
                              <TableCell className="text-right">
                                <NumericCell value={v.varianceQty} showSign colorCode />
                              </TableCell>
                              <TableCell className="text-right">
                                <NumericCell value={v.varianceValue} money showSign colorCode />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </DataTableWrapper>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function dateKeyLocal(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
