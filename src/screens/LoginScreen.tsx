// src/screens/LoginScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
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
const OTP_LENGTH = 4;

const LoginScreen = ({ navigation }: Props) => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP as 4 separate boxes
  const [otpDigits, setOtpDigits] = useState<string[]>(
    Array(OTP_LENGTH).fill('')
  );
  const otpRefs = useRef<Array<TextInput | null>>([]);

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

  const resetOtp = () => {
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setTimeout(() => otpRefs.current[0]?.focus(), 50);
  };

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
          deviceToken,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to send OTP');

      setIsOtpSent(true);
      resetOtp(); // clear boxes & focus first
      Alert.alert('OTP Sent', 'A one-time password has been sent to your phone.');
    } catch (e: any) {
      console.error('send-otp error:', e);
      Alert.alert('Error', e.message || 'Could not send OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Handles single char input and multi-char paste
  const handleOtpChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');

    // PASTE: fill forward
    if (clean.length > 1) {
      const next = [...otpDigits];
      let i = index;
      for (const ch of clean.slice(0, OTP_LENGTH)) {
        if (i >= OTP_LENGTH) break;
        next[i] = ch;
        i++;
      }
      setOtpDigits(next);
      const firstEmpty = next.findIndex((d) => d === '');
      const focusIndex = firstEmpty === -1 ? OTP_LENGTH - 1 : firstEmpty;
      otpRefs.current[focusIndex]?.focus();
      return;
    }

    // Single key
    const next = [...otpDigits];
    next[index] = clean.slice(-1);
    setOtpDigits(next);
    if (clean && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (index: number, e: any) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (otpDigits[index] === '' && index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    }
  };

  const verifyOtp = async () => {
    const otp = otpDigits.join('');
    if (otp.length !== OTP_LENGTH) {
      Alert.alert('Validation', `Please enter the ${OTP_LENGTH}-digit OTP.`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: mobileNumber.trim(),
          otp,
          deviceToken,
        }),
      });

      const data = await res.json().catch(() => ({}));
      console.log('verify-otp response:', { status: res.status, data });

      const failed =
        !res.ok ||
        data?.success === false ||
        data?.valid === false ||
        data?.ok === false;

      if (failed) {
        Alert.alert('Login Failed', data?.message || 'Invalid OTP. Please try again.');
        resetOtp(); // ⬅️ clear on invalid
        return;
      }

      Alert.alert('Success', 'Login successful!');
      navigation.navigate('Booking');
    } catch (e) {
      console.error('verify-otp error:', e);
      Alert.alert('Error', 'Something went wrong.');
      resetOtp(); // ⬅️ also clear on network/other errors
    } finally {
      setLoading(false);
    }
  };

  const resend = () => {
    resetOtp();
    sendOtp();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login with OTP</Text>

      {/* Mobile number (locked after OTP is sent) */}
      <TextInput
        placeholder="Mobile number"
        value={mobileNumber}
        onChangeText={setMobileNumber}
        keyboardType="phone-pad"
        editable={!isOtpSent}
        style={[styles.input, isOtpSent && styles.inputDisabled]}
      />

      {!isOtpSent ? (
        <Button
          title={loading ? 'Sending...' : 'Send OTP'}
          onPress={sendOtp}
          disabled={loading}
        />
      ) : (
        <>
          <Text style={styles.label}>Enter OTP</Text>
          <View style={styles.otpRow}>
            {Array.from({ length: OTP_LENGTH }).map((_, i) => (
              <TextInput
                key={i}
                ref={(r) => (otpRefs.current[i] = r)}
                style={styles.otpBox}
                value={otpDigits[i]}
                onChangeText={(t) => handleOtpChange(i, t)}
                onKeyPress={(e) => handleOtpKeyPress(i, e)}
                keyboardType="number-pad"
                maxLength={1}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                importantForAutofill="yes"
                returnKeyType={i === OTP_LENGTH - 1 ? 'done' : 'next'}
              />
            ))}
          </View>

          <Button
            title={loading ? 'Verifying...' : 'Verify OTP'}
            onPress={verifyOtp}
            disabled={loading}
          />
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
  label: { marginTop: 12, marginBottom: 8, fontWeight: '500' },
  input: { borderWidth: 1, marginBottom: 12, padding: 10, borderRadius: 6, borderColor: '#ccc' },
  inputDisabled: { backgroundColor: '#f2f2f2' },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  otpBox: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 20,
  },
  tokenText: { marginTop: 20, fontSize: 10, color: 'gray' },
});

export default LoginScreen;
