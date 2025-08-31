import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export interface RecordingStatus {
  isRecording: boolean;
  duration: number;
  uri?: string;
}

export class AudioRecorder {
  private recording: Audio.Recording | null = null;
  private status: RecordingStatus = {
    isRecording: false,
    duration: 0,
  };

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      return false;
    }
  }

  async startRecording(): Promise<string> {
    try {
      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          if (status.isRecording) {
            this.status.duration = status.durationMillis || 0;
          }
        },
        100 // Update status every 100ms
      );

      this.recording = recording;
      this.status.isRecording = true;
      this.status.duration = 0;

      return 'Recording started';
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('Failed to start recording');
    }
  }

  async stopRecording(): Promise<string> {
    try {
      if (!this.recording) {
        throw new Error('No recording in progress');
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      if (!uri) {
        throw new Error('Failed to get recording URI');
      }

      // Convert to appropriate format for ASR (16kHz mono WAV would be ideal)
      const finalUri = await this.convertToOptimalFormat(uri);
      
      this.status.isRecording = false;
      this.status.uri = finalUri;
      this.recording = null;

      return finalUri;
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw new Error('Failed to stop recording');
    }
  }

  private async convertToOptimalFormat(uri: string): Promise<string> {
    // For now, return the original URI
    // In a production app, you'd want to convert to 16kHz mono WAV
    // This could be done with a native module or server-side processing
    return uri;
  }

  getStatus(): RecordingStatus {
    return { ...this.status };
  }

  async pauseRecording(): Promise<void> {
    if (this.recording) {
      await this.recording.pauseAsync();
    }
  }

  async resumeRecording(): Promise<void> {
    if (this.recording) {
      await this.recording.startAsync();
    }
  }

  async cancelRecording(): Promise<void> {
    if (this.recording) {
      await this.recording.stopAndUnloadAsync();
      this.recording = null;
      this.status.isRecording = false;
      this.status.duration = 0;
      this.status.uri = undefined;
    }
  }
}

export const audioRecorder = new AudioRecorder();