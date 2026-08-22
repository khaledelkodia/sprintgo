/**
 * Full business-logic audit of SprintGo against a running API.
 *
 * Walks the real flows of all four surfaces — admin dashboard, merchant
 * dashboard, customer app, courier app — and asserts the LOGIC, not just that
 * endpoints answer: pricing maths, commission, cash settlement, the remittance
 * block, vehicle-filtered dispatch, ownership rules and permission gates.
 *
 * Run from apps/api:  npx tsx <this file>
 */
import { PrismaClient } from '@prisma/client';

const API = 'http://localhost:4000/api/v1';
const prisma = new PrismaClient();

// ── tiny test harness ───────────────────────────────────────────────
let suite = '';
const results = [];
const ok = (m) => { console.log(`  ✅ ${m}`); results.push({ suite, m, pass: true }); };
const bad = (m) => { console.log(`  ❌ ${m}`); results.push({ suite, m, pass: false }); };
const check = (cond, m, detail = '') => (cond ? ok(m) : bad(`${m}${detail ? ` — ${detail}` : ''}`));
const head = (s) => { suite = s; console.log(`\n\x1b[1m── ${s} ──\x1b[0m`); };
const money = (p) => `${(p / 100).toFixed(2)}ج`;

async function call(method, path, { token, body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty body */ }
  return { status: res.status, ok: json?.success === true, data: json?.data, error: json?.error };
}
const GET = (p, t) => call('GET', p, { token: t });
const POST = (p, b, t) => call('POST', p, { token: t, body: b ?? {} });
const PATCH = (p, b, t) => call('PATCH', p, { token: t, body: b ?? {} });
const DEL = (p, t) => call('DELETE', p, { token: t });

/** One login per identity — OTP is rate-limited per phone AND per IP. */
const tokens = {};
async function otpLogin(phone) {
  if (tokens[phone]) return tokens[phone];
  const r = await POST('/auth/otp/request', { phone });
  const code = r.data?.devCode;
  if (!code) throw new Error(`no devCode for ${phone}: ${JSON.stringify(r.error)}`);
  const v = await POST('/auth/otp/verify', { phone, code });
  if (!v.data?.token) throw new Error(`otp verify failed for ${phone}: ${JSON.stringify(v.error)}`);
  tokens[phone] = v.data.token;
  return tokens[phone];
}
async function passwordLogin(phone, password) {
  if (tokens[phone]) return tokens[phone];
  const v = await POST('/auth/login', { phone, password });
  if (!v.data?.token) throw new Error(`password login failed for ${phone}: ${JSON.stringify(v.error)}`);
  tokens[phone] = v.data.token;
  return tokens[phone];
}

