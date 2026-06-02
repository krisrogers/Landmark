/**
 * Manage categories: create, rename/recolor, delete.
 */
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { BorderRadius, CategoryColors, Colors, Spacing } from '@/constants/theme';
import type { Category } from '@/lib/types';
import { useDataStore } from '@/store/dataStore';

export default function CategoriesScreen() {
  const categories = useDataStore((s) => s.categories);
  const features = useDataStore((s) => s.features);
  const addCategory = useDataStore((s) => s.addCategory);
  const updateCategory = useDataStore((s) => s.updateCategory);
  const deleteCategory = useDataStore((s) => s.deleteCategory);

  // Form state – used both for creating and editing.
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(CategoryColors[0]);

  const featureCount = (categoryId: string) =>
    features.filter((f) => f.categoryId === categoryId).length;

  const resetForm = () => {
    setEditing(null);
    setName('');
    setColor(CategoryColors[0]);
  };

  const startEditing = (category: Category) => {
    setEditing(category);
    setName(category.name);
    setColor(category.color);
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (editing) {
      await updateCategory(editing.id, trimmed, color);
    } else {
      await addCategory(trimmed, color);
    }
    resetForm();
  };

  const confirmDelete = (category: Category) => {
    const count = featureCount(category.id);
    Alert.alert(
      'Delete category',
      count > 0
        ? `"${category.name}" is used by ${count} item${count === 1 ? '' : 's'}. They will become uncategorised.`
        : `Delete "${category.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCategory(category.id);
            if (editing?.id === category.id) resetForm();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Add / edit form */}
      <View style={styles.form}>
        <Text style={styles.formTitle}>{editing ? `Edit "${editing.name}"` : 'New category'}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Water, Fences, Trees, Sheds"
          placeholderTextColor={Colors.textSecondary}
        />
        <View style={styles.colorRow}>
          {CategoryColors.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchActive]}
              onPress={() => setColor(c)}
              accessibilityLabel={`Color ${c}`}
            />
          ))}
        </View>
        <View style={styles.formButtons}>
          {editing && (
            <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.submitButton, !name.trim() && styles.submitDisabled]}
            onPress={submit}
            disabled={!name.trim()}
          >
            <Text style={styles.submitButtonText}>{editing ? 'Save changes' : 'Add category'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No categories yet. Create some to organise what you map – for example Water,
            Fences, Sheds, Trees.
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => startEditing(item)}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <View style={styles.rowText}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowCount}>
                {featureCount(item.id)} item{featureCount(item.id) === 1 ? '' : 's'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => confirmDelete(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={`Delete ${item.name}`}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  form: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
  },
  colorRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: Colors.text,
  },
  formButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  submitButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  list: {
    padding: Spacing.md,
  },
  empty: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  rowCount: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  deleteText: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
});
