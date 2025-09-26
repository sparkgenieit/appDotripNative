import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { toYMD, toHHmm } from '../../utils/format';
import type { SearchState, TripTypeLabel } from '../BookingScreen';
import AutocompleteInput from '../../components/AutocompleteInput';
import { placesAutocomplete } from '../../services/places';

const tripTypes: TripTypeLabel[] = ['ONE WAY', 'ROUND TRIP', 'LOCAL', 'AIRPORT'];

export default function Step1Search({
  onNext,
  initial,
}: {
  onNext: (s: SearchState) => void;
  initial: SearchState;
}) {
  const [tripTypeLabel, setTripTypeLabel] = useState<TripTypeLabel>(initial.tripTypeLabel);
  const [fromCityName, setFromCityName] = useState(initial.fromCityName);
  const [toCityName, setToCityName] = useState(initial.toCityName);

  const [date, setDate] = useState(() => (initial.pickupDate ? new Date(initial.pickupDate) : new Date()));
  const [time, setTime] = useState(() => {
    if (initial.pickupTime) {
      const [h, m] = initial.pickupTime.split(':').map(Number);
      const d = new Date(); d.setHours(h || 0, m || 0, 0, 0); return d;
    }
    return new Date();
  });
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [returnTime, setReturnTime] = useState<Date | null>(null);
  const [showRDate, setShowRDate] = useState(false);
  const [showRTime, setShowRTime] = useState(false);

  const proceed = () => {
    if (!fromCityName.trim() || !toCityName.trim()) {
      Alert.alert('Validation', 'Please enter both FROM and TO cities.');
      return;
    }
    onNext({
      tripTypeLabel,
      fromCityName: fromCityName.trim(),
      toCityName: toCityName.trim(),
      pickupDate: toYMD(date),
      pickupTime: toHHmm(time),
      ...(tripTypeLabel === 'ROUND TRIP' && returnDate
        ? { returnDate: toYMD(returnDate), returnTime: returnTime ? toHHmm(returnTime) : undefined }
        : {}),
    });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Find the Perfect Ride</Text>
      <View style={styles.row}>
        {tripTypes.map(t => (
          <Text
            key={t}
            onPress={() => setTripTypeLabel(t)}
            style={[styles.chip, tripTypeLabel === t ? styles.chipActive : null]}
          >
            {t}
          </Text>
        ))}
      </View>

      <AutocompleteInput
        placeholder="FROM (city, state)"
        value={fromCityName}
        onChangeText={setFromCityName}
        fetcher={placesAutocomplete}
      />

      <View style={{ height: 10 }} />

      <AutocompleteInput
        placeholder="TO (city, state)"
        value={toCityName}
        onChangeText={setToCityName}
        fetcher={placesAutocomplete}
      />

      <Text style={styles.label}>PICKUP DATE</Text>
      <Button title={toYMD(date)} onPress={() => setShowDate(true)} />
      {showDate && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => { setShowDate(false); if (d) setDate(d); }}
        />
      )}

      <Text style={styles.label}>PICKUP TIME</Text>
      <Button title={toHHmm(time)} onPress={() => setShowTime(true)} />
      {showTime && (
        <DateTimePicker
          value={time}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => { setShowTime(false); if (d) setTime(d); }}
        />
      )}

      {tripTypeLabel === 'ROUND TRIP' && (
        <>
          <Text style={styles.label}>RETURN DATE</Text>
          <Button title={returnDate ? toYMD(returnDate) : 'Select'} onPress={() => setShowRDate(true)} />
          {showRDate && (
            <DateTimePicker
              value={returnDate || date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => { setShowRDate(false); if (d) setReturnDate(d); }}
            />
          )}

          <Text style={styles.label}>RETURN TIME</Text>
          <Button title={returnTime ? toHHmm(returnTime) : 'Select'} onPress={() => setShowRTime(true)} />
          {showRTime && (
            <DateTimePicker
              value={returnTime || time}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => { setShowRTime(false); if (d) setReturnTime(d); }}
            />
          )}
        </>
      )}

      <View style={{ height: 16 }} />
      <Button title="EXPLORE CABS" onPress={proceed} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#eee', margin: 4 },
  chipActive: { backgroundColor: '#2563eb', color: '#fff' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 6, marginBottom: 10 },
  label: { marginTop: 10, marginBottom: 6, fontWeight: '500' },
});
