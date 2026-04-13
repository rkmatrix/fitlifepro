import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, FontSize } from '../../constants/theme';

interface RingProps {
  progress: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  label?: string;
  centerText?: string;
  style?: ViewStyle;
  labelStyle?: TextStyle;
}

export function Ring({
  progress,
  size = 80,
  strokeWidth = 8,
  color = Colors.primary,
  backgroundColor = Colors.border,
  label,
  centerText,
  style,
  labelStyle,
}: RingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const dashOffset = circumference * (1 - clampedProgress);

  return (
    <View style={[styles.container, style]}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {centerText ? (
        <View style={[styles.centerContent, { width: size, height: size }]}>
          <Text style={[styles.centerText, { color }]}>{centerText}</Text>
        </View>
      ) : null}
      {label ? (
        <Text style={[styles.label, labelStyle]}>{label}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  centerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
});
