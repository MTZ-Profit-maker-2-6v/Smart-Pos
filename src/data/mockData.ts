import { 
  Department, 
  StockItem, 
  StockIssue, 
  StockVariance, 
  Recipe, 
  BatchProduction,
  GRV,
  Staff,
  CashUp,
  MenuItem,
  ManagementOverview,
  SalesMixItem,
  Supplier
} from '@/types';

// Departments from the reports
export const departments: Department[] = [
  { id: 'meat', name: 'MEAT', code: '1' },
  { id: 'veg_fruit', name: 'VEG AND FRUIT', code: '2' },
  { id: 'bakery', name: 'BAKERY', code: '3' },
  { id: 'condiments', name: 'CONDIMENTS', code: '4' },
  { id: 'dairy_dips', name: 'DAIRY AND DIPS', code: '5' },
  { id: 'dry_goods', name: 'DRY GOODS', code: '6' },
  { id: 'hot_beverages', name: 'HOT BEVERAGES', code: '7' },
  { id: 'packaging', name: 'PACKAGING', code: '8' },
  { id: 'sauces', name: 'SAUCES', code: '9' },
  { id: 'spices', name: 'SPICES', code: '10' },
  { id: 'cold_beverages', name: 'COLD BEVERAGES', code: '11' },
  { id: 'groceries', name: 'GROCERIES', code: '12' },
];

// Backwards-compatible alias: prefer `categories` in new UI
export const categories = departments;

