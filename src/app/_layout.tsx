import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useDataStore } from '@/store/dataStore';

export default function RootLayout() {
  const hydrated = useDataStore((s) => s.hydrated);
  const hydrate = useDataStore((s) => s.hydrate);

  useEffect(() => {
    hydrate().catch((error) => {
      console.error('Failed to load database', error);
    });
  }, [hydrate]);

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.textInverse,
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="feature/new" options={{ title: 'Save to map' }} />
        <Stack.Screen name="feature/[id]" options={{ title: 'Details' }} />
        <Stack.Screen name="categories" options={{ title: 'Categories' }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    gap: 12,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
});
