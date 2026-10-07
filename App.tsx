import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './src/screens/HomeScreen';
import GameScreen from './src/screens/GameScreen';
import RecordsScreen from './src/screens/RecordsScreen';
import LoadingScreen from './src/components/LoadingScreen';
import StoreScreen from './src/screens/StoreScreen';
import LoginScreen from './src/screens/LoginScreen';
import { AuthProvider, useAuth } from './src/auth/AuthProvider';
import { CustomizationProvider, useCustomization } from './src/game/CustomizationProvider';
import { THEMES } from './src/game/store';

export type RootStackParamList = {
  Home: undefined;
  Game: { digits: 3 | 4 | 5 };
};

type TabParamList = {
  Store: undefined;
  HomeTab: undefined;
  Records: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setIsLoading(false), 1100);
    return () => clearTimeout(timeout);
  }, []);

  if (isLoading) {
    return (
      <>
        <StatusBar style="light" />
        <LoadingScreen />
      </>
    );
  }

  return (
    <AuthProvider>
      <CustomizationProvider>
        <AuthGate />
      </CustomizationProvider>
    </AuthProvider>
  );
}

function AuthGate() {
  const { status } = useAuth();

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'signedOut') {
    return (
      <>
        <StatusBar style="dark" />
        <LoginScreen />
      </>
    );
  }
  return <AppNavigator />;
}

function AppNavigator() {
  const { store } = useCustomization();
  const theme = THEMES[store?.equipped.theme ?? 'classic'];

  return (
    <NavigationContainer>
      <StatusBar style={store?.equipped.theme === 'midnight' ? 'light' : 'auto'} />
      <Tab.Navigator
        initialRouteName="HomeTab"
        screenOptions={{
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: '#94a3b8',
          tabBarStyle: { backgroundColor: theme.background, borderTopColor: '#e2e8f0', height: 66 },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '800' },
        }}
      >
        <Tab.Screen
          name="Store"
          component={StoreScreen}
          options={{
            title: 'Mağaza',
            tabBarLabel: 'Mağaza',
            tabBarIcon: ({ color, focused }) => <TabIcon color={color} name="store" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="HomeTab"
          component={HomeStackNavigator}
          options={{
            headerShown: false,
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, focused }) => <TabIcon color={color} name="home" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Records"
          component={RecordsScreen}
          options={{
            title: 'Rekorlar',
            tabBarLabel: 'Rekorlar',
            tabBarIcon: ({ color, focused }) => <TabIcon color={color} name="records" focused={focused} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function HomeStackNavigator() {
  const { store } = useCustomization();
  const theme = THEMES[store?.equipped.theme ?? 'classic'];

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '800' },
        contentStyle: { backgroundColor: theme.background },
        animation: Platform.OS === 'android' ? 'ios_from_right' : 'simple_push',
        animationDuration: 700,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="Game"
        component={GameScreen}
        options={{ title: 'Tahmin Et', animation: 'fade', animationDuration: 250 }}
      />
    </Stack.Navigator>
  );
}

function TabIcon({
  color,
  name,
  focused,
}: {
  color: string;
  name: 'store' | 'home' | 'records';
  focused: boolean;
}) {
  const iconName =
    name === 'store'
      ? focused
        ? 'storefront'
        : 'storefront-outline'
      : name === 'home'
        ? focused
          ? 'home-variant'
          : 'home-variant-outline'
        : focused
          ? 'trophy'
          : 'trophy-outline';

  return (
    <View
      style={{
        width: focused ? 46 : 30,
        height: focused ? 34 : 30,
        borderRadius: 99,
        backgroundColor: focused ? `${color}1A` : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MaterialCommunityIcons name={iconName} size={focused ? 27 : 22} color={color} />
    </View>
  );
}
