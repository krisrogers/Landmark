/**
 * Photo grid with "take photo" / "choose from gallery" actions.
 * Used by the feature form. Works on pending (not yet saved) photos.
 */
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BorderRadius, Colors, Spacing } from '@/constants/theme';

export interface PendingPhoto {
  /** Local cache URI from the picker (or stored URI for existing photos). */
  uri: string;
  width: number | null;
  height: number | null;
  /** Set for photos that are already saved on the feature. */
  existingPhotoId?: string;
}

interface Props {
  photos: PendingPhoto[];
  onChange: (photos: PendingPhoto[]) => void;
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.8,
  exif: false,
};

export function PhotoSection({ photos, onChange }: Props) {
  const addAssets = (assets: ImagePicker.ImagePickerAsset[]) => {
    const added = assets.map((asset) => ({
      uri: asset.uri,
      width: asset.width ?? null,
      height: asset.height ?? null,
    }));
    onChange([...photos, ...added]);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera unavailable', 'Camera permission is needed to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    if (!result.canceled) {
      addAssets(result.assets);
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      ...PICKER_OPTIONS,
      allowsMultipleSelection: true,
    });
    if (!result.canceled) {
      addAssets(result.assets);
    }
  };

  const removePhoto = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
          <Text style={styles.actionText}>📷 Take photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={pickFromGallery}>
          <Text style={styles.actionText}>🖼️ Gallery</Text>
        </TouchableOpacity>
      </View>

      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.grid}>
          {photos.map((photo, index) => (
            <View key={`${photo.uri}-${index}`} style={styles.thumbWrapper}>
              <Image source={{ uri: photo.uri }} style={styles.thumb} contentFit="cover" />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removePhoto(index)}
                accessibilityLabel="Remove photo"
              >
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  grid: {
    marginTop: Spacing.md,
  },
  thumbWrapper: {
    marginRight: Spacing.sm,
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.overlayBackground,
    borderRadius: BorderRadius.full,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: Colors.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
});
