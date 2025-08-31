import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';

export default function TestScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 justify-center items-center px-6 space-y-6">
        <Text className="text-3xl font-bold text-gray-800 text-center">
          NativeWind Test
        </Text>
        
        <Text className="text-gray-600 text-center text-lg">
          This screen tests NativeWind styling and component functionality
        </Text>
        
        <View className="space-y-4 w-full max-w-sm">
          <Button 
            title="Primary Button" 
            variant="primary" 
            size="large"
            onPress={() => console.log('Primary pressed')}
          />
          
          <Button 
            title="Secondary Button" 
            variant="secondary" 
            size="medium"
            onPress={() => console.log('Secondary pressed')}
          />
          
          <Button 
            title="Outline Button" 
            variant="outline" 
            size="small"
            onPress={() => console.log('Outline pressed')}
          />
        </View>
        
        <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-800 mb-2">
            Styling Test
          </Text>
          <Text className="text-gray-600 text-sm">
            This card demonstrates various Tailwind classes working correctly.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}