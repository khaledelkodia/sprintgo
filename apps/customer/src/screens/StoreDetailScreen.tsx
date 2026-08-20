import type { OptionGroupView, ProductView, StoreDetailView } from '@sprintgo/shared';
import { formatMoney } from '@sprintgo/shared';
import { ChevronRight, Plus, ShoppingBag, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getStore } from '../lib/catalog';
import { useCart } from '../lib/cart';

export function StoreDetailScreen() {
  const navigate = useNavigate();
  const { slug = '' } = useParams();
  const { cart, count, subtotal, addProduct } = useCart();
  const [store, setStore] = useState<StoreDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetProduct, setSheetProduct] = useState<ProductView | null>(null);

  useEffect(() => {
    getStore(slug)
      .then(setStore)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  function add(product: ProductView, optionIds: string[]) {
    if (!store) return;
    if (cart && cart.storeId !== store.id && cart.lines.length > 0) {
      if (!window.confirm(`سلتك فيها طلبات من ${cart.storeName}. تحب تبدأ سلة جديدة من ${store.name}؟`)) return;
    }
    addProduct(store, product, optionIds);
  }

  function onProductTap(product: ProductView) {
    if (!product.isAvailable) return;
    if (product.optionGroups.length > 0) setSheetProduct(product);
    else add(product, []);
  }

  if (loading) return <div className="sg-screen" />;
  if (!store) {
    return (
      <div className="sg-screen" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A' }}>المحل مش متاح</div>
        <button type="button" onClick={() => navigate('/stores')} className="sg-btn sg-btn-primary" style={{ width: '100%', marginTop: 20 }}>ارجع للمحلات</button>
      </div>
    );
  }

  const cartHere = count > 0;

  return (
    <div className="sg-screen">
      {/* header */}
      <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button type="button" onClick={() => navigate('/stores')} style={backBtn}>
          <ChevronRight size={24} strokeWidth={1.75} color="#0F172A" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>{store.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: 13, color: '#64748B' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#0F172A', fontWeight: 600 }}>
              <Star size={14} strokeWidth={1.75} color="#F97316" /> {store.ratingAvg > 0 ? store.ratingAvg.toFixed(1) : 'جديد'}
            </span>
            {store.delivery && <span>توصيل {formatMoney(store.delivery.fee)}</span>}
            {store.minOrderTotal > 0 && <span>أقل طلب {formatMoney(store.minOrderTotal)}</span>}
          </div>
        </div>
      </div>

      {!store.isAcceptingOrders && (
        <div style={{ padding: '12px 20px 0' }}>
          <div style={{ background: '#FEF2F2', color: '#DC2626', borderRadius: 14, padding: '12px 16px', fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
            المحل مقفول دلوقتي — تقدر تتفرّج بس مش هتقدر تطلب.
          </div>
        </div>
      )}

      {/* menu */}
      <div className="sg-scroll" style={{ padding: '18px 20px', paddingBottom: cartHere ? 100 : 24 }}>
        {store.categories.length === 0 && (
          <div style={{ textAlign: 'center', color: '#94A3B8', padding: 40 }}>المحل لسه مضافش أصناف.</div>
        )}
        {store.categories.map((cat) => (
          <div key={cat.id} style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>{cat.name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cat.products.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onProductTap(p)}
                  className="sg-card"
                  style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, cursor: p.isAvailable ? 'pointer' : 'default', opacity: p.isAvailable ? 1 : 0.55 }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{p.name}</div>
                    {p.description && <div style={{ fontSize: 13, color: '#64748B', marginTop: 3, lineHeight: 1.4 }}>{p.description}</div>}
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#2563EB', marginTop: 6 }}>{formatMoney(p.price)}</div>
                    {!p.isAvailable && <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, fontWeight: 600 }}>خلص دلوقتي</div>}
                  </div>
                  {p.isAvailable && store.isAcceptingOrders && (
                    <div style={{ width: 40, height: 40, borderRadius: 14, background: '#2563EB', display: 'grid', placeItems: 'center', color: '#fff', flex: 'none', boxShadow: '0 8px 18px rgba(37,99,235,.3)' }}>
                      <Plus size={22} strokeWidth={2} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* floating cart bar */}
      {cartHere && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 20px 20px', background: 'linear-gradient(to top, #F8FAFC 70%, transparent)' }}>
          <button type="button" onClick={() => navigate('/cart')} className="sg-btn sg-btn-primary" style={{ width: '100%', height: 58, justifyContent: 'space-between', padding: '0 20px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShoppingBag size={20} strokeWidth={1.75} /> شوف السلة ({count})
            </span>
            <span style={{ fontWeight: 800 }}>{formatMoney(subtotal)}</span>
          </button>
        </div>
      )}

      {sheetProduct && (
        <OptionsSheet
          product={sheetProduct}
          onClose={() => setSheetProduct(null)}
          onAdd={(optionIds) => {
            add(sheetProduct, optionIds);
            setSheetProduct(null);
          }}
        />
      )}
    </div>
  );
}

function OptionsSheet({ product, onClose, onAdd }: { product: ProductView; onClose: () => void; onAdd: (optionIds: string[]) => void }) {
  // selected option ids per group; single-select required groups preselect their first option
  const [selected, setSelected] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    for (const g of product.optionGroups) {
      init[g.id] = g.maxSelect === 1 && g.minSelect >= 1 && g.options[0] ? [g.options[0].id] : [];
    }
    return init;
  });

  function toggle(group: OptionGroupView, optionId: string) {
    setSelected((prev) => {
      const cur = prev[group.id] ?? [];
      if (group.maxSelect === 1) return { ...prev, [group.id]: [optionId] };
      if (cur.includes(optionId)) return { ...prev, [group.id]: cur.filter((id) => id !== optionId) };
      if (cur.length >= group.maxSelect) return prev; // at the cap
      return { ...prev, [group.id]: [...cur, optionId] };
    });
  }

  const allIds = useMemo(() => Object.values(selected).flat(), [selected]);
  const valid = product.optionGroups.every((g) => (selected[g.id]?.length ?? 0) >= g.minSelect);
  const total = useMemo(() => {
    let t = product.price;
    for (const g of product.optionGroups) for (const o of g.options) if (allIds.includes(o.id)) t += o.priceDelta;
    return t;
  }, [product, allIds]);

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'flex-end', zIndex: 30 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', background: '#F8FAFC', borderRadius: '26px 26px 0 0', maxHeight: '80%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 20px 8px' }}>
          <div style={{ width: 44, height: 5, borderRadius: 999, background: '#E2E8F0', margin: '0 auto 14px' }} />
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>{product.name}</div>
        </div>
        <div style={{ overflowY: 'auto', padding: '8px 20px', flex: 1 }}>
          {product.optionGroups.map((g) => (
            <div key={g.id} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{g.name}</div>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>{g.minSelect >= 1 ? 'لازم تختار' : 'اختياري'}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {g.options.map((o) => {
                  const on = (selected[g.id] ?? []).includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggle(g, o.id)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: `1.5px solid ${on ? '#2563EB' : '#E2E8F0'}`, borderRadius: 14, padding: '13px 16px', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 20, height: 20, borderRadius: g.maxSelect === 1 ? 999 : 6, border: `2px solid ${on ? '#2563EB' : '#CBD5E1'}`, background: on ? '#2563EB' : '#fff', display: 'grid', placeItems: 'center' }}>
                          {on && <span style={{ width: 8, height: 8, borderRadius: g.maxSelect === 1 ? 999 : 2, background: '#fff' }} />}
                        </span>
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>{o.name}</span>
                      </span>
                      {o.priceDelta > 0 && <span style={{ fontSize: 14, color: '#64748B' }}>+{formatMoney(o.priceDelta)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 20px 24px' }}>
          <button type="button" disabled={!valid} onClick={() => onAdd(allIds)} className="sg-btn sg-btn-primary" style={{ width: '100%', height: 58, justifyContent: 'space-between', padding: '0 20px', opacity: valid ? 1 : 0.5 }}>
            <span>أضف للسلة</span>
            <span style={{ fontWeight: 800 }}>{formatMoney(total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const backBtn: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 14,
  background: '#fff',
  boxShadow: '0 8px 20px rgba(15,23,42,.07)',
  display: 'grid',
  placeItems: 'center',
  border: 'none',
  cursor: 'pointer',
};
