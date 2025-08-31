# Speech Evaluator

A React Native mobile app that records user speech and provides instant feedback on fluency, clarity, and confidence using on-device ASR (Automatic Speech Recognition) and prosody analysis.

## Features

- **Speech Recording**: High-quality audio recording with real-time timer
- **On-device ASR**: Whisper-based speech-to-text processing (planned)
- **Prosody Analysis**: Pitch, energy, and pause detection for speech evaluation
- **Scoring System**: Three-dimensional scoring (Fluency, Clarity, Confidence)
- **Modern UI**: Beautiful, responsive interface built with NativeWind (Tailwind CSS)
- **Real-time Feedback**: Instant evaluation results with actionable insights

## Tech Stack

- **Frontend**: React Native with Expo
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Audio**: Expo AV for recording and playback
- **Navigation**: React Navigation v6
- **ASR**: WhisperKit (iOS) / whisper.cpp (Android) - planned
- **Prosody**: Aubio library integration - planned

## Project Structure

```
src/
├── api/
│   └── scoring.ts          # Speech evaluation algorithms
├── audio/
│   └── recorder.ts         # Audio recording functionality
├── components/              # Reusable UI components
├── screens/
│   ├── RecordScreen.tsx    # Main recording interface
│   └── ResultScreen.tsx    # Results and insights display
├── libs/                   # Native bridge modules
└── store/                  # State management
```

## Setup Instructions

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Expo CLI
- iOS Simulator (macOS) or Android Emulator

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd SpeechEvaluator
   npm install
   ```

2. **Install Expo CLI globally (if not already installed):**
   ```bash
   npm install -g @expo/cli
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Run on device/simulator:**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app on physical device

### Development

- **Hot Reload**: Changes automatically reflect in the app
- **TypeScript**: Full type safety and IntelliSense support
- **Tailwind CSS**: Use `className` prop with Tailwind utilities
- **Audio Testing**: Test recording functionality on physical devices

## Scoring Algorithm

The app evaluates speech across three dimensions:

### 1. Fluency (45% weight)
- Words per minute (target: 110-170 WPM)
- Pause ratio (ideal: ≤25%)
- Mean pause length (ideal: ≤0.6s)
- Filler word rate (ideal: ≤4/min)

### 2. Clarity (35% weight)
- ASR confidence scores
- Energy stability
- Pitch variation

### 3. Confidence (20% weight)
- Prosodic variability
- Articulation rate
- Low-confidence token rate

## Planned Features

- [ ] Native Whisper integration for on-device ASR
- [ ] Real prosody analysis with Aubio
- [ ] File upload support
- [ ] Result history and comparison
- [ ] Cloud fallback for complex analysis
- [ ] Multi-language support
- [ ] Custom scoring parameters

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions or issues, please open an issue on GitHub or contact the development team.