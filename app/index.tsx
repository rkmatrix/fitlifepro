import { Redirect } from 'expo-router';

/**
 * Explicit entry: `/` always resolves to the main app shell.
 * Tab layout then sends unauthenticated users to onboarding.
 */
export default function RootIndex() {
  return <Redirect href="/(tabs)" />;
}
