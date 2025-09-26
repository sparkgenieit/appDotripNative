// src/services/places.ts
import { api } from './http';

export type Suggestion = { id?: string | number; label: string };

export async function placesAutocomplete(query: string): Promise<Suggestion[]> {
  if (!query || query.trim().length < 2) return [];
  const res = await api(`/places/autocomplete?input=${encodeURIComponent(query.trim())}`);
  if (!res.ok) return [];
  const j = await res.json().catch(() => null);

  // Be flexible with backend response shapes
  // 1) { predictions: [{ description }] }
  if (j?.predictions && Array.isArray(j.predictions)) {
    return j.predictions.map((p: any, idx: number) => ({
      id: p.place_id ?? idx,
      label: p.description ?? '',
    })).filter((s: Suggestion) => s.label);
  }
  // 2) [{ city, state }] or [{ label }]
  if (Array.isArray(j)) {
    return j
      .map((r: any, idx: number) => {
        const label = r.label ?? [r.city, r.state].filter(Boolean).join(', ');
        return label ? { id: r.id ?? idx, label } : null;
      })
      .filter(Boolean);
  }
  // Fallback empty
  return [];
}
