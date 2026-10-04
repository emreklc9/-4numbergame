import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import GameScreen from './src/screens/GameScreen';
import RecordsScreen from './src/screens/RecordsScreen';
import ModeScreen from './src/screens/ModeScreen';

export type RootStackParamList = {
  Home: undefined;
  Mode: undefined;
  Game: { digits: 3 | 4 | 5 };
  Records: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#f8fafc' },
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: '#f8fafc' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Mode" component={ModeScreen} options={{ title: 'Oyun Modu' }} />
        <Stack.Screen name="Game" component={GameScreen} options={{ title: 'Tahmin Et' }} />
        <Stack.Screen name="Records" component={RecordsScreen} options={{ title: 'Rekorlar' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