// Stock Items from reports
export const stockItems: StockItem[] = [
  // MEAT
  { id: '1', code: '136', name: 'Beef Steak', departmentId: 'meat', unitType: 'KG', lowestCost: 180, highestCost: 180, currentCost: 180, currentStock: 12.5 },
  { id: '2', code: '7', name: 'Burger mince', departmentId: 'meat', unitType: 'KG', lowestCost: 160, highestCost: 160, currentCost: 160, currentStock: 8.3 },
  { id: '3', code: '2', name: 'Chicken breasts', departmentId: 'meat', unitType: 'KG', lowestCost: 155, highestCost: 155, currentCost: 155, currentStock: 6.3 },
  { id: '4', code: '46', name: 'Chicken Cubes', departmentId: 'meat', unitType: 'KG', lowestCost: 229.14, highestCost: 229.14, currentCost: 229.14, currentStock: 4.2 },
  { id: '5', code: '5', name: 'Macon', departmentId: 'meat', unitType: 'KG', lowestCost: 180, highestCost: 180, currentCost: 180, currentStock: 3.5 },
  { id: '6', code: '4003', name: 'Chicken whole', departmentId: 'meat', unitType: 'EACH', lowestCost: 134.15, highestCost: 134.15, currentCost: 134.15, currentStock: 36 },
  { id: '7', code: '4152', name: 'Fish', departmentId: 'meat', unitType: 'KG', lowestCost: 63, highestCost: 63, currentCost: 63, currentStock: 10 },
  
  // VEG AND FRUIT
  { id: '10', code: '503', name: 'Eggs', departmentId: 'veg_fruit', unitType: 'EACH', lowestCost: 3.33, highestCost: 3.33, currentCost: 3.33, currentStock: 33.25 },
  { id: '11', code: '32', name: 'Fresh cucumber', departmentId: 'veg_fruit', unitType: 'KG', lowestCost: 44.78, highestCost: 44.78, currentCost: 44.78, currentStock: 3.3 },
  { id: '12', code: '89', name: 'Rape Vegetables', departmentId: 'veg_fruit', unitType: 'KG', lowestCost: 23.50, highestCost: 23.50, currentCost: 23.50, currentStock: 4.27 },
  { id: '13', code: '108', name: 'Tomato', departmentId: 'veg_fruit', unitType: 'KG', lowestCost: 22.03, highestCost: 22.03, currentCost: 22.03, currentStock: 1.89 },
  { id: '14', code: '107', name: 'Lettuce', departmentId: 'veg_fruit', unitType: 'KG', lowestCost: 59, highestCost: 59, currentCost: 59, currentStock: 1.78 },
  { id: '15', code: '114', name: 'Fresh chilli', departmentId: 'veg_fruit', unitType: 'KG', lowestCost: 20, highestCost: 20, currentCost: 20, currentStock: 1.38 },
  { id: '16', code: '115', name: 'Red onions', departmentId: 'veg_fruit', unitType: 'KG', lowestCost: 33.76, highestCost: 33.76, currentCost: 33.76, currentStock: 3.19 },
  { id: '17', code: '113', name: 'Carrots', departmentId: 'veg_fruit', unitType: 'KG', lowestCost: 139.50, highestCost: 139.57, currentCost: 139.50, currentStock: 1.54 },
  { id: '18', code: '112', name: 'Cabbage', departmentId: 'veg_fruit', unitType: 'KG', lowestCost: 7.82, highestCost: 7.82, currentCost: 7.82, currentStock: 2.9 },
  
  // BAKERY
  { id: '20', code: '517', name: 'White Bread Flour', departmentId: 'bakery', unitType: 'KG', lowestCost: 17.80, highestCost: 17.80, currentCost: 17.80, currentStock: 111.58 },
  { id: '21', code: '142', name: 'White flour premixed', departmentId: 'bakery', unitType: 'KG', lowestCost: 18, highestCost: 18, currentCost: 18, currentStock: 268.13 },
  { id: '22', code: '506', name: 'Yeast', departmentId: 'bakery', unitType: 'KG', lowestCost: 94.50, highestCost: 94.50, currentCost: 94.50, currentStock: 3.30 },
  { id: '23', code: '216', name: 'Bakels Premix 5%', departmentId: 'bakery', unitType: 'KG', lowestCost: 50.87, highestCost: 50.87, currentCost: 50.87, currentStock: 4.85 },
  { id: '24', code: '508', name: 'Icing sugar', departmentId: 'bakery', unitType: 'KG', lowestCost: 53.18, highestCost: 62.56, currentCost: 53.18, currentStock: 1.35 },
  { id: '25', code: '168', name: 'Madeira Cake Mix', departmentId: 'bakery', unitType: 'KG', lowestCost: 99.19, highestCost: 99.19, currentCost: 99.19, currentStock: 1 },
  { id: '26', code: '143', name: 'Hypuff', departmentId: 'bakery', unitType: 'KG', lowestCost: 201.60, highestCost: 201.60, currentCost: 201.60, currentStock: 2.95 },
  
  // DAIRY AND DIPS
  { id: '30', code: '404', name: 'Mozarella', departmentId: 'dairy_dips', unitType: 'KG', lowestCost: 482.67, highestCost: 482.67, currentCost: 482.67, currentStock: 1.29 },
  { id: '31', code: '407', name: 'Milk', departmentId: 'dairy_dips', unitType: 'LTRS', lowestCost: 40, highestCost: 40, currentCost: 40, currentStock: 3.77 },
  { id: '32', code: '406', name: 'Soft serve', departmentId: 'dairy_dips', unitType: 'KG', lowestCost: 35.21, highestCost: 35.21, currentCost: 35.21, currentStock: 21.99 },
  { id: '33', code: '280', name: 'Fino Whip', departmentId: 'dairy_dips', unitType: 'LTRS', lowestCost: 124.78, highestCost: 124.78, currentCost: 124.78, currentStock: 1.70 },
  { id: '34', code: '102', name: 'Chips', departmentId: 'dairy_dips', unitType: 'KG', lowestCost: 60, highestCost: 60, currentCost: 60, currentStock: 15.2 },
  
  // COLD BEVERAGES
  { id: '40', code: '1206', name: 'Coke 500Ml', departmentId: 'cold_beverages', unitType: 'EACH', lowestCost: 8.98, highestCost: 8.98, currentCost: 8.98, currentStock: 4 },
  { id: '41', code: '1209', name: 'Fanta Orange 500ml', departmentId: 'cold_beverages', unitType: 'EACH', lowestCost: 8.98, highestCost: 8.98, currentCost: 8.98, currentStock: 20 },
  { id: '42', code: '286', name: 'Fresh Up 500 ml', departmentId: 'cold_beverages', unitType: 'EACH', lowestCost: 6.47, highestCost: 6.47, currentCost: 6.47, currentStock: 31 },
  { id: '43', code: '189', name: 'Vatra 750 ml', departmentId: 'cold_beverages', unitType: 'EACH', lowestCost: 4.10, highestCost: 4.10, currentCost: 4.10, currentStock: 30 },
  { id: '44', code: '276', name: 'Wild Cat 500 ml', departmentId: 'cold_beverages', unitType: 'EACH', lowestCost: 7.54, highestCost: 7.54, currentCost: 7.54, currentStock: 12 },
  
  // PACKAGING
  { id: '50', code: '940', name: 'Premium Bread Bag', departmentId: 'packaging', unitType: 'EACH', lowestCost: 0.68, highestCost: 0.68, currentCost: 0.68, currentStock: 534 },
  { id: '51', code: '1223', name: 'Budget Bread Bags', departmentId: 'packaging', unitType: 'EACH', lowestCost: 0.63, highestCost: 0.63, currentCost: 0.63, currentStock: 514 },
  { id: '52', code: '805', name: 'Serviettes', departmentId: 'packaging', unitType: 'EACH', lowestCost: 0.22, highestCost: 0.22, currentCost: 0.22, currentStock: 836 },
  { id: '53', code: '944', name: 'Fomo tray', departmentId: 'packaging', unitType: 'EACH', lowestCost: 0.80, highestCost: 0.80, currentCost: 0.80, currentStock: 118 },
  { id: '54', code: '942', name: 'Bravo Carrier Bag', departmentId: 'packaging', unitType: 'EACH', lowestCost: 2.00, highestCost: 2.00, currentCost: 2.00, currentStock: 139 },
  
  // SAUCES
  { id: '60', code: '1003', name: 'Mayonaise', departmentId: 'sauces', unitType: 'LTRS', lowestCost: 102.78, highestCost: 102.78, currentCost: 102.78, currentStock: 0.19 },
  { id: '61', code: '304', name: 'Lemon juice', departmentId: 'condiments', unitType: 'LTRS', lowestCost: 108.60, highestCost: 108.60, currentCost: 108.60, currentStock: 1.88 },
  
  // GROCERIES
  { id: '70', code: '802', name: 'Cooking oil', departmentId: 'groceries', unitType: 'LTRS', lowestCost: 56.08, highestCost: 56.08, currentCost: 56.08, currentStock: 0.20 },
  { id: '71', code: '804', name: 'Pan Release', departmentId: 'groceries', unitType: 'LTRS', lowestCost: 31.50, highestCost: 31.50, currentCost: 31.50, currentStock: 4 },
  { id: '72', code: '512', name: 'Sugar', departmentId: 'dry_goods', unitType: 'KG', lowestCost: 34.12, highestCost: 34.12, currentCost: 34.12, currentStock: 3.26 },
  
  // HOT BEVERAGES
  { id: '80', code: '603', name: 'Coffee beans', departmentId: 'hot_beverages', unitType: 'KG', lowestCost: 218.97, highestCost: 218.97, currentCost: 218.97, currentStock: 0.42 },
  
  // SPICES
  { id: '90', code: '1102', name: 'Salt', departmentId: 'spices', unitType: 'KG', lowestCost: 9.96, highestCost: 9.96, currentCost: 9.96, currentStock: 0.72 },
];

