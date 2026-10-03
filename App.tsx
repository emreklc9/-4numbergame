import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import GameScreen from './src/screens/GameScreen';
import RecordsScreen from './src/screens/RecordsScreen';

export type RootStackParamList = {
  Home: undefined;
  Game: { digits: 3 | 4 | 5 };
  Records: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Ana Sayfa' }} />
        <Stack.Screen name="Game" component={GameScreen} options={{ title: 'Oyun' }} />
        <Stack.Screen name="Records" component={RecordsScreen} options={{ title: 'Rekorlar' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
