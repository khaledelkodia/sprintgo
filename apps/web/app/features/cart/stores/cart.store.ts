import { defineStore } from 'pinia';
import type { ProductView } from '@sprintgo/shared';

export interface CartOption {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDelta: number;
}

export interface CartLine {
  lineId: string;
  productId: string;
  name: string;
  basePrice: number;
  quantity: number;
  options: CartOption[];
  notes?: string;
}

interface CartState {
  storeId: string | null;
  storeSlug: string | null;
  storeName: string | null;
  lines: CartLine[];
}

const EMPTY: CartState = { storeId: null, storeSlug: null, storeName: null, lines: [] };

function optionsSignature(options: CartOption[]): string {
  return options
    .map((o) => o.optionId)
    .sort()
    .join(',');
}

export function lineUnitPrice(line: CartLine): number {
  return line.basePrice + line.options.reduce((sum, o) => sum + o.priceDelta, 0);
}

/**
 * Single-store cart, persisted locally (ADR-007). Prices here are for DISPLAY
 * only — the server re-prices at checkout, so tampering is harmless.
 */
export const useCartStore = defineStore('cart', () => {
  const state = useLocalStorage<CartState>('sg-cart', { ...EMPTY }, { mergeDefaults: true });

  const lines = computed(() => state.value.lines);
  const storeId = computed(() => state.value.storeId);
  const storeSlug = computed(() => state.value.storeSlug);
  const storeName = computed(() => state.value.storeName);

  const itemsCount = computed(() => state.value.lines.reduce((n, l) => n + l.quantity, 0));
  const subtotal = computed(() =>
    state.value.lines.reduce((sum, l) => sum + lineUnitPrice(l) * l.quantity, 0),
  );
  const isEmpty = computed(() => state.value.lines.length === 0);

  function quantityOfProduct(productId: string): number {
    return state.value.lines
      .filter((l) => l.productId === productId)
      .reduce((n, l) => n + l.quantity, 0);
  }

  function setStore(store: { id: string; slug: string; name: string }) {
    if (state.value.storeId !== store.id) {
      state.value = { storeId: store.id, storeSlug: store.slug, storeName: store.name, lines: [] };
    }
  }

  /** Returns false if the item belongs to a different store (caller confirms a reset). */
  function belongsToCurrentStore(storeIdToCheck: string): boolean {
    return state.value.storeId === null || state.value.storeId === storeIdToCheck;
  }

  function addProduct(
    store: { id: string; slug: string; name: string },
    product: ProductView,
    options: CartOption[] = [],
    quantity = 1,
    notes?: string,
  ) {
    setStore(store);
    const sig = optionsSignature(options);
    // merge with an identical existing line (same product + same options + no notes)
    const existing = state.value.lines.find(
      (l) => l.productId === product.id && optionsSignature(l.options) === sig && !l.notes && !notes,
    );
    if (existing) {
      existing.quantity += quantity;
    } else {
      state.value.lines.push({
        lineId: `${product.id}-${sig}-${state.value.lines.length}-${Math.floor(performance.now())}`,
        productId: product.id,
        name: product.name,
        basePrice: product.price,
        quantity,
        options,
        notes,
      });
    }
  }

  function setLineQuantity(lineId: string, quantity: number) {
    const line = state.value.lines.find((l) => l.lineId === lineId);
    if (!line) return;
    if (quantity <= 0) {
      state.value.lines = state.value.lines.filter((l) => l.lineId !== lineId);
    } else {
      line.quantity = quantity;
    }
    if (state.value.lines.length === 0) clear();
  }

  function clear() {
    state.value = { ...EMPTY, lines: [] };
  }

  return {
    lines,
    storeId,
    storeSlug,
    storeName,
    itemsCount,
    subtotal,
    isEmpty,
    quantityOfProduct,
    belongsToCurrentStore,
    setStore,
    addProduct,
    setLineQuantity,
    clear,
  };
});