// Stock Issues from report
export const stockIssues: StockIssue[] = [
  { id: '1', issueNo: 233, date: '2025-12-30', originItemCode: '4503', destinationItemCode: '503', wasQty: 40, issuedQty: 30, nowQty: 10, value: -100, createdBy: 'John K Mumba' },
  { id: '2', issueNo: 233, date: '2025-12-30', originItemCode: '4407', destinationItemCode: '407', wasQty: 5, issuedQty: 2.5, nowQty: 2.5, value: -100, createdBy: 'John K Mumba' },
  { id: '3', issueNo: 233, date: '2025-12-30', originItemCode: '4404', destinationItemCode: '404', wasQty: 1.5, issuedQty: 1.5, nowQty: 0, value: -724, createdBy: 'John K Mumba' },
  { id: '4', issueNo: 235, date: '2025-12-31', originItemCode: '4517', destinationItemCode: '517', wasQty: 2000, issuedQty: 100, nowQty: 1900, value: -1780, createdBy: 'John K Mumba' },
  { id: '5', issueNo: 235, date: '2025-12-31', originItemCode: '4142', destinationItemCode: '142', wasQty: 3530, issuedQty: 150, nowQty: 3380, value: -2700, createdBy: 'John K Mumba' },
  { id: '6', issueNo: 235, date: '2025-12-31', originItemCode: '4506', destinationItemCode: '506', wasQty: 71, issuedQty: 3, nowQty: 68, value: -283.50, createdBy: 'John K Mumba' },
  { id: '7', issueNo: 235, date: '2025-12-31', originItemCode: '4003', destinationItemCode: '3', wasQty: 40, issuedQty: 4, nowQty: 36, value: -536.58, createdBy: 'John K Mumba' },
  { id: '8', issueNo: 235, date: '2025-12-31', originItemCode: '4152', destinationItemCode: '152', wasQty: 20, issuedQty: 10, nowQty: 10, value: -630, createdBy: 'John K Mumba' },
];

