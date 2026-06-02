/**
 * Category selector used by the feature form: tap a chip to select,
 * tap again to deselect (= uncategorised).
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import type { Category } from '@/lib/types';

interface Props {
  categories: Category[];
  selectedId: string | null;
  onSelect: (categoryId: string | null) => void;
}

export function CategoryPicker({ categories, selectedId, onSelect }: Props) {
  if (categories.length === 0) {
    return (
      <Text style={styles.empty}>
        No categories yet – create them from the map screen (folder icon).
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      {categories.map((category) => {
        const active = category.id === selectedId;
        return (
          <TouchableOpacity
            key={category.id}
            style={[styles.chip, active && { backgroundColor: category.color }]}
            onPress={() => onSelect(active ? null : category.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <View style={[styles.dot, { backgroundColor: active ? '#fff' : category.color }]} />
            <Text style={[styles.label, active && styles.labelActive]}>{category.name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  labelActive: {
    color: Colors.textInverse,
    fontWeight: '700',
  },
  empty: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
