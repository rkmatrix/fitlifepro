import { Tabs, Redirect } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize } from '../../constants/theme';
import { useUserStore } from '../../stores/userStore';

function TabIcon({ focused, label, icon }: { focused: boolean; label: string; icon: string }) {
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{icon}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const { isLoading, isOnboarded } = useUserStore();

  if (isLoading) {
    return (
      <View style={styles.bootScreen}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!isOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + (insets.bottom > 0 ? insets.bottom : 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { height: tabBarHeight, paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }],
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Today" icon="🏠" />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Train" icon="💪" />
          ),
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Fuel" icon="🥗" />
          ),
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Health" icon="❤️" />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Stats" icon="📊" />
          ),
        }}
      />
      <Tabs.Screen
        name="trainer"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Coach" icon="🤖" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bootScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    paddingTop: 6,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.45,
    lineHeight: 24,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 12,
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
