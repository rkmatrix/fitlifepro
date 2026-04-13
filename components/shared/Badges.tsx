import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize } from '../../constants/theme';

interface StatusBadgeProps {
  status: 'done' | 'partial' | 'skipped' | 'pending';
  size?: 'sm' | 'md';
}

const STATUS_CONFIG = {
  done: { color: Colors.done, label: 'Done', bg: `${Colors.done}20` },
  partial: { color: Colors.partial, label: 'Partial', bg: `${Colors.partial}20` },
  skipped: { color: Colors.skipped, label: 'Skipped', bg: `${Colors.skipped}20` },
  pending: { color: Colors.pending, label: 'Pending', bg: `${Colors.pending}20` },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, size === 'sm' && styles.sm]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { color: config.color }, size === 'sm' && styles.labelSm]}>
        {config.label}
      </Text>
    </View>
  );
}

interface StreakBadgeProps {
  count: number;
  animate?: boolean;
}

export function StreakBadge({ count, animate = false }: StreakBadgeProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (animate) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.3, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      ]).start();
    }
  }, [count, animate, scale]);

  return (
    <Animated.View style={[styles.streakBadge, { transform: [{ scale }] }]}>
      <Text style={styles.streakFire}>🔥</Text>
      <Text style={styles.streakCount}>{count}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  sm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  labelSm: {
    fontSize: FontSize.xs,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  streakFire: {
    fontSize: 14,
  },
  streakCount: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.primary,
  },
});
