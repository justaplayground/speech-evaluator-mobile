import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import type { RootStackParamList } from '../../App';

type ResultScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Result'>;
type ResultScreenRouteProp = RouteProp<RootStackParamList, 'Result'>;

interface ScoreCardProps {
  title: string;
  score: number;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ title, score, description, icon, color }) => (
  <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
    <View className="flex-row items-center justify-between mb-4">
      <View className="flex-row items-center">
        <View className={`w-12 h-12 rounded-full ${color} justify-center items-center mr-3`}>
          <Ionicons name={icon} size={24} color="white" />
        </View>
        <Text className="text-lg font-semibold text-gray-800">{title}</Text>
      </View>
      <Text className="text-3xl font-bold text-gray-800">{score}</Text>
    </View>
    <Text className="text-gray-600 text-sm leading-5">{description}</Text>
  </View>
);

export default function ResultScreen() {
  const navigation = useNavigation<ResultScreenNavigationProp>();
  const route = useRoute<ResultScreenRouteProp>();
  const { scores, transcript, insights } = route.params;

  const handleTryAgain = () => {
    navigation.goBack();
  };

  const handleSaveResult = () => {
    // TODO: Implement save functionality
    Alert.alert('Success', 'Result saved to your history!');
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreDescription = (score: number) => {
    if (score >= 80) return 'Excellent!';
    if (score >= 60) return 'Good, with room for improvement';
    return 'Needs improvement';
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-6 py-4">
        {/* Overall Score */}
        <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100">
          <Text className="text-center text-2xl font-bold text-gray-800 mb-2">
            Overall Score
          </Text>
          <Text className={`text-center text-6xl font-bold mb-2 ${getScoreColor(scores.overall)}`}>
            {scores.overall}
          </Text>
          <Text className="text-center text-gray-600">
            {getScoreDescription(scores.overall)}
          </Text>
        </View>

        {/* Individual Score Cards */}
        <View className="space-y-4 mb-6">
          <ScoreCard
            title="Fluency"
            score={scores.fluency}
            description="Speed, flow, and natural pauses in your speech"
            icon="speedometer"
            color="bg-blue-500"
          />
          
          <ScoreCard
            title="Clarity"
            score={scores.clarity}
            description="Pronunciation clarity and word recognition"
            icon="ear"
            color="bg-green-500"
          />
          
          <ScoreCard
            title="Confidence"
            score={scores.confidence}
            description="Delivery smoothness and speaking confidence"
            icon="trending-up"
            color="bg-purple-500"
          />
        </View>

        {/* Transcript Section */}
        <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-800 mb-4">
            Transcript
          </Text>
          <View className="bg-gray-50 rounded-xl p-4">
            <Text className="text-gray-700 leading-6">
              {transcript}
            </Text>
          </View>
          
          {/* Low Confidence Words */}
          {insights.lowConfidenceWords.length > 0 && (
            <View className="mt-4">
              <Text className="text-sm font-medium text-red-600 mb-2">
                Words with low confidence (highlighted):
              </Text>
              <View className="flex-row flex-wrap">
                {insights.lowConfidenceWords.map((word, index) => (
                  <View key={index} className="bg-red-100 rounded-full px-3 py-1 mr-2 mb-2">
                    <Text className="text-red-700 text-sm">{word}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Insights Section */}
        {insights.longPauses.length > 0 && (
          <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100">
            <Text className="text-lg font-semibold text-gray-800 mb-4">
              Speaking Insights
            </Text>
            <View className="space-y-3">
              <View className="flex-row items-center">
                <Ionicons name="time" size={20} color="#6b7280" />
                <Text className="ml-2 text-gray-600">
                  Long pauses detected: {insights.longPauses.length}
                </Text>
              </View>
              <Text className="text-sm text-gray-500 leading-5">
                Consider reducing long pauses to improve fluency. Aim for natural, brief pauses between thoughts.
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View className="flex-row space-x-4 mb-6">
          <TouchableOpacity
            onPress={handleTryAgain}
            className="flex-1 bg-blue-500 rounded-2xl py-4"
          >
            <Text className="text-white text-center font-semibold text-lg">
              Try Again
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleSaveResult}
            className="flex-1 bg-gray-200 rounded-2xl py-4"
          >
            <Text className="text-gray-700 text-center font-semibold text-lg">
              Save Result
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tips Section */}
        <View className="bg-blue-50 rounded-2xl p-6 mb-6 border border-blue-200">
          <View className="flex-row items-center mb-3">
            <Ionicons name="bulb" size={24} color="#3b82f6" />
            <Text className="ml-2 text-lg font-semibold text-blue-800">
              Tips for Improvement
            </Text>
          </View>
          <View className="space-y-2">
            <Text className="text-blue-700 text-sm leading-5">
              • Practice speaking at a consistent pace (110-170 words per minute)
            </Text>
            <Text className="text-blue-700 text-sm leading-5">
              • Use brief, natural pauses instead of long silences
            </Text>
            <Text className="text-blue-700 text-sm leading-5">
              • Speak clearly and enunciate each word
            </Text>
            <Text className="text-blue-700 text-sm leading-5">
              • Vary your pitch and energy for engaging delivery
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}