// Stock Variance from report
export const stockVariances: StockVariance[] = [
  { id: '1', itemId: '1', itemCode: '136', itemName: 'Beef Steak', departmentId: 'meat', unitType: 'KG', lowestCost: 180, highestCost: 180, currentCost: 180, systemQty: 10.26, physicalQty: 12.5, varianceQty: 2.24, varianceValue: 404.10, countDate: '2025-12-30', timesHadVariance: 1 },
  { id: '2', itemId: '2', itemCode: '7', itemName: 'Burger mince', departmentId: 'meat', unitType: 'KG', lowestCost: 160, highestCost: 160, currentCost: 160, systemQty: 7.03, physicalQty: 8.3, varianceQty: 1.27, varianceValue: 202.56, countDate: '2025-12-30', timesHadVariance: 1 },
  { id: '3', itemId: '3', itemCode: '2', itemName: 'Chicken breasts', departmentId: 'meat', unitType: 'KG', lowestCost: 155, highestCost: 155, currentCost: 155, systemQty: 6.6, physicalQty: 6.3, varianceQty: -0.30, varianceValue: -47.14, countDate: '2025-12-30', timesHadVariance: 1 },
  { id: '4', itemId: '10', itemCode: '503', itemName: 'Eggs', departmentId: 'veg_fruit', unitType: 'EACH', lowestCost: 3.33, highestCost: 3.33, currentCost: 3.33, systemQty: 36.4, physicalQty: 33.25, varianceQty: -3.15, varianceValue: -10.50, countDate: '2025-12-30', timesHadVariance: 1 },
  { id: '5', itemId: '20', itemCode: '517', itemName: 'White Bread Flour', departmentId: 'bakery', unitType: 'KG', lowestCost: 17.80, highestCost: 17.80, currentCost: 17.80, systemQty: 114.21, physicalQty: 111.58, varianceQty: -2.63, varianceValue: -46.85, countDate: '2025-12-30', timesHadVariance: 1 },
  { id: '6', itemId: '30', itemCode: '404', itemName: 'Mozarella', departmentId: 'dairy_dips', unitType: 'KG', lowestCost: 482.67, highestCost: 482.67, currentCost: 482.67, systemQty: 1.52, physicalQty: 1.29, varianceQty: -0.23, varianceValue: -112.94, countDate: '2025-12-30', timesHadVariance: 1 },
];

// Recipes
export const recipes: Recipe[] = [
  {
    id: '1',
    parentItemId: 'bread-premium',
    parentItemCode: '1002',
    parentItemName: 'Bravo Premium Bread',
    outputQty: 1,
    outputUnitType: 'EACH',
    ingredients: [
      { id: '1', ingredientId: '20', ingredientCode: '517', ingredientName: 'White Bread Flour', requiredQty: 0.5, unitType: 'KG', unitCost: 17.80 },
      { id: '2', ingredientId: '22', ingredientCode: '506', ingredientName: 'Yeast', requiredQty: 0.02, unitType: 'KG', unitCost: 94.50 },
      { id: '3', ingredientId: '72', ingredientCode: '512', ingredientName: 'Sugar', requiredQty: 0.01, unitType: 'KG', unitCost: 34.12 },
      { id: '4', ingredientId: '90', ingredientCode: '1102', ingredientName: 'Salt', requiredQty: 0.01, unitType: 'KG', unitCost: 9.96 },
    ],
    totalCost: 11.72,
    unitCost: 11.72,
  },
  {
    id: '2',
    parentItemId: 'burger-roll',
    parentItemCode: '1007',
    parentItemName: 'Burger Roll',
    outputQty: 10,
    outputUnitType: 'EACH',
    ingredients: [
      { id: '5', ingredientId: '21', ingredientCode: '142', ingredientName: 'White flour premixed', requiredQty: 1, unitType: 'KG', unitCost: 18 },
      { id: '6', ingredientId: '22', ingredientCode: '506', ingredientName: 'Yeast', requiredQty: 0.05, unitType: 'KG', unitCost: 94.50 },
    ],
    totalCost: 22.73,
    unitCost: 2.27,
  },
];