/** The server auto-offers in the background — wait briefly rather than racing it. */
async function waitForOffer(token, orderId, tries = 10) {
  for (let i = 0; i < tries; i++) {
    const o = await GET('/courier/offer', token);
    if (o.data?.orderId === orderId) return o.data;
    await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

const stamp = Date.now().toString().slice(-6);

async function reset() {
  await prisma.deliveryAssignment.deleteMany({ where: { status: { in: ['OFFERED', 'ASSIGNED', 'PICKED_UP'] } } });
  await prisma.order.updateMany({
    where: { status: { in: ['PLACED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] } },
    data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'audit reset' },
  });
  await prisma.otpRequest.deleteMany({});
  // start every courier from a clean money slate so wallet maths is checkable
  await prisma.courierRemittance.deleteMany({});
}

const main = async () => {
  await reset();

  // ════════════════════════════════════════════════════════════
  head('A. Admin dashboard');
  const admin = await passwordLogin('01000000001', 'admin1234');
  check(!!admin, 'super admin signs in with a password');

  const zones = (await GET('/zones')).data ?? [];
  check(zones.length >= 3, `zones load (${zones.length})`, JSON.stringify(zones).slice(0, 80));
  const zone = zones[0];

  // pricing: read → change → verify it actually drives a quote
  const p0 = await GET('/admin/errand-pricing', admin);
  check(p0.ok && typeof p0.data.baseFee === 'number', 'pricing settings readable');
  const saved = await PATCH('/admin/errand-pricing', {
    baseFee: 1000, perKmFee: 500, minFee: 1500, commissionPercent: 15, remittanceLimit: 20000,
    vehicleMultipliers: { MOTORCYCLE: 100, TRICYCLE: 220, PICKUP: 450, TRUCK: 700 },
  }, admin);
  check(saved.ok && saved.data.baseFee === 1000, 'pricing saved');
  check(saved.data.vehicleMultipliers?.PICKUP === 450, 'vehicle multipliers saved');

  // a store the merchant will run
  const storeRes = await POST('/admin/stores', {
    name: `مطعم الاختبار ${stamp}`,
    serviceTypeSlug: 'restaurants',
    listingType: 'CATALOG',
    contactPhone: '01000000002',
    addressText: 'شارع الاختبار، دمياط',
    lat: 31.4175, lng: 31.8144,
    minOrderTotal: 5000,
    prepTimeMins: 20,
    productLimit: 3,
    zones: [{ zoneId: zone.id, deliveryFee: 2000, etaMins: 30 }],
    owner: { name: 'صاحب الاختبار', phone: `0111${stamp}0`, password: 'store12345' },
  }, admin);
  check(storeRes.ok, 'store created with an owner + delivery zone', JSON.stringify(storeRes.error));
  // this endpoint answers { store, ownerPhone } — the owner phone is shown once so
  // the admin can hand it over
  const storeId = storeRes.data?.store?.id;
  const storeSlug = storeRes.data?.store?.slug;
  check(!!storeId && !!storeRes.data?.ownerPhone, 'the response hands back the store and the owner login');

  // a driver, and the vehicle that decides which jobs reach them
  const drvPhone = `0122${stamp}0`;
  const drv = await POST('/admin/drivers', { name: `سواق ${stamp}`, phone: drvPhone, vehicleType: 'MOTORCYCLE' }, admin);
  check(drv.ok, 'driver onboarded', JSON.stringify(drv.error));
  const driverId = drv.data?.id;
  const veh = await PATCH(`/admin/drivers/${driverId}/vehicle`, { vehicleType: 'TRICYCLE' }, admin);
  check(veh.ok && veh.data.vehicleType === 'TRICYCLE', "admin changes a driver's vehicle");

  const settle = await GET('/admin/drivers/settlements', admin);
  check(settle.ok && Array.isArray(settle.data), `settlement board loads (${settle.data?.length} drivers)`);
  check(settle.data?.some((d) => d.id === driverId), 'the new driver shows on the settlement board');

  // ════════════════════════════════════════════════════════════
  head('B. Permissions — the gates actually hold');
  const cust = await otpLogin(`0100${stamp}1`);
  const asCustomer = await GET('/admin/stores', cust);
  check(!asCustomer.ok && [401, 403].includes(asCustomer.status), 'a customer cannot read the admin store list', `got ${asCustomer.status}`);
  const noToken = await GET('/admin/drivers');
  check(!noToken.ok, 'an anonymous request cannot reach admin');
  const custDispatch = await POST(`/admin/dispatch/orders/x/assign`, { courierId: 'y' }, cust);
  check(!custDispatch.ok, 'a customer cannot dispatch orders');

  // ════════════════════════════════════════════════════════════
  head('C. Merchant dashboard');
  const merch = await passwordLogin(`0111${stamp}0`, 'store12345');
  check(!!merch, 'store owner signs in');

  const myStore = await GET('/merchant/store', merch);
  check(myStore.ok && myStore.data.id === storeId, 'owner sees their own store');

  const cat = await POST('/merchant/categories', { name: 'الأطباق' }, merch);
  check(cat.ok, 'category created');
  const prodA = await POST('/merchant/products', { categoryId: cat.data?.id, name: 'كشري وسط', price: 3000 }, merch);
  const prodB = await POST('/merchant/products', { categoryId: cat.data?.id, name: 'كشري كبير', price: 4500 }, merch);
  check(prodA.ok && prodB.ok, 'products created');
  const prodC = await POST('/merchant/products', { categoryId: cat.data?.id, name: 'سلطة', price: 1000 }, merch);
  const prodD = await POST('/merchant/products', { categoryId: cat.data?.id, name: 'رابع صنف', price: 500 }, merch);
  check(prodC.ok && !prodD.ok, 'the per-store product cap (3) is enforced on the 4th', JSON.stringify(prodD.error?.code));

  const avail = await PATCH(`/merchant/products/${prodA.data.id}/availability`, { isAvailable: false }, merch);
  check(avail.ok, 'a product can be switched off in one tap');
  await PATCH(`/merchant/products/${prodA.data.id}/availability`, { isAvailable: true }, merch);

  const otherStore = await GET('/merchant/store', await passwordLogin('01000000002', 'merchant123'));
  check(otherStore.ok && otherStore.data.id !== storeId, 'a different merchant sees a different store (no leakage)');

  // ════════════════════════════════════════════════════════════
  head('D. Customer — catalog order, priced by the server');
  const addr = await POST('/addresses', {
    label: 'البيت', zoneId: zone.id, street: 'شارع 9', lat: 31.4165, lng: 31.8133,
  }, cust);
  check(addr.ok && addr.data.isDefault, 'first address is created and becomes the default');
  check(addr.data.lat === 31.4165, 'the address keeps its map pin');
  const addressId = addr.data.id;

  const storeView = await GET(`/stores/${storeSlug}?zoneId=${zone.id}`, cust);
  check(storeView.ok, 'the customer can open the store');
  check(storeView.data?.delivery?.fee === 2000, `the store's delivery fee for this zone is ${money(2000)}`, `got ${storeView.data?.delivery?.fee}`);

  // below the minimum → must be refused
  const tooSmall = await POST('/orders', {
    storeId, fulfillmentType: 'DELIVERY', addressId, paymentMethod: 'COD',
    items: [{ productId: prodC.data.id, quantity: 1, optionIds: [] }],
    clientTotal: 1000 + 2000,
  }, cust);
  check(!tooSmall.ok, 'an order below the store minimum is refused', JSON.stringify(tooSmall.error?.code));

  // a lie about the price must be caught, not quietly accepted (ADR-007)
  const lie = await POST('/orders', {
    storeId, fulfillmentType: 'DELIVERY', addressId, paymentMethod: 'COD',
    items: [{ productId: prodB.data.id, quantity: 2, optionIds: [] }],
    clientTotal: 1, // deliberately wrong
  }, cust);
  check(!lie.ok && lie.error?.code === 'PRICE_CHANGED',
    'a wrong price from the client is refused, not charged', JSON.stringify(lie.error?.code));
  check(lie.error?.details?.subtotal === 9000 && lie.error?.details?.total === 11000,
    `and the server answers with the real figures (${money(9000)} + ${money(2000)})`, JSON.stringify(lie.error?.details));

  const order = await POST('/orders', {
    storeId, fulfillmentType: 'DELIVERY', addressId, paymentMethod: 'COD',
    items: [{ productId: prodB.data.id, quantity: 2, optionIds: [] }],
    clientTotal: 11000,
  }, cust);
  check(order.ok, 'catalog order placed', JSON.stringify(order.error));
  const catalogOrderId = order.data?.id;
  if (!catalogOrderId) throw new Error('cannot continue without an order');
  check(order.data?.subtotal === 9000, `items priced by the server (${money(order.data?.subtotal)})`, `got ${order.data?.subtotal}`);
  check(order.data?.deliveryFee === 2000, `delivery fee applied (${money(order.data?.deliveryFee)})`);
  check(order.data?.total === 11000, `total = items + delivery (${money(order.data?.total)})`);
  check(order.data?.addressSnapshot?.lat === 31.4165, 'the pin travelled onto the order for the courier');

  const someoneElse = await otpLogin(`0100${stamp}2`);
  const peek = await GET(`/orders/${catalogOrderId}`, someoneElse);
  check(!peek.ok, "another customer cannot open someone else's order");

  // ════════════════════════════════════════════════════════════
  head('E. Merchant board — moving the order');
  const board = await GET('/merchant/orders', merch);
  check(board.ok && board.data?.some((o) => o.id === catalogOrderId), 'the new order appears on the merchant board');
  const acc = await POST(`/merchant/orders/${catalogOrderId}/accept`, { estimatedReadyMins: 15 }, merch);
  check(acc.ok, 'merchant accepts → PREPARING', JSON.stringify(acc.error));
  const ready = await POST(`/merchant/orders/${catalogOrderId}/ready`, {}, merch);
  check(ready.ok && ready.data?.status === 'READY', 'merchant marks it ready');
  const wrongOrder = await POST(`/merchant/orders/${catalogOrderId}/accept`, {}, await passwordLogin('01000000002', 'merchant123'));
  check(!wrongOrder.ok, "a merchant cannot touch another store's order");

  // ════════════════════════════════════════════════════════════
  head('F. Dispatch — the right courier, and only them');
  // park every seeded courier offline so the audit controls who is available
  await prisma.courierProfile.updateMany({ data: { isAvailable: false } });
  const courierTok = await otpLogin(drvPhone);
  await PATCH('/courier/availability', { isAvailable: true }, courierTok);
  await PATCH('/courier/heartbeat', { lat: 31.418, lng: 31.813 }, courierTok);

  const queue = await GET('/admin/dispatch/queue', admin);
  check(queue.ok && queue.data?.some((o) => o.orderId === catalogOrderId), 'the unassigned order sits in the dispatch queue');
  const suggest = await GET(`/admin/dispatch/orders/${catalogOrderId}/suggestions`, admin);
  check(suggest.ok && suggest.data?.[0]?.id === driverId, 'the nearest available courier is suggested first');
  check(typeof suggest.data?.[0]?.distanceKm === 'number', 'the suggestion carries a real distance');

  const assign = await POST(`/admin/dispatch/orders/${catalogOrderId}/assign`, { courierId: driverId }, admin);
  check(assign.ok, 'dispatcher assigns the order', JSON.stringify(assign.error));

  const task = await GET('/courier/tasks', courierTok);
  const myTask = task.data?.find((t) => t.orderId === catalogOrderId);
  check(!!myTask, 'the task reaches the courier app');
  check(myTask?.dropoff?.lat === 31.4165, "the customer's pin reaches the courier (map button works)");
  check(myTask?.cashToCollect === 11000, `cash to collect = the order total (${money(11000)})`, `got ${myTask?.cashToCollect}`);

  const strangerTask = await POST(`/courier/tasks/${catalogOrderId}/pickup`, {}, await otpLogin('01000000004'));
  check(!strangerTask.ok, "a courier cannot pick up someone else's task");

  // ════════════════════════════════════════════════════════════
  head('G. Delivery + the money');
  const before = await GET('/courier/wallet', courierTok);
  await POST(`/merchant/orders/${catalogOrderId}/handover`, {}, merch);
  const pickedUp = await POST(`/courier/tasks/${catalogOrderId}/pickup`, {}, courierTok);
  check(pickedUp.ok, 'courier picks up → OUT_FOR_DELIVERY', JSON.stringify(pickedUp.error));
  const delivered = await POST(`/courier/tasks/${catalogOrderId}/delivered`, {}, courierTok);
  check(delivered.ok && delivered.data?.status === 'DELIVERED', 'courier delivers');

  const dbOrder = await prisma.order.findUnique({ where: { id: catalogOrderId } });
  const expectedCommission = Math.round(2000 * 0.15);
  check(dbOrder.platformCommission === expectedCommission,
    `platform commission = 15% of the delivery fee (${money(expectedCommission)})`, `got ${dbOrder.platformCommission}`);
  check(dbOrder.paymentStatus === 'PAID', 'COD is settled on delivery');

  const after = await GET('/courier/wallet', courierTok);
  const earned = after.data.earningsToday - (before.data?.earningsToday ?? 0);
  check(earned === 2000 - expectedCommission,
    `courier earns the fee minus commission (${money(2000 - expectedCommission)})`, `got ${money(earned)}`);
  check(after.data.balanceDue >= expectedCommission,
    `the courier now owes the platform its cut (${money(after.data.balanceDue)})`);

  // ════════════════════════════════════════════════════════════
  head('H. Remittance + the block');
  await PATCH('/admin/errand-pricing', { remittanceLimit: 100 }, admin); // block almost immediately
  const blockedWallet = await GET('/courier/wallet', courierTok);
  check(blockedWallet.data.isBlocked, 'a courier past the remittance limit is blocked');
  await PATCH('/courier/availability', { isAvailable: false }, courierTok);
  const tryOnline = await PATCH('/courier/availability', { isAvailable: true }, courierTok);
  check(!tryOnline.ok, 'a blocked courier cannot go back online ("ورّد الأول")', JSON.stringify(tryOnline.error?.message));

  const owed = blockedWallet.data.balanceDue;
  const remit = await POST(`/admin/drivers/${driverId}/remittances`, { amount: owed, note: 'audit' }, admin);
  check(remit.ok, 'admin records the cash hand-in');
  const cleared = await GET('/courier/wallet', courierTok);
  check(cleared.data.balanceDue === 0, 'the balance clears after remitting', `still ${money(cleared.data.balanceDue)}`);
  check(!cleared.data.isBlocked, 'and the courier is unblocked');
  const backOnline = await PATCH('/courier/availability', { isAvailable: true }, courierTok);
  check(backOnline.ok, 'the courier can work again');
  await PATCH('/admin/errand-pricing', { remittanceLimit: 20000 }, admin); // restore

  // ════════════════════════════════════════════════════════════
  head('I. Errand pricing — the maths, per vehicle');
  const q = (v) => GET(`/errands/quote?zoneId=${zone.id}&lat=31.4165&lng=31.8133${v ? `&vehicleType=${v}` : ''}`, cust);
  const qNorm = (await q()).data;
  const qTri = (await q('TRICYCLE')).data;
  const qPick = (await q('PICKUP')).data;
  const qTruck = (await q('TRUCK')).data;
  check(qNorm.deliveryFee === 1500, `a short مشوار falls back to the minimum fee (${money(qNorm.deliveryFee)})`, `got ${qNorm.deliveryFee}`);
  check(qTri.deliveryFee === Math.round(qNorm.deliveryFee * 2.2), `tricycle = 220% (${money(qTri.deliveryFee)})`, `got ${qTri.deliveryFee}`);
  check(qPick.deliveryFee === Math.round(qNorm.deliveryFee * 4.5), `pickup = 450% (${money(qPick.deliveryFee)})`, `got ${qPick.deliveryFee}`);
  check(qTruck.deliveryFee === Math.round(qNorm.deliveryFee * 7), `truck = 700% (${money(qTruck.deliveryFee)})`, `got ${qTruck.deliveryFee}`);

  // distance actually moves the price
  const far = (await GET(`/errands/quote?zoneId=${zone.id}&lat=31.55&lng=31.95&pickupLat=31.40&pickupLng=31.80`, cust)).data;
  check(far.deliveryFee > qNorm.deliveryFee && far.distanceKm > 5,
    `a longer trip costs more (${far.distanceKm.toFixed(1)}km → ${money(far.deliveryFee)})`);

  // ════════════════════════════════════════════════════════════
  head('J. Errand — buy, and the courier records what they paid');
  const errand = await POST('/errands', {
    instructions: '٢ كيلو طماطم',
    purchaseBudget: 7000,
    dropoff: { addressId },
  }, cust);
  check(errand.ok, 'errand placed', JSON.stringify(errand.error));
  const errandId = errand.data?.id;
  check(errand.data?.subtotal === 0, 'goods cost is unknown at placement (subtotal 0)');
  const errandFee = errand.data?.deliveryFee;

  // auto-offer is fire-and-forget on the server, so give it a beat before reading
  const offered = await waitForOffer(courierTok, errandId);
  check(offered?.orderId === errandId, 'the errand is auto-offered to the online courier');
  check(offered?.deliveryFee === errandFee, 'the offer shows the courier their earning, not the collect amount');

  await POST(`/courier/offer/${errandId}/accept`, {}, courierTok);
  const goods = await POST(`/courier/tasks/${errandId}/goods-cost`, { actualGoodsCost: 6500 }, courierTok);
  check(goods.ok, 'courier records what the goods actually cost');
  await POST(`/courier/tasks/${errandId}/pickup`, {}, courierTok);
  const errandAfter = await GET(`/orders/${errandId}`, cust);
  check(errandAfter.data?.total === 6500 + errandFee,
    `the customer now owes goods + fee (${money(6500 + errandFee)})`, `got ${money(errandAfter.data?.total)}`);
  await POST(`/courier/tasks/${errandId}/delivered`, {}, courierTok);

  // ════════════════════════════════════════════════════════════
  head('K. نقل — only the matching vehicle is offered the job');
  const transport = await POST('/errands', {
    instructions: 'عفش أوضة نوم',
    vehicleType: 'PICKUP',
    pickupText: 'شارع الجلاء', pickupLat: 31.42, pickupLng: 31.81,
    dropoff: { addressId },
  }, cust);
  check(transport.ok, 'نقل order placed', JSON.stringify(transport.error));
  const transportId = transport.data?.id;
  check(transport.data?.deliveryFee === Math.round(qNorm.deliveryFee * 4.5) || transport.data?.deliveryFee > qNorm.deliveryFee,
    `priced for a نص نقل (${money(transport.data?.deliveryFee)})`);

  const wrongVehicle = await GET('/courier/offer', courierTok); // our courier is a TRICYCLE
  check(wrongVehicle.data?.orderId !== transportId, 'a tricycle courier is NOT offered a نص نقل job');

  await PATCH(`/admin/drivers/${driverId}/vehicle`, { vehicleType: 'PICKUP' }, admin);
  // re-offer by toggling availability (a courier coming online sweeps pending orders)
  await PATCH('/courier/availability', { isAvailable: false }, courierTok);
  await PATCH('/courier/availability', { isAvailable: true }, courierTok);
  await new Promise((r) => setTimeout(r, 600));
  const rightVehicle = await waitForOffer(courierTok, transportId);
  check(rightVehicle?.orderId === transportId, 'once they drive a نص نقل, the job reaches them');

  // ════════════════════════════════════════════════════════════
  head('L. Customer app — the rest of the surface');
  const addrList = await GET('/addresses', cust);
  check(addrList.ok && addrList.data.length >= 1, 'address book lists');
  const addr2 = await POST('/addresses', { label: 'الشغل', zoneId: zone.id, street: 'شارع 10' }, cust);
  const madeDefault = await PATCH(`/addresses/${addr2.data.id}`, { isDefault: true }, cust);
  check(madeDefault.data?.isDefault, 'a second address can be made the default');
  const reread = (await GET('/addresses', cust)).data.find((a) => a.id === addressId);
  check(reread && !reread.isDefault, 'the previous default was demoted (only one default)');
  check((await DEL(`/addresses/${addr2.data.id}`, cust)).status === 200, 'an address can be deleted');

  const notifs = await GET('/notifications?limit=50', cust);
  check(notifs.ok && notifs.data.length > 0, `the customer has notifications (${notifs.data?.length})`);
  const unread = await GET('/notifications/unread-count', cust);
  check(typeof unread.data?.count === 'number', `unread count = ${unread.data?.count}`);
  check((await POST('/notifications/read-all', {}, cust)).ok, 'mark-all-read works');
  check((await GET('/notifications/unread-count', cust)).data.count === 0, 'and the count drops to zero');

  const orders = await GET('/orders', cust);
  check(orders.ok && orders.data.length >= 3, `order history lists (${orders.data?.length})`);
  const me = await GET('/me', cust);
  check(me.ok && me.data?.phone, 'profile loads');

  // cancel is only allowed before anyone is on the way
  const fresh = await POST('/errands', { instructions: 'طلب للإلغاء', dropoff: { addressId } }, cust);
  const cancel = await POST(`/orders/${fresh.data.id}/cancel`, { reason: 'غيرت رأيي' }, cust);
  check(cancel.ok && cancel.data?.status === 'CANCELLED', 'a fresh order can be cancelled');
  const cancelAgain = await POST(`/orders/${catalogOrderId}/cancel`, {}, cust);
  check(!cancelAgain.ok, 'a delivered order cannot be cancelled');

  // ════════════════════════════════════════════════════════════
  head('M. Courier app — the rest of the surface');
  const cme = await GET('/courier/me', courierTok);
  check(cme.ok && cme.data.vehicleType === 'PICKUP', 'courier sees which vehicle they are registered for');
  const summary = await GET('/courier/summary/today', courierTok);
  check(summary.ok && summary.data.deliveries >= 2, `today's summary counts the deliveries (${summary.data?.deliveries})`);
  const report = await GET('/courier/report', courierTok);
  check(report.ok && Array.isArray(report.data), 'the daily report loads');
  const reject = await POST(`/courier/offer/${transportId}/reject`, {}, courierTok);
  check(reject.ok, 'an offer can be rejected');
  const goneOffer = await GET('/courier/offer', courierTok);
  check(goneOffer.data?.orderId !== transportId, 'a rejected offer is no longer theirs');

  // ════════════════════════════════════════════════════════════
  head('N. Merchant "اطلب مندوب" — the store\'s own phone order');
  const dr = await POST('/merchant/delivery-requests', {
    zoneId: zone.id, street: 'شارع 12', recipientName: 'أم محمد', recipientPhone: '01012223334', codToCollect: 8000,
  }, merch);
  check(dr.ok, 'merchant requests a courier for their own order', JSON.stringify(dr.error));
  check(dr.data?.total === 8000 + dr.data?.deliveryFee, `the recipient pays goods + fee (${money(dr.data?.total)})`);

  // ════════════════════════════════════════════════════════════
  head('O. RBAC — a scoped staff member');
  const roles = await GET('/admin/roles', admin);
  check(roles.ok && roles.data.length > 0, `preset roles exist (${roles.data?.length})`);
  const perms = await GET('/admin/permissions', admin);
  check(perms.ok && perms.data.length > 0, `the permission catalog loads (${perms.data?.length})`);
  const viewerRole = roles.data.find((r) => (r.permissions ?? []).length > 0 && !(r.permissions ?? []).includes('drivers.manage'));
  const staffPhone = `0155${stamp}0`;
  const staff = await POST('/admin/staff', {
    name: 'موظف محدود', phone: staffPhone, password: 'staff12345', roleIds: viewerRole ? [viewerRole.id] : [],
  }, admin);
  check(staff.ok, 'a staff member is created with a role', JSON.stringify(staff.error));
  if (staff.ok) {
    const staffTok = await passwordLogin(staffPhone, 'staff12345');
    const blocked = await POST('/admin/drivers', { name: 'x', phone: '01099998888', vehicleType: 'MOTORCYCLE' }, staffTok);
    check(!blocked.ok, 'that staff member cannot onboard drivers (no drivers.manage)', `got ${blocked.status}`);
  }
};

main()
  .catch((e) => bad(`AUDIT CRASHED: ${e.message}`))
  .finally(async () => {
    await prisma.$disconnect();
    const bySuite = new Map();
    for (const r of results) {
      const s = bySuite.get(r.suite) ?? { pass: 0, fail: 0 };
      r.pass ? s.pass++ : s.fail++;
      bySuite.set(r.suite, s);
    }
    console.log('\n\x1b[1m════════════ SUMMARY ════════════\x1b[0m');
    for (const [s, v] of bySuite) {
      console.log(`${v.fail === 0 ? '✅' : '❌'} ${s.padEnd(48)} ${v.pass} passed${v.fail ? `, ${v.fail} FAILED` : ''}`);
    }
    const failed = results.filter((r) => !r.pass);
    console.log(`\n${results.length - failed.length} / ${results.length} checks passed`);
    if (failed.length) {
      console.log('\nFailures:');
      for (const f of failed) console.log(`  · [${f.suite}] ${f.m}`);
    }
    process.exit(failed.length ? 1 : 0);
  });
