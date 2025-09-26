import { api } from './http';

export type City = { id: number; name: string; state?: string };
export type VehicleType = {
  id: number;
  name: string;
  baseFare: number;
  estimatedRatePerKm: number;
  seatingCapacity?: number;
};

function toArray<T = any>(j: any): T[] {
  if (Array.isArray(j)) return j as T[];
  if (Array.isArray(j?.data)) return j.data as T[];
  if (Array.isArray(j?.items)) return j.items as T[];
  if (Array.isArray(j?.results)) return j.results as T[];
  return [];
}

export async function listCities(): Promise<City[]> {
  const r = await api('/cities');
  if (!r.ok) return [];
  const j = await r.json().catch(() => null);
  return toArray<City>(j);
}

/** Return raw JSON (unknown) — screen will normalize it */
export async function listVehicleTypesRaw(): Promise<unknown> {
  const r = await api('/vehicle-types');
  if (!r.ok) return [];
  return r.json().catch(() => []);
}

export async function calcDistanceKm(fromCityId: number, toCityId: number): Promise<number> {
  try {
    const r = await api('/cities/calculate-distance', {
      method: 'POST',
      body: JSON.stringify({ cityIds: [fromCityId, toCityId] }),
    });
    if (!r.ok) return 0;
    const j = await r.json().catch(() => null);
    const root = (j as any)?.data ?? j ?? {};
    const km = Number(root.optimizedTotalDistanceKm ?? root.originalTotalDistanceKm ?? 0);
    return Number.isFinite(km) ? km : 0;
  } catch {
    return 0;
  }
}

export function resolveCityId(cities: City[], label: string): number | null {
  const [nameRaw, stateRaw] = (label || '').split(',').map(s => s.trim().toLowerCase());
  const match = cities.find(
    c =>
      (c.name || '').toLowerCase() === (nameRaw || '') &&
      (!stateRaw || (c.state || '').toLowerCase() === stateRaw)
  );
  return match?.id ?? null;
}
