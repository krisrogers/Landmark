/**
 * Main map screen.
 *
 * - Shows your position and all saved features on a satellite map
 * - Drop a pin at your current location
 * - Walk an area/path with GPS breadcrumbs
 * - Filter by category, jump into feature details
 */
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE, type MapType } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryFilterBar } from '@/components/CategoryFilterBar';
import { FeatureOverlays } from '@/components/FeatureOverlays';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { useWalkTracking } from '@/hooks/useWalkTracking';
import {
  createLineGeometry,
  createPointGeometry,
  createPolygonGeometry,
  formatDistance,
  type LatLng,
} from '@/lib/geo';
import type { Feature } from '@/lib/types';
import { useCaptureStore } from '@/store/captureStore';
import { useDataStore } from '@/store/dataStore';

const DEFAULT_REGION = {
  // Roughly Australia; replaced by the user's position as soon as we have it.
  latitude: -25.27,
  longitude: 133.77,
  latitudeDelta: 40,
  longitudeDelta: 40,
};

const CLOSE_ZOOM = { latitudeDelta: 0.004, longitudeDelta: 0.004 };

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const features = useDataStore((s) => s.features);
  const categories = useDataStore((s) => s.categories);
  const categoryFilter = useDataStore((s) => s.categoryFilter);
  const setCategoryFilter = useDataStore((s) => s.setCategoryFilter);

  const setDraftGeometry = useCaptureStore((s) => s.setDraftGeometry);

  const { getCurrentPosition, busy: locating } = useCurrentLocation();
  const tracking = useWalkTracking();

  const [mapType, setMapType] = useState<MapType>('hybrid');
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  const visibleFeatures = useMemo(() => {
    if (categoryFilter === undefined) return features;
    return features.filter((f) => f.categoryId === categoryFilter);
  }, [features, categoryFilter]);

  // Ask for location permission and center on the user when the app opens.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled || status !== 'granted') return;
      setHasLocationPermission(true);
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        mapRef.current?.animateToRegion(
          {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            ...CLOSE_ZOOM,
          },
          800
        );
      } catch {
        // Stay on the default region if we can't get a fix.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openFeature = (feature: Feature) => {
    router.push({ pathname: '/feature/[id]', params: { id: feature.id } });
  };

  const dropPin = async () => {
    const position = await getCurrentPosition();
    if (!position) {
      Alert.alert(
        'No GPS fix',
        'Could not get your position. Check that location is enabled and try again.'
      );
      return;
    }
    setDraftGeometry(createPointGeometry(position));
    router.push('/feature/new');
  };

  const startWalk = async () => {
    const started = await tracking.start();
    if (!started) {
      Alert.alert(
        'Location permission needed',
        'Walking an area needs access to your location while using the app.'
      );
    }
  };

  const finishWalk = () => {
    const points = tracking.stop();

    if (points.length < 2) {
      Alert.alert(
        'Not enough GPS points',
        'Walk a bit further before finishing – at least a few metres are needed.'
      );
      return;
    }

    const saveAs = (kind: 'area' | 'path', pts: LatLng[]) => {
      setDraftGeometry(kind === 'area' ? createPolygonGeometry(pts) : createLineGeometry(pts));
      router.push('/feature/new');
    };

    if (points.length < 3) {
      saveAs('path', points);
      return;
    }

    Alert.alert('Save walk', 'How should this walk be saved?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Path / line', onPress: () => saveAs('path', points) },
      { text: 'Area (close the loop)', onPress: () => saveAs('area', points) },
    ]);
  };

  const cancelWalk = () => {
    Alert.alert('Discard walk?', 'The recorded GPS trail will be lost.', [
      { text: 'Keep walking', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: tracking.cancel },
    ]);
  };

  const isTracking = tracking.status !== 'idle';

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={DEFAULT_REGION}
        mapType={mapType}
        showsUserLocation={hasLocationPermission}
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        <FeatureOverlays
          features={visibleFeatures}
          categories={categories}
          onPressFeature={openFeature}
        />
        {isTracking && tracking.points.length > 1 && (
          <Polyline
            coordinates={tracking.points}
            strokeColor={Colors.trackingStroke}
            strokeWidth={5}
          />
        )}
      </MapView>

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        {isTracking ? (
          <View style={styles.trackingStats}>
            <Text style={styles.trackingStatsText}>
              🚶 {formatDistance(tracking.distanceMeters)} · {tracking.points.length} points
              {tracking.accuracy !== null ? ` · ±${Math.round(tracking.accuracy)}m` : ''}
            </Text>
          </View>
        ) : (
          <View style={styles.topRow}>
            <View style={styles.filterWrapper}>
              <CategoryFilterBar
                categories={categories}
                selected={categoryFilter}
                onSelect={setCategoryFilter}
              />
            </View>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/categories')}
              accessibilityLabel="Manage categories"
            >
              <Text style={styles.iconButtonText}>🗂️</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Map type toggle */}
      <TouchableOpacity
        style={[styles.mapTypeButton, { top: insets.top + 70 }]}
        onPress={() => setMapType(mapType === 'hybrid' ? 'standard' : 'hybrid')}
        accessibilityLabel="Toggle satellite view"
      >
        <Text style={styles.iconButtonText}>{mapType === 'hybrid' ? '🗺️' : '🛰️'}</Text>
      </TouchableOpacity>

      {/* Bottom actions */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }]}>
        {isTracking ? (
          <>
            <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={cancelWalk}>
              <Text style={styles.actionButtonText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.finishButton]} onPress={finishWalk}>
              <Text style={styles.actionButtonText}>Finish walk</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={dropPin}
              disabled={locating}
            >
              <Text style={styles.actionButtonText}>{locating ? 'Locating…' : '📍 Drop pin'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={startWalk}>
              <Text style={styles.actionButtonText}>🚶 Walk area</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterWrapper: {
    flex: 1,
  },
  iconButton: {
    backgroundColor: Colors.overlayBackground,
    borderRadius: BorderRadius.full,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  iconButtonText: {
    fontSize: 20,
  },
  mapTypeButton: {
    position: 'absolute',
    right: Spacing.md,
    backgroundColor: Colors.overlayBackground,
    borderRadius: BorderRadius.full,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingStats: {
    alignSelf: 'center',
    backgroundColor: Colors.overlayBackground,
    borderRadius: BorderRadius.full,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  trackingStatsText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  finishButton: {
    backgroundColor: Colors.trackingStroke,
  },
  cancelButton: {
    backgroundColor: Colors.overlayBackground,
  },
  actionButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
});
