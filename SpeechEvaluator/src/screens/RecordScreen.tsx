import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { audioRecorder, RecordingStatus } from '../audio/recorder';
import { mockAnalysis } from '../api/scoring';
import type { RootStackParamList } from '../../App';

type RecordScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Record'>;

const { width } = Dimensions.get('window');

export default function RecordScreen() {
  const navigation = useNavigation<RecordScreenNavigationProp>();
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>({
    isRecording: false,
    duration: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (recordingStatus.isRecording) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 0.1);
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setTimer(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [recordingStatus.isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    try {
      const hasPermission = await audioRecorder.requestPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Microphone permission is required to record audio.'
        );
        return;
      }

      await audioRecorder.startRecording();
      setRecordingStatus(audioRecorder.getStatus());
    } catch (error) {
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const handleStopRecording = async () => {
    try {
      const audioPath = await audioRecorder.stopRecording();
      setRecordingStatus(audioRecorder.getStatus());
      
      // Process the recording
      setIsProcessing(true);
      const { words, prosody, duration } = await mockAnalysis(audioPath);
      
      // Navigate to results
      navigation.navigate('Result', {
        audioPath,
        transcript: words.map(w => w.text).join(' '),
        scores: {
          fluency: 85,
          clarity: 78,
          confidence: 82,
          overall: 82,
        },
        insights: {
          longPauses: prosody.pauses.filter(p => p.end - p.start > 0.8),
          lowConfidenceWords: words.filter(w => w.prob < 0.2).map(w => w.text),
        },
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to stop recording. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadFile = () => {
    // TODO: Implement file picker for audio files
    Alert.alert('Coming Soon', 'File upload feature will be implemented soon.');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 justify-center items-center px-6">
        {/* Title */}
        <Text className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Speech Evaluator
        </Text>
        
        {/* Timer Display */}
        {recordingStatus.isRecording && (
          <View className="mb-8">
            <Text className="text-6xl font-mono text-blue-600">
              {formatTime(timer)}
            </Text>
          </View>
        )}

        {/* Recording Button */}
        <TouchableOpacity
          onPress={recordingStatus.isRecording ? handleStopRecording : handleStartRecording}
          disabled={isProcessing}
          className={`w-32 h-32 rounded-full justify-center items-center shadow-lg ${
            recordingStatus.isRecording 
              ? 'bg-red-500' 
              : 'bg-blue-500'
          }`}
          style={{
            shadowColor: recordingStatus.isRecording ? '#ef4444' : '#3b82f6',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          {isProcessing ? (
            <ActivityIndicator size="large" color="white" />
          ) : (
            <Ionicons
              name={recordingStatus.isRecording ? 'stop' : 'mic'}
              size={48}
              color="white"
            />
          )}
        </TouchableOpacity>

        {/* Button Label */}
        <Text className="text-lg font-semibold text-gray-600 mt-4">
          {isProcessing 
            ? 'Processing...' 
            : recordingStatus.isRecording 
              ? 'Tap to Stop' 
              : 'Tap to Record'
          }
        </Text>

        {/* Upload File Option */}
        <TouchableOpacity
          onPress={handleUploadFile}
          disabled={recordingStatus.isRecording || isProcessing}
          className={`mt-12 px-6 py-3 rounded-full border-2 ${
            recordingStatus.isRecording || isProcessing
              ? 'border-gray-300 bg-gray-100'
              : 'border-blue-500 bg-white'
          }`}
        >
          <View className="flex-row items-center">
            <Ionicons
              name="cloud-upload"
              size={20}
              color={recordingStatus.isRecording || isProcessing ? '#9ca3af' : '#3b82f6'}
            />
            <Text
              className={`ml-2 font-semibold ${
                recordingStatus.isRecording || isProcessing ? 'text-gray-400' : 'text-blue-500'
              }`}
            >
              Upload Audio File
            </Text>
          </View>
        </TouchableOpacity>

        {/* Instructions */}
        <View className="mt-16 px-6">
          <Text className="text-gray-500 text-center text-sm leading-5">
            Record your speech to get instant feedback on fluency, clarity, and confidence.{'\n'}
            Speak clearly and at a natural pace for best results.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}