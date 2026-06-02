/**
 * Horizontal row of category chips shown over the map for filtering.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BorderRadius, Colors, Spacing, UncategorizedColor } from '@/constants/theme';
import type { Category } from '@/lib/types';

interface Props {
  categories: Category[];
  /** undefined = all, null = uncategorised, string = category id */
  selected: string | null | undefined;
  onSelect: (filter: string | null | undefined) => void;
}

interface ChipProps {
  label: string;
  color?: string;
  active: boolean;
  onPress: () => void;
}

function Chip({ label, color, active, onPress }: ChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function CategoryFilterBar({ categories, selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <Chip label="All" active={selected === undefined} onPress={() => onSelect(undefined)} />
      {categories.map((category) => (
        <Chip
          key={category.id}
          label={category.name}
          color={category.color}
          active={selected === category.id}
          onPress={() => onSelect(selected === category.id ? undefined : category.id)}
        />
      ))}
      <Chip
        label="Uncategorised"
        color={UncategorizedColor}
        active={selected === null}
        onPress={() => onSelect(selected === null ? undefined : null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.overlayBackground,
    borderRadius: BorderRadius.full,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipActive: {
    backgroundColor: Colors.primary,
  },
  chipText: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextActive: {
    fontWeight: '700',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
