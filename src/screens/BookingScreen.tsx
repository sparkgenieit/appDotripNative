// src/screens/BookingScreen.tsx
import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Step1Search from './booking/Step1Search';
import Step2SelectCar from './booking/Step2SelectCar';
import Step3Details from './booking/Step3Details';

export type TripTypeLabel = 'ONE WAY' | 'ROUND TRIP' | 'LOCAL' | 'AIRPORT';

export type SearchState = {
  tripTypeLabel: TripTypeLabel;
  fromCityName: string;
  toCityName: string;
  pickupDate: string; // "YYYY-MM-DD"
  pickupTime: string; // "HH:mm"
  // optional for round trip
  returnDate?: string;
  returnTime?: string;
};

export type SelectedCar = {
  id?: number;
  name: string;
  price: number;
};

const BookingScreen = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [search, setSearch] = useState<SearchState>({
    tripTypeLabel: 'ONE WAY',
    fromCityName: '',
    toCityName: '',
    pickupDate: '',
    pickupTime: '',
  });
  const [car, setCar] = useState<SelectedCar | null>(null);

  const goStep2 = (s: SearchState) => {
    setSearch(s);
    setStep(2);
  };
  const goStep3 = (c: SelectedCar) => {
    setCar(c);
    setStep(3);
  };
  const restart = () => {
    setStep(1);
    setCar(null);
  };

  const shared = useMemo(() => ({ search, car }), [search, car]);

  return (
    <View style={styles.container}>
      {step === 1 && <Step1Search onNext={goStep2} initial={search} />}
      {step === 2 && <Step2SelectCar shared={shared} onNext={goStep3} onBack={() => setStep(1)} />}
      {step === 3 && <Step3Details shared={shared} onBack={() => setStep(2)} onRestart={restart} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});

export default BookingScreen;