import { Stack } from 'expo-router';
import { Colors } from '../../constants/theme';

export default function WorkoutLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="session/[id]" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="videos" />
    </Stack>
  );
}
