// src/screens/BookingScreen.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

const BookingScreen = () => {
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [tripType, setTripType] = useState('One Way');
  const [vehicleType, setVehicleType] = useState('Sedan');

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-CA'); // YYYY-MM-DD

  const formatTime = (t: Date) =>
    t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); // HH:MM

  const handleBooking = () => {
    if (!pickup || !drop || !date || !time) {
      Alert.alert('Missing Fields', 'Please fill all booking details.');
      return;
    }
    Alert.alert(
      'Booking Confirmed',
      `Trip: ${tripType}\nVehicle: ${vehicleType}\nFrom ${pickup} to ${drop} on ${formatDate(date)} at ${formatTime(time)}`
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Book a Ride</Text>

      <TextInput
        style={styles.input}
        placeholder="Pickup Location"
        value={pickup}
        onChangeText={setPickup}
      />
      <TextInput
        style={styles.input}
        placeholder="Drop Location"
        value={drop}
        onChangeText={setDrop}
      />

      <Text style={styles.label}>Trip Date</Text>
      <Button title={formatDate(date)} onPress={() => setShowDatePicker(true)} />
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}

      <Text style={styles.label}>Trip Time</Text>
      <Button title={formatTime(time)} onPress={() => setShowTimePicker(true)} />
      {showTimePicker && (
        <DateTimePicker
          value={time}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selectedTime) => {
            setShowTimePicker(false);
            if (selectedTime) setTime(selectedTime);
          }}
        />
      )}

      <Text style={styles.label}>Trip Type</Text>
      <Picker
        selectedValue={tripType}
        style={styles.picker}
        onValueChange={(itemValue) => setTripType(itemValue)}
      >
        <Picker.Item label="One Way" value="One Way" />
        <Picker.Item label="Round Trip" value="Round Trip" />
      </Picker>

      <Text style={styles.label}>Vehicle Type</Text>
      <Picker
        selectedValue={vehicleType}
        style={styles.picker}
        onValueChange={(itemValue) => setVehicleType(itemValue)}
      >
        <Picker.Item label="Sedan" value="Sedan" />
        <Picker.Item label="SUV" value="SUV" />
        <Picker.Item label="Hatchback" value="Hatchback" />
      </Picker>

      <Button title="Confirm Booking" onPress={handleBooking} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 4,
  },
  picker: {
    marginBottom: 16,
  },
});

export default BookingScreen;
