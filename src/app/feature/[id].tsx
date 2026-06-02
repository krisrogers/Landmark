/**
 * Feature detail: photos, notes, location summary, edit and delete.
 */
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

import { FeatureOverlays } from '@/components/FeatureOverlays';
import { BorderRadius, Colors, Spacing, UncategorizedColor } from '@/constants/theme';
import { describeGeometry, geometryCenter, geometryToLatLngs } from '@/lib/geo';
import { photoUri } from '@/lib/photoStorage';
import { useDataStore } from '@/store/dataStore';

export default function FeatureDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const features = useDataStore((s) => s.features);
  const categories = useDataStore((s) => s.categories);
  const deleteFeature = useDataStore((s) => s.deleteFeature);

  const feature = useMemo(() => features.find((f) => f.id === id), [features, id]);

  if (!feature) {
    // Deleted (or bad link) – nothing to show.
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>This item no longer exists.</Text>
      </View>
    );
  }

  const category = categories.find((c) => c.id === feature.categoryId);
  const center = geometryCenter(feature.geometry);

  // Region that fits the geometry with a little padding.
  const coords = geometryToLatLngs(feature.geometry);
  const lats = coords.map((c) => c.latitude);
  const lngs = coords.map((c) => c.longitude);
  const region = {
    latitude: center.latitude,
    longitude: center.longitude,
    latitudeDelta: Math.max((Math.max(...lats) - Math.min(...lats)) * 1.8, 0.002),
    longitudeDelta: Math.max((Math.max(...lngs) - Math.min(...lngs)) * 1.8, 0.002),
  };

  const confirmDelete = () => {
    Alert.alert('Delete', `Delete "${feature.name}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteFeature(feature.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: feature.name }} />
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        {/* Mini map */}
        <View style={styles.mapWrapper}>
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={region}
            mapType="hybrid"
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            toolbarEnabled={false}
          >
            <FeatureOverlays
              features={[feature]}
              categories={categories}
              onPressFeature={() => {}}
            />
          </MapView>
        </View>

        {/* Summary */}
        <View style={styles.headerRow}>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: category?.color ?? UncategorizedColor },
            ]}
          >
            <Text style={styles.categoryBadgeText}>{category?.name ?? 'Uncategorised'}</Text>
          </View>
          <Text style={styles.geometryText}>{describeGeometry(feature.geometry)}</Text>
        </View>

        {/* Notes */}
        {feature.notes ? <Text style={styles.notes}>{feature.notes}</Text> : null}

        {/* Photos */}
        {feature.photos.length > 0 && (
          <View style={styles.photos}>
            {feature.photos.map((photo) => (
              <Image
                key={photo.id}
                source={{ uri: photoUri(photo.filename) }}
                style={styles.photo}
                contentFit="cover"
              />
            ))}
          </View>
        )}

        <Text style={styles.timestamp}>
          Added {new Date(feature.createdAt).toLocaleDateString()}
        </Text>

        {/* Actions */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push({ pathname: '/feature/new', params: { id: feature.id } })}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={confirmDelete}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl * 2,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  missingText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  mapWrapper: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    height: 200,
    backgroundColor: Colors.surface,
  },
  map: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    borderRadius: BorderRadius.full,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  categoryBadgeText: {
    color: Colors.textInverse,
    fontSize: 13,
    fontWeight: '600',
  },
  geometryText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  notes: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  photos: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  timestamp: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: Spacing.md,
  },
  editButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  editButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  deleteButtonText: {
    color: Colors.danger,
    fontSize: 16,
    fontWeight: '600',
  },
});