// Batch Productions
export const batchProductions: BatchProduction[] = [
  {
    id: '1',
    recipeId: '1',
    recipeName: 'Bravo Premium Bread',
    batchDate: '2025-12-30',
    theoreticalOutput: 140,
    actualOutput: 136,
    yieldVariance: -4,
    yieldVariancePercent: -2.86,
    ingredientsUsed: recipes[0].ingredients.map(i => ({ ...i, requiredQty: i.requiredQty * 136 })),
    totalCost: 1593.79,
    unitCost: 11.72,
    producedBy: 'Kitchen Staff',
  },
  {
    id: '2',
    recipeId: '2',
    recipeName: 'Burger Roll',
    batchDate: '2025-12-30',
    theoreticalOutput: 100,
    actualOutput: 90,
    yieldVariance: -10,
    yieldVariancePercent: -10,
    ingredientsUsed: recipes[1].ingredients.map(i => ({ ...i, requiredQty: i.requiredQty * 9 })),
    totalCost: 204.57,
    unitCost: 2.27,
    producedBy: 'Kitchen Staff',
  },
];

// Suppliers
export const suppliers: Supplier[] = [
  { id: '1', code: 'SUP001', name: 'Metro Foods', contactPerson: 'James Banda', phone: '+260 97 123 4567', email: 'orders@metrofoods.zm', accountBalance: -45000 },
  { id: '2', code: 'SUP002', name: 'Fresh Farms', contactPerson: 'Mary Phiri', phone: '+260 96 987 6543', email: 'sales@freshfarms.zm', accountBalance: -12500 },
  { id: '3', code: 'SUP003', name: 'Bakery Supplies Ltd', contactPerson: 'Peter Mwanza', phone: '+260 95 555 1234', accountBalance: -8750 },
];

// GRVs
export const grvs: GRV[] = [
  {
    id: '1',
    grvNo: 'GRV-001',
    date: '2025-12-30',
    supplierId: '1',
    supplierName: 'Metro Foods',
    items: [
      { id: '1', itemId: '1', itemCode: '136', itemName: 'Beef Steak', quantity: 10, unitCost: 180, totalCost: 1800 },
      { id: '2', itemId: '3', itemCode: '2', itemName: 'Chicken breasts', quantity: 5, unitCost: 155, totalCost: 775 },
    ],
    subtotal: 2575,
    tax: 412,
    total: 2987,
    paymentType: 'account',
    status: 'confirmed',
    receivedBy: 'John K Mumba',
  },
];

// Staff
export const staff: Staff[] = [
  { id: '1', name: 'John K Mumba', role: 'manager', commissionPercent: 0, hoursWorked: 0, totalSales: 7889, isActive: true },
  { id: '2', name: 'charles-driv', role: 'waitron', commissionPercent: 0, hoursWorked: 0, totalSales: 9591, isActive: true },
  { id: '3', name: 'jannifer c', role: 'waitron', commissionPercent: 0, hoursWorked: 0, totalSales: 11415, isActive: true },
];

// Cash Up
export const cashUps: CashUp[] = [
  {
    id: '1',
    date: '2025-12-30',
    drnFrom: 1553,
    drnTo: 1553,
    staffId: '1',
    staffName: 'John K Mumba',
    totalSales: 7889,
    cashPayments: 6981,
    cardPayments: 908,
    chequePayments: 0,
    nonBankPayments: 0,
    accountPayments: 0,
    payouts: 3815,
    tips: 0,
    expectedCash: 3166,
    actualCash: 3166,
    shortageOverage: 0,
  },
];

// Menu Items
export const menuItems: MenuItem[] = [
  { id: '1', code: '57', name: 'Budget Bread', departmentId: 'breads', departmentName: 'BREADS', costPerItem: 11.41, sellPriceExcl: 23, sellPriceIncl: 23, targetGP: 50.41, isBatchItem: true, recipeId: '1' },
  { id: '2', code: '1002', name: 'Bravo Premium Bread', departmentId: 'breads', departmentName: 'BREADS', costPerItem: 11.72, sellPriceExcl: 25, sellPriceIncl: 25, targetGP: 53.12, isBatchItem: true, recipeId: '1' },
  { id: '3', code: '55', name: 'Beef Samoosa', departmentId: 'pies', departmentName: 'PIES & PASTRY', costPerItem: 9.21, sellPriceExcl: 15.52, sellPriceIncl: 18, targetGP: 40.64, isBatchItem: true },
  { id: '4', code: '118', name: 'Beef Pie', departmentId: 'pies', departmentName: 'PIES & PASTRY', costPerItem: 18.40, sellPriceExcl: 34.48, sellPriceIncl: 40, targetGP: 46.65, isBatchItem: true },
  { id: '5', code: '52', name: 'T-Bone & Chips', departmentId: 'grills', departmentName: 'BURGER AND GRILLS', costPerItem: 86.24, sellPriceExcl: 150.86, sellPriceIncl: 175, targetGP: 42.83, isBatchItem: false },
  { id: '6', code: '109', name: 'Nshima + T-bone', departmentId: 'nshima', departmentName: 'NSHIMA & RICE', costPerItem: 94.44, sellPriceExcl: 155.17, sellPriceIncl: 180, targetGP: 39.14, isBatchItem: false },
];

