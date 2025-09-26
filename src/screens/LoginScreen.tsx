// src/screens/LoginScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  Button,
  Text,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { API_BASE_URL } from '../constants';

type Props = { navigation: any };

const LoginScreen = ({ navigation }: Props) => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get FCM token
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

  const sendOtp = async () => {
    if (!mobileNumber || mobileNumber.trim().length < 8) {
      Alert.alert('Validation', 'Please enter a valid mobile number.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: mobileNumber.trim(),
          deviceToken, // include if your backend uses it for push/login
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to send OTP');
      }

      setIsOtpSent(true);
      Alert.alert('OTP Sent', 'A one-time password has been sent to your phone.');
    } catch (e: any) {
      console.error('send-otp error:', e);
      Alert.alert('Error', e.message || 'Could not send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp || otp.trim().length < 4) {
      Alert.alert('Validation', 'Please enter the OTP.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: mobileNumber.trim(),
          otp: otp.trim(),
          deviceToken,
        }),
      });

      const data = await res.json().catch(() => ({}));
      console.log('verify-otp response:', { status: res.status, data });

      if (res.ok) {
        Alert.alert('Success', 'Login successful!');
        navigation.navigate('Booking');
      } else {
        Alert.alert('Login Failed', data?.message || 'Invalid OTP.');
      }
    } catch (e: any) {
      console.error('verify-otp error:', e);
      Alert.alert('Error', 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const resend = () => {
    // optional: clear old OTP field and send again
    setOtp('');
    sendOtp();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login with OTP</Text>

      {/* Mobile Number (always visible; locked after OTP is sent) */}
      <TextInput
        placeholder="Mobile number"
        value={mobileNumber}
        onChangeText={setMobileNumber}
        keyboardType="phone-pad"
        editable={!isOtpSent} // lock after OTP is sent
        style={[styles.input, isOtpSent && styles.inputDisabled]}
      />

      {/* Step-specific UI */}
      {!isOtpSent ? (
        <Button title={loading ? 'Sending...' : 'Send OTP'} onPress={sendOtp} disabled={loading} />
      ) : (
        <>
          <TextInput
            placeholder="Enter OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.input}
          />
          <Button title={loading ? 'Verifying...' : 'Verify OTP'} onPress={verifyOtp} disabled={loading} />
          <View style={{ height: 10 }} />
          <Button title="Resend OTP" onPress={resend} disabled={loading} />
        </>
      )}

      {loading && <ActivityIndicator style={{ marginTop: 16 }} />}

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
  title: { fontSize: 22, marginBottom: 16, textAlign: 'center', fontWeight: '600' },
  input: { borderWidth: 1, marginBottom: 12, padding: 10, borderRadius: 6, borderColor: '#ccc' },
  inputDisabled: { backgroundColor: '#f2f2f2' },
  tokenText: { marginTop: 20, fontSize: 10, color: 'gray' },
});

export default LoginScreen;
