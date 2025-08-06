
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

const WelcomeScreen = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome! You are logged in.</Text>
      <Button title="Add Booking" onPress={() => navigation.navigate('Booking')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default WelcomeScreen;