// Sales Mix Items from report
export const salesMixItems: SalesMixItem[] = [
  { itemNo: 57, itemName: 'Budget Bread', quantity: 434, costPerItem: 11.41, sellExcl: 23, sellIncl: 23, gpBeforeDiscount: 50.41, gpAfterDiscount: 50.41, totalCost: 4949.83, totalSales: 9982, totalProfit: 5032.17, percentOfTurnover: 36.97 },
  { itemNo: 1002, itemName: 'Bravo Premium Bread', quantity: 136, costPerItem: 11.72, sellExcl: 25, sellIncl: 25, gpBeforeDiscount: 53.12, gpAfterDiscount: 53.12, totalCost: 1593.79, totalSales: 3400, totalProfit: 1806.21, percentOfTurnover: 12.59 },
  { itemNo: 55, itemName: 'Beef Samoosa', quantity: 47, costPerItem: 9.21, sellExcl: 15.52, sellIncl: 18, gpBeforeDiscount: 40.64, gpAfterDiscount: 40.63, totalCost: 433.02, totalSales: 729.34, totalProfit: 296.32, percentOfTurnover: 2.70 },
  { itemNo: 118, itemName: 'Beef Pie', quantity: 25, costPerItem: 18.40, sellExcl: 34.48, sellIncl: 40, gpBeforeDiscount: 46.65, gpAfterDiscount: 46.65, totalCost: 459.92, totalSales: 862.03, totalProfit: 402.11, percentOfTurnover: 3.19 },
  { itemNo: 109, itemName: 'Nshima + T-bone', quantity: 9, costPerItem: 94.44, sellExcl: 155.17, sellIncl: 180, gpBeforeDiscount: 39.14, gpAfterDiscount: 39.14, totalCost: 849.92, totalSales: 1396.53, totalProfit: 546.61, percentOfTurnover: 5.17 },
  { itemNo: 603, itemName: 'Cappucino -Beans', quantity: 10, costPerItem: 26.59, sellExcl: 51.72, sellIncl: 60, gpBeforeDiscount: 48.59, gpAfterDiscount: 48.60, totalCost: 265.87, totalSales: 517.21, totalProfit: 251.34, percentOfTurnover: 1.92 },
];

// Management Overview from report
export const managementOverview: ManagementOverview = {
  reportDate: '2025-12-30',
  drnRange: { from: 1553, to: 1553 },
  
  cashTotal: 27987,
  chequeTotal: 0,
  cardTotal: 908,
  accountTotal: 0,
  nonBankTotal: 0,
  totalPaytypes: 28895,
  
  turnoverIncl: 28895,
  tax: 1892.84,
  turnoverExcl: 27002.16,
  
  openingStock: 302075.33,
  purchases: 3699.25,
  stockTransIn: 0,
  stockTransOut: 0,
  closingStock: 295739.63,
  costOfSales: 10034.95,
  costOfSalesPercent: 37.16,
  
  grossProfit: 16967.21,
  grossProfitPercent: 62.84,
  expenses: 0,
  netProfit: 16967.21,
  
  invoiceCount: 104,
  customerCount: 104,
  tableCount: 5,
  avgPerInvoice: 277.84,
  tablesPerHour: 0.22,
  minsPerTable: 30.46,
  hoursPerDay: 22.97,
  
  stockVarianceValue: 676.65,
  wastageValue: 0,
  
  sessions: {
    morning: { recorded: 14706, percent: 50.89 },
    afternoon: { recorded: 5872, percent: 20.32 },
    evening: { recorded: 8317, percent: 28.78 },
  },
  
  orderTypes: {
    eatIn: { value: 6102, percent: 21.12 },
    takeOut: { value: 13202, percent: 45.69 },
    delivery: { value: 9591, percent: 33.19 },
  },
};
