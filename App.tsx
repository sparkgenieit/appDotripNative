// App.tsx
import React, { useEffect, useState } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation'; // assumes default export from index.tsx

const App = () => {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const initFCM = async () => {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn('Notification permission not granted');
            return;
          }
        }

        const fcmToken = await messaging().getToken();
        setToken(fcmToken);
        console.log('📱 FCM Token:', fcmToken);

        await messaging().subscribeToTopic('all');

        const unsubscribe = messaging().onMessage(async remoteMessage => {
          Alert.alert('🔔 New Notification', remoteMessage.notification?.body || '');
        });

        return unsubscribe;
      } catch (err) {
        console.error('FCM init error:', err);
      }
    };

    initFCM();
  }, []);

  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
};

export default App;
