import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ProductView, StoreDetailView } from '@sprintgo/shared';

export interface CartLine {
  key: string;
  productId: string;
  name: string;
  unitPrice: number; // product price + selected option deltas, per unit
  quantity: number;
  optionIds: string[];
  optionLabels: string[];
}

export interface Cart {
  storeId: string;
  storeSlug: string;
  storeName: string;
  minOrderTotal: number;
  deliveryFee: number | null;
  lines: CartLine[];
}

interface CartValue {
  cart: Cart | null;
  count: number;
  subtotal: number;
  addProduct: (store: StoreDetailView, product: ProductView, optionIds: string[]) => void;
  setQty: (key: string, qty: number) => void;
  removeLine: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartValue | null>(null);

function lineKey(productId: string, optionIds: string[]): string {
  return productId + '::' + [...optionIds].sort().join(',');
}

function priceProduct(product: ProductView, optionIds: string[]): { unit: number; labels: string[] } {
  let unit = product.price;
  const labels: string[] = [];
  for (const g of product.optionGroups) {
    for (const o of g.options) {
      if (optionIds.includes(o.id)) {
        unit += o.priceDelta;
        labels.push(o.name);
      }
    }
  }
  return { unit, labels };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);

  const addProduct = useCallback((store: StoreDetailView, product: ProductView, optionIds: string[]) => {
    setCart((prev) => {
      const { unit, labels } = priceProduct(product, optionIds);
      const key = lineKey(product.id, optionIds);
      const newLine: CartLine = {
        key,
        productId: product.id,
        name: product.name,
        unitPrice: unit,
        quantity: 1,
        optionIds,
        optionLabels: labels,
      };
      // switching stores → start a fresh cart (the screen confirms before calling this)
      if (!prev || prev.storeId !== store.id) {
        return {
          storeId: store.id,
          storeSlug: store.slug,
          storeName: store.name,
          minOrderTotal: store.minOrderTotal,
          deliveryFee: store.delivery?.fee ?? null,
          lines: [newLine],
        };
      }
      const idx = prev.lines.findIndex((l) => l.key === key);
      const lines = [...prev.lines];
      if (idx >= 0) lines[idx] = { ...lines[idx], quantity: lines[idx].quantity + 1 };
      else lines.push(newLine);
      return { ...prev, lines };
    });
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setCart((prev) => {
      if (!prev) return prev;
      const lines = prev.lines
        .map((l) => (l.key === key ? { ...l, quantity: qty } : l))
        .filter((l) => l.quantity > 0);
      return lines.length ? { ...prev, lines } : null;
    });
  }, []);

  const removeLine = useCallback((key: string) => setQty(key, 0), [setQty]);
  const clear = useCallback(() => setCart(null), []);

  const count = cart ? cart.lines.reduce((n, l) => n + l.quantity, 0) : 0;
  const subtotal = cart ? cart.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0) : 0;

  const value = useMemo<CartValue>(
    () => ({ cart, count, subtotal, addProduct, setQty, removeLine, clear }),
    [cart, count, subtotal, addProduct, setQty, removeLine, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
