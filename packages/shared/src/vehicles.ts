import { VEHICLE_TYPES } from './enums';
import type { VehicleType } from './enums';

/**
 * The vehicle catalog — one row per thing a courier can drive, ordered small →
 * big. The customer picks from these when asking for نقل; the admin prices them
 * by multiplier so there is still ONE fee formula (base + per-km) to reason about.
 */
export interface VehicleMeta {
  type: VehicleType;
  labelAr: string;
  /** what it realistically carries — shown under the label so the choice is obvious */
  hintAr: string;
  /** share of the normal fee, in percent (100 = same price as a motorcycle) */
  defaultMultiplier: number;
}

/** The default — every مشوار that doesn't ask for a bigger vehicle rides this. */
const MOTORCYCLE: VehicleMeta = {
  type: 'MOTORCYCLE',
  labelAr: 'موتوسيكل',
  hintAr: 'أكل، دوا، ورق، طرود صغيرة',
  defaultMultiplier: 100,
};

export const VEHICLES: readonly VehicleMeta[] = [
  MOTORCYCLE,
  {
    type: 'TRICYCLE',
    labelAr: 'تروسيكل',
    hintAr: 'كراتين، بضاعة، غسالة، تلاجة',
    defaultMultiplier: 220,
  },
  {
    type: 'PICKUP',
    labelAr: 'نص نقل',
    hintAr: 'عفش أوضة، بضاعة كتير',
    defaultMultiplier: 450,
  },
  {
    type: 'TRUCK',
    labelAr: 'عربية نقل',
    hintAr: 'عفش شقة كاملة',
    defaultMultiplier: 700,
  },
] as const;

const BY_TYPE = new Map<VehicleType, VehicleMeta>(VEHICLES.map((v) => [v.type, v]));

export const vehicleMeta = (t: VehicleType): VehicleMeta => BY_TYPE.get(t) ?? MOTORCYCLE;
export const vehicleLabel = (t: VehicleType): string => vehicleMeta(t).labelAr;

/** Default price multipliers, ready to seed into a ServiceType config. */
export const defaultVehicleMultipliers = (): Record<VehicleType, number> =>
  Object.fromEntries(VEHICLES.map((v) => [v.type, v.defaultMultiplier])) as Record<VehicleType, number>;

/** The vehicles a نقل order can ask for — everything above a motorcycle. */
export const TRANSPORT_VEHICLES = VEHICLES.filter((v) => v.type !== 'MOTORCYCLE');

export const isVehicleType = (v: string): v is VehicleType =>
  (VEHICLE_TYPES as readonly string[]).includes(v);
