import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/http';
import type { SearchState, SelectedCar } from '../BookingScreen';
import { inr } from '../../utils/format';
import { checkPhone } from '../../services/users';
import { useDebounce } from '../../hooks/useDebounce';
import AutocompleteInput from '../../components/AutocompleteInput';
import { placesAutocomplete } from '../../services/places';

type Props = {
  shared: { search: SearchState; car: SelectedCar | null };
  onBack: () => void;
  onRestart: () => void; // go to step 1 after confirmation
};

export default function Step3Details({ shared, onBack, onRestart }: Props) {
  const { search, car } = shared;

  const [pickupLocation, setPickupLocation] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const debouncedPhone = useDebounce(phone, 400);


  // OTP UI state (same UX as web; OTP = 1234 for testing)
  const [otpModal, setOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [creating, setCreating] = useState(false);
  const otpVerifiedRef = useRef(false);

  useEffect(() => {
  (async () => {
    try {
      const saved = await AsyncStorage.getItem('mobile_number');
      if (saved && !phone) setPhone(saved);
    } catch {}
  })();
}, [phone]);

  useEffect(() => {
  const p = (debouncedPhone || '').trim();
  if (!/^\d{7,15}$/.test(p)) return;
  (async () => {
    try {
      const res = await checkPhone(p);
      if (res?.exists) {
        if (!name && res.name) setName(res.name);
        if (!email && res.email) setEmail(res.email);
      }
    } catch {
      // ignore
    }
  })();
  // include name/email in deps (safe but may run extra times)
}, [debouncedPhone, name, email]);

  const canSubmit = pickupLocation.trim() && name.trim() && email.trim() && /^\d{7,15}$/.test(phone.trim());

  async function sendOtp() {
    // open modal and start timer (align with web behavior)
    setOtpModal(true);
    setOtp('');
    otpVerifiedRef.current = false;
    setOtpTimer(60);
  }

  async function verifyOtpAndCreate() {
    if (otp.trim() !== '1234') {
      Alert.alert('Invalid OTP', 'Use 1234 for testing.');
      return;
    }
    otpVerifiedRef.current = true;
    setOtpModal(false);
    await createBooking();
  }

  // Build the DTO like the web form does (split date/time fields)
  async function createBooking() {
    if (!car) {
      Alert.alert('Select a car', 'Please go back and select a car.');
      return;
    }
    setCreating(true);
    try {
      // Resolve required IDs – these endpoints mirror your web flow (fallbacks are server-side)
      const [citiesRes, vehicleTypesRes, tripTypesRes] = await Promise.all([
        api('/cities'),
        api('/vehicle-types'),
        api('/trip-types').catch(() => new Response(null, { status: 204 })),
      ]);
      const cities = await citiesRes.json();
      const vehs = await vehicleTypesRes.json();
      const trips = tripTypesRes.ok ? await tripTypesRes.json() : [];

      const findCityId = (label: string) => {
        const [name, state] = label.split(',').map((s: string) => s.trim().toLowerCase());
        const match = cities.find((c: any) => c.name?.toLowerCase() === name && c.state?.toLowerCase() === state);
        return match?.id ?? null;
      };
      const findVehicleTypeId = (name: string) => {
        const m = vehs.find((v: any) => (v.name || '').toLowerCase() === name.toLowerCase());
        return m?.id ?? null;
      };
      const findTripTypeId = (label: string) => {
        const m = Array.isArray(trips) ? trips.find((t: any) => (t.name || t.label)?.toLowerCase() === label.toLowerCase()) : null;
        const fallback: Record<string, number> = { 'ONE WAY': 1, 'ROUND TRIP': 2, 'LOCAL': 3, 'AIRPORT': 4 };
        return m?.id ?? fallback[label.toUpperCase()] ?? null;
      };

      const fromCityId = findCityId(search.fromCityName);
      const toCityId = findCityId(search.toCityName);
      const vehicleTypeId = findVehicleTypeId(car.name);
      const tripTypeId = findTripTypeId(search.tripTypeLabel);

      if (!fromCityId || !toCityId || !vehicleTypeId || !tripTypeId) {
        Alert.alert('Error', 'Could not resolve city/vehicle/trip type. Please revise your selection.');
        setCreating(false);
        return;
      }

      const payload = {
        phone,
        pickupLocation,
        dropoffLocation: search.toCityName,
        pickupDate: search.pickupDate, // "YYYY-MM-DD"
        pickupTime: search.pickupTime, // "HH:mm"
        ...(search.tripTypeLabel === 'ROUND TRIP' && search.returnDate ? { returnDate: search.returnDate } : {}),
        ...(search.tripTypeLabel === 'ROUND TRIP' && search.returnTime ? { returnTime: search.returnTime } : {}),
        fromCityId,
        toCityId,
        tripTypeId,
        vehicleTypeId,
        fare: Number(car.price) || 0,
        numPersons: 1,
        numVehicles: 1,
        // you can also send name/email in your DTO if backend accepts
        name,
        email,
      };

      const res = await api('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        Alert.alert('Booking failed', txt || `Status ${res.status}`);
        setCreating(false);
        return;
      }

      // Try to parse id from body/header
      let createdId: number | null = null;
      try {
        const j = await res.json();
        createdId = j?.id ?? null;
      } catch {}
      if (!createdId) {
        const loc = res.headers.get('Location') || res.headers.get('location') || '';
        const last = Number((loc || '').split('/').pop());
        if (Number.isFinite(last)) createdId = last;
      }

      Alert.alert('Booking Confirmed', `Ref ${createdId ?? '—'} • ${car.name} • ${inr(car.price)}`, [
        { text: 'Done', onPress: onRestart },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create booking');
    } finally {
      setCreating(false);
    }
  }

  const onConfirm = async () => {
    if (!canSubmit) {
      Alert.alert('Validation', 'Fill name, email, phone & pickup.');
      return;
    }
    await sendOtp(); // open OTP modal; after verify, create booking
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Enter your details</Text>
      <Text style={styles.sub}>
        {search.fromCityName} → {search.toCityName} • {search.pickupDate} {search.pickupTime ? `• ${search.pickupTime}` : ''}
      </Text>
      {car && <Text style={styles.sub}>Selected: {car.name} • {inr(car.price)}</Text>}

      <AutocompleteInput
        placeholder="Pickup Location (full address)"
        value={pickupLocation}
        onChangeText={setPickupLocation}
        fetcher={placesAutocomplete}
      />
      <View style={{ height: 12 }} />
      <TextInput placeholder="Full Name" style={styles.input} value={name} onChangeText={setName} />
      <TextInput placeholder="Email" style={styles.input} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput placeholder="Phone" style={styles.input} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />

      <View style={{ height: 8 }} />
      <Button title="Confirm Booking" onPress={onConfirm} disabled={creating} />
      <View style={{ height: 8 }} />
      <Button title="Back" onPress={onBack} />

      {/* OTP Modal */}
      <Modal visible={otpModal} transparent animationType="fade" onRequestClose={() => setOtpModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>OTP sent to {phone}</Text>
            <TextInput
              placeholder="Enter OTP"
              style={styles.input}
              keyboardType="numeric"
              value={otp}
              onChangeText={t => setOtp(t.replace(/\D/g, ''))}
            />
            <Text style={{ color: '#666', marginBottom: 8 }}>Testing: use <Text style={{ fontWeight: '700' }}>1234</Text></Text>
            <Button title="Verify OTP" onPress={verifyOtpAndCreate} />
            <View style={{ height: 8 }} />
            <Button title={otpTimer > 0 ? `Resend in 00:${String(otpTimer).padStart(2, '0')}` : 'Resend OTP'} disabled={otpTimer > 0} onPress={sendOtp} />
            <View style={{ height: 8 }} />
            <Button title="Close" onPress={() => setOtpModal(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  sub: { color: '#6b7280', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, marginBottom: 12 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '88%', backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
});
