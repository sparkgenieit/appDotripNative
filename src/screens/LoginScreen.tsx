// src/screens/LoginScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Button,
  Text,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { API_BASE_URL } from '../constants';

const LoginScreen = ({ navigation }: any) => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [deviceToken, setDeviceToken] = useState<string | null>(null);

  useEffect(() => {
    const getFCMToken = async () => {
      try {
        if (Platform.OS === 'android') {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
        }

        const token = await messaging().getToken();
        setDeviceToken(token);
        console.log('📱 FCM Token:', token);
      } catch (error) {
        console.error('FCM Token error:', error);
      }
    };

    getFCMToken();
  }, []);

  const handleLogin = async () => {
    if (!mobile || !password) {
      Alert.alert('Validation', 'Please enter mobile and password');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile,
          password,
          deviceToken,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Login successful!');
        navigation.navigate('Booking');
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Something went wrong.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        placeholder="Mobile"
        value={mobile}
        onChangeText={setMobile}
        keyboardType="phone-pad"
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <Button title="Login" onPress={handleLogin} />
      {deviceToken && (
        <Text selectable style={styles.tokenText}>
          Token: {deviceToken}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, marginBottom: 15, padding: 10, borderRadius: 5 },
  tokenText: { marginTop: 20, fontSize: 10, color: 'gray' },
});

export default LoginScreen;
