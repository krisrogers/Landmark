/**
 * Save form for a captured geometry (new feature), or editing an existing one
 * when opened with ?id=<featureId>.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import { CategoryPicker } from '@/components/CategoryPicker';
import { PhotoSection, type PendingPhoto } from '@/components/PhotoSection';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { describeGeometry } from '@/lib/geo';
import { photoUri, storePhoto } from '@/lib/photoStorage';
import { useCaptureStore } from '@/store/captureStore';
import { useDataStore } from '@/store/dataStore';

export default function FeatureFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const draftGeometry = useCaptureStore((s) => s.draftGeometry);
  const clearDraft = useCaptureStore((s) => s.clearDraft);

  const categories = useDataStore((s) => s.categories);
  const features = useDataStore((s) => s.features);
  const addFeature = useDataStore((s) => s.addFeature);
  const updateFeature = useDataStore((s) => s.updateFeature);

  // Edit mode: load the existing feature.
  const existing = useMemo(
    () => (id ? features.find((f) => f.id === id) : undefined),
    [id, features]
  );

  const geometry = existing?.geometry ?? draftGeometry;

  const [name, setName] = useState(existing?.name ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(existing?.categoryId ?? null);
  const [photos, setPhotos] = useState<PendingPhoto[]>(
    existing?.photos.map((p) => ({
      uri: photoUri(p.filename),
      width: p.width,
      height: p.height,
      existingPhotoId: p.id,
    })) ?? []
  );
  const [saving, setSaving] = useState(false);

  if (!geometry) {
    // Arrived here without a captured geometry (e.g. after reload) – go back.
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.geometrySummary}>Nothing to save.</Text>
        <TouchableOpacity style={styles.saveButton} onPress={() => router.back()}>
          <Text style={styles.saveButtonText}>Back to map</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const save = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Name needed', 'Give this a name so you can find it later.');
      return;
    }

    setSaving(true);
    try {
      if (existing) {
        // Edit: work out which photos were added and which were removed.
        const keptIds = photos
          .filter((p) => p.existingPhotoId)
          .map((p) => p.existingPhotoId as string);
        const removedPhotoIds = existing.photos
          .filter((p) => !keptIds.includes(p.id))
          .map((p) => p.id);
        const newPhotos = photos
          .filter((p) => !p.existingPhotoId)
          .map((p) => ({
            filename: storePhoto(p.uri),
            width: p.width,
            height: p.height,
          }));

        await updateFeature(existing.id, {
          name: trimmedName,
          notes: notes.trim(),
          categoryId,
          newPhotos,
          removedPhotoIds,
        });
      } else {
        // New: copy photos to permanent storage, then insert.
        const storedPhotos = photos.map((p) => ({
          filename: storePhoto(p.uri),
          width: p.width,
          height: p.height,
        }));

        await addFeature(
          { name: trimmedName, notes: notes.trim(), geometry, categoryId },
          storedPhotos
        );
        clearDraft();
      }

      router.back();
    } catch (error) {
      console.error('Failed to save feature', error);
      Alert.alert('Save failed', 'Something went wrong saving. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.geometrySummary}>{describeGeometry(geometry)}</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. House dam, Back paddock, Old gum tree"
          placeholderTextColor={Colors.textSecondary}
          autoFocus={!existing}
        />

        <Text style={styles.label}>Category</Text>
        <CategoryPicker categories={categories} selectedId={categoryId} onSelect={setCategoryId} />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything worth remembering about this spot…"
          placeholderTextColor={Colors.textSecondary}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.label}>Photos</Text>
        <PhotoSection photos={photos} onChange={setPhotos} />

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={save}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl * 2,
    backgroundColor: Colors.background,
    flexGrow: 1,
  },
  geometrySummary: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primaryDark,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  notesInput: {
    minHeight: 100,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
});
