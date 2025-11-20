import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Percent, Plus, Trash2, Tag, ShoppingCart, TrendingUp } from 'lucide-react';
import { showSuccess } from '@/utils/toast';

interface Discount {
  id: number;
  percentage: number;
}

export default function DiscountCalculator() {
  // Simple Discount Calculator
  const [originalPrice, setOriginalPrice] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<string>('');
  
  // Multiple Discounts Calculator
  const [multipleOriginalPrice, setMultipleOriginalPrice] = useState<string>('');
  const [discounts, setDiscounts] = useState<Discount[]>([{ id: 1, percentage: 0 }]);
  
  // Profit Margin Calculator
  const [costPrice, setCostPrice] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [desiredMargin, setDesiredMargin] = useState<string>('');
  
  // Bulk Discount Calculator
  const [bulkQuantity, setBulkQuantity] = useState<string>('');
  const [bulkUnitPrice, setBulkUnitPrice] = useState<string>('');
  const [bulkDiscount, setBulkDiscount] = useState<string>('');
  
  // Simple Discount Calculations
  const origPrice = parseFloat(originalPrice) || 0;
  const discPct = parseFloat(discountPercent) || 0;
  const discountAmount = (origPrice * discPct) / 100;
  const finalPrice = origPrice - discountAmount;
  const savedAmount = discountAmount;
  
  // Multiple Discounts Calculations
  const multiplePrice = parseFloat(multipleOriginalPrice) || 0;
  let currentPrice = multiplePrice;
  const discountSteps: { step: number; discount: number; priceAfter: number }[] = [];
  
  discounts.forEach((discount, index) => {
    if (discount.percentage > 0) {
      const discountAmt = (currentPrice * discount.percentage) / 100;
      currentPrice = currentPrice - discountAmt;
      discountSteps.push({
        step: index + 1,
        discount: discount.percentage,
        priceAfter: currentPrice,
      });
    }
  });
  
  const totalSavedMultiple = multiplePrice - currentPrice;
  const effectiveDiscount = multiplePrice > 0 ? ((totalSavedMultiple / multiplePrice) * 100).toFixed(2) : '0';
  
  // Profit Margin Calculations
  const cost = parseFloat(costPrice) || 0;
  const selling = parseFloat(sellingPrice) || 0;
  const profit = selling - cost;
  const profitMargin = cost > 0 ? ((profit / cost) * 100).toFixed(2) : '0';
  const markup = cost > 0 ? ((profit / cost) * 100).toFixed(2) : '0';
  
  // Calculate selling price from desired margin
  const margin = parseFloat(desiredMargin) || 0;
  const calculatedSellingPrice = cost + (cost * margin) / 100;
  
  // Bulk Discount Calculations
  const quantity = parseFloat(bulkQuantity) || 0;
  const unitPrice = parseFloat(bulkUnitPrice) || 0;
  const bulkDiscPct = parseFloat(bulkDiscount) || 0;
  const totalBeforeDiscount = quantity * unitPrice;
  const bulkDiscountAmount = (totalBeforeDiscount * bulkDiscPct) / 100;
  const totalAfterDiscount = totalBeforeDiscount - bulkDiscountAmount;
  const pricePerUnit = quantity > 0 ? totalAfterDiscount / quantity : 0;
  
  const addDiscount = () => {
    setDiscounts([...discounts, { id: Date.now(), percentage: 0 }]);
  };
  
  const removeDiscount = (id: number) => {
    if (discounts.length > 1) {
      setDiscounts(discounts.filter(d => d.id !== id));
    }
  };
  
  const updateDiscount = (id: number, percentage: number) => {
    setDiscounts(discounts.map(d => d.id === id ? { ...d, percentage } : d));
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discount & Pricing Calculator</h1>
          <p className="text-muted-foreground">Calculate discounts, pricing, and profit margins</p>
        </div>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Simple Discount Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Simple Discount
            </CardTitle>
            <CardDescription>Calculate the final price after applying a single discount</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="original-price">Original Price (NPR)</Label>
              <Input
                id="original-price"
                type="number"
                placeholder="e.g., 10000"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                min="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="discount-percent">Discount Percentage (%)</Label>
              <Input
                id="discount-percent"
                type="number"
                placeholder="e.g., 20"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                min="0"
                max="100"
              />
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Original Price</span>
                <span className="text-lg font-bold">NPR {origPrice.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="text-sm font-medium text-red-600 dark:text-red-400">Discount Amount</span>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">
                  - NPR {discountAmount.toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400 block">Final Price</span>
                  <span className="text-xs text-muted-foreground">You save: NPR {savedAmount.toLocaleString()}</span>
                </div>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  NPR {finalPrice.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Multiple Discounts Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Multiple Sequential Discounts
            </CardTitle>
            <CardDescription>Apply multiple discounts one after another</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="multiple-price">Original Price (NPR)</Label>
              <Input
                id="multiple-price"
                type="number"
                placeholder="e.g., 10000"
                value={multipleOriginalPrice}
                onChange={(e) => setMultipleOriginalPrice(e.target.value)}
                min="0"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Discounts</Label>
                <Button size="sm" variant="outline" onClick={addDiscount}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Discount
                </Button>
              </div>
              
              {discounts.map((discount, index) => (
                <div key={discount.id} className="flex gap-2 items-center">
                  <Badge variant="secondary" className="w-20">Step {index + 1}</Badge>
                  <Input
                    type="number"
                    placeholder="%"
                    value={discount.percentage || ''}
                    onChange={(e) => updateDiscount(discount.id, parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                  />
                  {discounts.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeDiscount(discount.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              {discountSteps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Discount Breakdown</h4>
                  {discountSteps.map((step) => (
                    <div key={step.step} className="p-2 bg-muted rounded text-sm flex justify-between">
                      <span>After {step.discount}% discount</span>
                      <span className="font-semibold">NPR {step.priceAfter.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-purple-600 dark:text-purple-400 block">Final Price</span>
                  <span className="text-xs text-muted-foreground">Effective discount: {effectiveDiscount}%</span>
                </div>
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  NPR {currentPrice.toLocaleString()}
                </span>
              </div>
              
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  Total Savings: NPR {totalSavedMultiple.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Profit Margin Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Profit Margin Calculator
            </CardTitle>
            <CardDescription>Calculate profit margins and markup percentages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cost-price">Cost Price (NPR)</Label>
              <Input
                id="cost-price"
                type="number"
                placeholder="e.g., 5000"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                min="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="selling-price">Selling Price (NPR)</Label>
              <Input
                id="selling-price"
                type="number"
                placeholder="e.g., 8000"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                min="0"
              />
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">Profit</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    NPR {profit.toLocaleString()}
                  </p>
                </div>
                
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">Profit Margin</p>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {profitMargin}%
                  </p>
                </div>
              </div>
              
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Markup</p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {markup}%
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label htmlFor="desired-margin">Calculate Selling Price from Desired Margin (%)</Label>
              <Input
                id="desired-margin"
                type="number"
                placeholder="e.g., 60"
                value={desiredMargin}
                onChange={(e) => setDesiredMargin(e.target.value)}
                min="0"
              />
              
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Recommended Selling Price</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  NPR {calculatedSellingPrice.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Bulk Discount Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Bulk Purchase Discount
            </CardTitle>
            <CardDescription>Calculate total price with bulk discounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="e.g., 100"
                value={bulkQuantity}
                onChange={(e) => setBulkQuantity(e.target.value)}
                min="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="unit-price">Unit Price (NPR)</Label>
              <Input
                id="unit-price"
                type="number"
                placeholder="e.g., 500"
                value={bulkUnitPrice}
                onChange={(e) => setBulkUnitPrice(e.target.value)}
                min="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bulk-discount">Bulk Discount (%)</Label>
              <Input
                id="bulk-discount"
                type="number"
                placeholder="e.g., 15"
                value={bulkDiscount}
                onChange={(e) => setBulkDiscount(e.target.value)}
                min="0"
                max="100"
              />
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Total Before Discount</span>
                <span className="text-lg font-bold">NPR {totalBeforeDiscount.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="text-sm font-medium text-red-600 dark:text-red-400">Bulk Discount</span>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">
                  - NPR {bulkDiscountAmount.toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400 block">Total After Discount</span>
                  <span className="text-xs text-muted-foreground">Price per unit: NPR {pricePerUnit.toLocaleString()}</span>
                </div>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  NPR {totalAfterDiscount.toLocaleString()}
                </span>
              </div>
              
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">You Save</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  NPR {bulkDiscountAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
