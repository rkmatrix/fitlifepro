export const Colors = {
  // MyFitnessPal-inspired blue palette
  primary: '#2B7FFF',
  primaryDark: '#1A6FEE',
  primaryLight: '#5599FF',
  secondary: '#3DD68C',
  secondaryDark: '#28C177',
  accent: '#FF9F43',

  // Light theme (MyFitnessPal style)
  background: '#F4F6F9',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  border: '#E8ECF2',
  borderLight: '#F0F3F8',

  // Text
  textPrimary: '#1A1D23',
  textSecondary: '#6B7480',
  textTertiary: '#9BA3AF',
  textDisabled: '#C4CAD4',

  // Status
  success: '#3DD68C',
  warning: '#FF9F43',
  error: '#FF4757',
  info: '#2B7FFF',

  // Workout status
  done: '#3DD68C',
  partial: '#FF9F43',
  skipped: '#FF4757',
  pending: '#9BA3AF',

  // Rings / Progress
  ringWorkout: '#FF6B6B',
  ringNutrition: '#3DD68C',
  ringSleep: '#A55EEA',
  ringSteps: '#FF9F43',
  ringWater: '#2B7FFF',

  // Muscle groups
  chest: '#FF6B6B',
  back: '#3DD68C',
  legs: '#FF9F43',
  shoulders: '#A55EEA',
  arms: '#2B7FFF',
  core: '#3DD68C',

  // Transparent overlays
  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.2)',
  glassDark: 'rgba(255,255,255,0.95)',
  glassMid: 'rgba(255,255,255,0.85)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 42,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const Shadow = {
  small: {
    shadowColor: '#1A1D23',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#1A1D23',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#1A1D23',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  }),
};
