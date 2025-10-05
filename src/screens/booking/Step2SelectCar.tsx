import React, { useEffect, useState } from 'react';
import { View, Text, Button, ActivityIndicator, FlatList, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { inr } from '../../utils/format';
import type { SelectedCar, SearchState } from '../BookingScreen';
import { listCities, resolveCityId, calcDistanceKm } from '../../services/booking';
import { api } from '../../services/http';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../constants';

// Turn relative paths into absolute (e.g. "/uploads/sedan.jpg" -> "https://api.../uploads/sedan.jpg")
function absolutize(u?: string): string | undefined {
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u) || u.startsWith('data:')) return u;
  const base = (API_BASE_URL || '').replace(/\/+$/, '');
  if (!base) return u; // last resort: return as-is
  return u.startsWith('/') ? `${base}${u}` : `${base}/${u}`;
}

// Try common fields your backend might use for vehicle images
function pickVehicleImage(v: any): string | undefined {
  // flat fields
  const direct =
    v.imageUrl || v.image_url || v.image || v.photoUrl || v.photo ||
    v.picture || v.thumbnail || v.icon || v.coverUrl || v.cover;

  if (direct) return absolutize(String(direct));

  // nested shapes
  if (v.media?.url) return absolutize(String(v.media.url));
  if (Array.isArray(v.images) && v.images[0]?.url) return absolutize(String(v.images[0].url));
  if (Array.isArray(v.photos) && v.photos[0]) return absolutize(String(v.photos[0]));
  if (v.asset?.url) return absolutize(String(v.asset.url));

  return undefined;
}

type VehicleLike = {
  id?: number;
  name?: string;
  baseFare?: number;
  estimatedRatePerKm?: number;
  seatingCapacity?: number;
};

function normalizeList(input: unknown): VehicleLike[] {
  if (Array.isArray(input)) return input as VehicleLike[];

  const j: any = input || {};
  const candidateKeys = ['data', 'items', 'results', 'rows', 'list', 'vehicleTypes'];
  for (const k of candidateKeys) {
    if (Array.isArray(j?.[k])) return j[k] as VehicleLike[];
  }
  // generic: find first array 1–2 levels deep
  for (const k of Object.keys(j)) {
    const v = j[k];
    if (Array.isArray(v)) return v as VehicleLike[];
    if (v && typeof v === 'object') {
      for (const k2 of Object.keys(v)) {
        const v2 = v[k2];
        if (Array.isArray(v2)) return v2 as VehicleLike[];
      }
    }
  }
  return [];
}

export default function Step2SelectCar({
  shared,
  onNext,
  onBack,
}: {
  shared: { search: SearchState; car: SelectedCar | null };
  onNext: (c: SelectedCar) => void;
  onBack: () => void;
}) {
  const { search } = shared;
  const [loading, setLoading] = useState(true);
  const [cars, setCars] = useState<Array<{ id: number; name: string; seats?: number; price: number; imageUrl?: string }>>([]);

  
  useEffect(() => {
  (async () => {
    try {
      // --- (A) show auth + URL info so we know what the phone is doing ---
      const token = await AsyncStorage.getItem('access_token');
      if (__DEV__) {
        console.log('[Step2] API_BASE_URL =', API_BASE_URL);
        console.log('[Step2] token present =', Boolean(token));
      }

      // --- (B) resolve distance like web (optional but keeps parity) ---
      const cities = await listCities();
      const fromCityId = resolveCityId(cities, search.fromCityName);
      const toCityId = resolveCityId(cities, search.toCityName);
      let distanceKm = 0;
      if (fromCityId && toCityId) {
        distanceKm = await calcDistanceKm(fromCityId, toCityId);
      }

      // --- (C) fetch vehicle-types and LOG EVERYTHING safely ---
      const res = await api('/vehicle-types');
      const status = res.status;
      const url = res.url;
      const rawText = await res.clone().text().catch(() => '');

      if (__DEV__) {
        console.log('[Step2] GET /vehicle-types ->', status, url);
        console.log('[Step2] body (first 800 chars):', rawText.slice(0, 800));
      }

      // Try to parse JSON; fall back to empty object
      let json: unknown = {};
      try { json = JSON.parse(rawText); } catch {}

      // --- (D) normalize shape into an array before mapping ---
      const list = normalizeList(json);
      if (__DEV__) console.log('[Step2] normalized count:', list.length);

      // --- (E) map to UI and compute fare like web ---
      const mapped = list
  .map((v) => {
    const id = Number((v as any)?.id ?? 0);
    const name = String((v as any)?.name ?? '');
    const base = Number((v as any)?.baseFare ?? 0);
    const rate = Number((v as any)?.estimatedRatePerKm ?? 0);
    const seats = (v as any)?.seatingCapacity;

    const price = Math.round(base + (Number.isFinite(distanceKm) ? distanceKm : 0) * rate);
    const imageUrl = pickVehicleImage(v);

    return id && name ? { id, name, seats, price, imageUrl } : null;
  })
  .filter(Boolean) as Array<{ id: number; name: string; seats?: number; price: number; imageUrl?: string }>;


      // --- (F) user feedback when empty, with reason hints ---
      if (mapped.length === 0 && __DEV__) {
        console.log('[Step2] No vehicles after mapping. Status=', status);
        if (status === 401 || status === 403) {
          console.log('[Step2] Authentication issue. Ensure access_token is saved at login.');
        }
        if (status >= 500) {
          console.log('[Step2] Server error. Check API logs.');
        }
      }

      setCars(mapped);
    } catch (e) {
      console.log('load cars failed', e);
      setCars([]);
    } finally {
      setLoading(false);
    }
  })();
// re-run if cities change (or use [] and eslint-disable if you prefer single run)
}, [search.fromCityName, search.toCityName]);


  if (loading) {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>
        {search.fromCityName} → {search.toCityName}
      </Text>
      <Text style={styles.sub}>
        Pickup: {search.pickupDate} • {search.pickupTime} • {search.tripTypeLabel}
      </Text>

      <FlatList
        data={cars}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.img} /> : <View style={styles.imgPlaceholder} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.carName}>{item.name}</Text>
              {item.seats ? <Text style={styles.carMeta}>{item.seats} seats • AC</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.price}>{inr(item.price)}</Text>
              <TouchableOpacity onPress={() => onNext({ id: item.id, name: item.name, price: item.price })} style={styles.selectBtn}>
                <Text style={{ color: '#fff', fontWeight: '600'}}>Select</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#666', marginTop: 24 }}>No vehicle types available.</Text>}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />

      <View style={{ height: 8 }} />
      <Button title="Back" onPress={onBack} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '600' },
  sub: { color: '#666', marginBottom: 8 },
  card: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, alignItems: 'center', backgroundColor: '#fff' },
  img: { width: 72, height: 56, marginRight: 12, borderRadius: 8, resizeMode: 'cover' },
  imgPlaceholder: { width: 72, height: 56, marginRight: 12, borderRadius: 8, backgroundColor: '#eee' },
  carName: { fontSize: 16, fontWeight: '600' },
  carMeta: { color: '#6b7280', marginTop: 2 },
  price: { fontSize: 18, fontWeight: '700', color: '#1d4ed8' },
  selectBtn: { marginTop: 6, backgroundColor: '#ea580c', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
});
