import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import RecordScreen from './src/screens/RecordScreen';
import ResultScreen from './src/screens/ResultScreen';

export type RootStackParamList = {
  Record: undefined;
  Result: {
    audioPath: string;
    transcript: string;
    scores: {
      fluency: number;
      clarity: number;
      confidence: number;
      overall: number;
    };
    insights: {
      longPauses: Array<{ start: number; end: number }>;
      lowConfidenceWords: string[];
    };
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Record"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#f8fafc',
            },
            headerTintColor: '#1e293b',
            headerTitleStyle: {
              fontWeight: '600',
            },
          }}
        >
          <Stack.Screen 
            name="Record" 
            component={RecordScreen}
            options={{ title: 'Speech Evaluator' }}
          />
          <Stack.Screen 
            name="Result" 
            component={ResultScreen}
            options={{ title: 'Evaluation Results' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
