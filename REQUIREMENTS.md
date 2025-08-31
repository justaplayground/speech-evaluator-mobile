# 0) What we’ll build (overview)

**Flow:** Record/upload audio → run **on-device ASR** (Whisper-tiny/base) → compute **fluency & prosody metrics** → compute **confidence** from token probabilities → produce **scores (0–100)** with actionable feedback.
**Fallback:** If device is slow or file is long, send to your **self-hosted ASR + prosody server** (FastAPI + faster-whisper + librosa/Praat).

---

# 1) Tech stack choices

## UI / React Native

- **React Native (bare)** (easier native ML integration than Expo managed)
- **Tailwind styling:** **NativeWind**
- **UI components:** **gluestack-ui** (utility-first, Tailwind-friendly)

## Audio capture

- **`react-native-audio-recorder-player`** (simple + works on iOS/Android)
- Formats: record to **WAV/PCM** or **m4a**; aim for 16kHz mono for ASR efficiency

## On-device ASR (speech-to-text)

- **iOS:** **WhisperKit** (Core ML Whisper running on Apple Neural Engine)

  - Bundle **tiny.en** (\~39 MB) or **base.en** (\~74 MB) for English; use multilingual if needed

- **Android:** **whisper.cpp** (GGML/GGUF) via **JNI** bridge

  - Same model family; quantized (q5/q4) to fit 30–80 MB

- These both give **word timestamps** + **token log-probs** → key for confidence & fluency.

> Why Whisper? Great accuracy at small sizes, deterministic outputs, token probs exposed, runs offline.

## Prosody / DSP (pitch, energy, pauses)

- **On-device (lightweight):** integrate **aubio** (C library) via a tiny native bridge for:

  - pitch (YIN), energy (RMS), silence/pause detection

- **Fallback / heavy features:** server does richer prosody with **librosa** + **praat-parselmouth**

## Cloud fallback (self-hosted)

- **ASR:** **faster-whisper (CTranslate2)** Docker container (fast on CPU, great on GPU)
- **API:** **FastAPI** endpoint: `/asr` (returns transcript + word timestamps + probs), `/prosody` (pitch, pause stats), `/score` (optional end-to-end)

---

# 2) Project structure

```
mobile/
  android/
  ios/
  src/
    api/
      scoring.ts
      client.ts         # calls local/native or cloud fallback
    audio/
      recorder.ts
    components/
      ...
    screens/
      RecordScreen.tsx
      ResultScreen.tsx
    libs/
      whisperBridge.ts  # JS wrapper over iOS/Android native modules
      prosodyBridge.ts  # aubio bridge
    store/
      ...
  native/
    ios/WhisperKitBridge/
    android/WhisperCppBridge/
    shared/aubio/
server/
  app.py                # FastAPI
  scoring.py
  Dockerfile
  docker-compose.yml
```

---

# 3) Scoring rubric (clear, reproducible)

We’ll compute 3 scores (0–100), then an overall.

### 3.1 Fluency (speed & flow)

Inputs (from ASR timestamps + silence detector):

- **WPM**: words / minutes (target 110–170 for English; configurable)
- **Pause ratio**: total silence / total duration (exclude trailing silence)
- **Mean pause length**: average of pauses > 200ms
- **Filler rate**: count of {uh, um, like, you know…} / minute

Formula (example):

```
fluency_raw =
  clamp( score_band(WPM, target=[110,170]) * 0.45
       + score_low(pause_ratio, ideal<=0.25) * 0.25
       + score_low(mean_pause, ideal<=0.6s) * 0.15
       + score_low(filler_rate, ideal<=4/min) * 0.15 , 0, 1)

fluency = round(100 * fluency_raw)
```

### 3.2 Pronunciation clarity (no reference text required)

Proxy features:

- **ASR word confidence** (avg of word/token log-probs → map to 0–1)
- **Phone-level duration outliers** (optional if you align phones; skip at v1)
- **Energy/pitch stability** (avoid whispering/clipping)

Example:

```
clarity_raw =
  clamp( prob_to_confidence(avg_token_logprob) * 0.7
       + score_band(energy_rms, range=[low,high]) * 0.15
       + score_band(pitch_stability, ideal=moderate variance) * 0.15 , 0, 1)

clarity = round(100 * clarity_raw)
```

### 3.3 Confidence / smoothness (delivery)

- **Prosodic variability**: pitch variance across utterance (monotone → lower)
- **Articulation rate**: words / speaking time (no silences)
- **Backtracking/edits**: repeated words, long false starts (heuristic)
- **Token confidence variance**: many very low-prob tokens → lower confidence

Example:

```
confidence_raw =
  clamp( score_band(pitch_variance, ideal=medium) * 0.35
       + score_band(articulation_rate, target=[140,190] wpm_sans_silence) * 0.35
       + score_low(low_conf_token_rate, ideal<=5%) * 0.30 , 0, 1)

confidence = round(100 * confidence_raw)
```

### Overall

```
overall = round(0.34*fluency + 0.33*clarity + 0.33*confidence)
```

Also return explanations:

- Highlight **slow / fast** if WPM outside band
- Mark **long pauses** (timestamps)
- Mark **low-confidence words** (color in transcript)

---

# 4) React Native implementation highlights

## 4.1 Tailwind UI setup

```bash
npm i nativewind react-native-svg
npm i -D tailwindcss
npx tailwindcss init
```

`tailwind.config.js`:

```js
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
```

Use **gluestack-ui** or your own components styled via `className`:

```tsx
<View className="p-6">
  <Text className="text-2xl font-semibold">Speech Evaluator</Text>
  <Button className="mt-4 rounded-2xl">Record</Button>
</View>
```

## 4.2 Recording / selecting audio

```bash
npm i react-native-audio-recorder-player react-native-permissions react-native-fs
```

```ts
// src/audio/recorder.ts
import AudioRecorderPlayer from "react-native-audio-recorder-player";

const arp = new AudioRecorderPlayer();

export async function startRecording() {
  // request permissions first (iOS: mic; Android: RECORD_AUDIO + storage if needed)
  const path = Platform.select({
    ios: "speechEval.m4a",
    android: `${RNFS.DocumentDirectoryPath}/speechEval.mp4`,
  });
  await arp.startRecorder(path, { channels: 1, sampleRate: 16000 });
  return path;
}

export async function stopRecording() {
  const result = await arp.stopRecorder();
  return result; // file path
}
```

For file upload, use a simple picker (`react-native-document-picker`) and re-encode to 16kHz mono if needed on the native side before ASR.

## 4.3 Native bridges (one JS API, two platforms)

**JS wrapper** (platform-agnostic):

```ts
// src/libs/whisperBridge.ts
import { NativeModules } from "react-native";
const { WhisperBridge } = NativeModules;

type AsrResult = {
  transcript: string;
  words: { start: number; end: number; text: string; prob: number }[];
  avgLogProb: number;
};

export async function transcribeLocal(filePath: string): Promise<AsrResult> {
  return WhisperBridge.transcribe(filePath);
}
```

- **iOS (WhisperKitBridge)**: load CoreML model from app bundle or downloaded to app storage; return word timestamps + per-token probs.
- **Android (WhisperCppBridge)**: JNI wrapper around whisper.cpp’s `whisper_full` with `--max-context`, `--no-pt`, `--timestamps` options to expose word pieces + probs.

## 4.4 Prosody bridge (aubio)

```ts
// src/libs/prosodyBridge.ts
const { ProsodyBridge } = NativeModules;
export type Prosody = {
  rms: number[]; // per frame
  pitchHz: number[]; // per frame
  pauses: { start: number; end: number }[];
};
export async function analyzeProsody(filePath: string): Promise<Prosody> {
  return ProsodyBridge.analyze(filePath, { frameMs: 20, hopMs: 10 });
}
```

## 4.5 Scoring in TypeScript

```ts
// src/api/scoring.ts
export function score(
  words: { start: number; end: number; text: string; prob: number }[],
  prosody: { rms: number[]; pitchHz: number[]; pauses: { start: number; end: number }[] },
  totalSec: number
) {
  const transcript = words
    .map((w) => w.text)
    .join(" ")
    .trim();
  const wordCount = words.length;
  const minutes = Math.max(totalSec / 60, 1e-6);
  const wpm = wordCount / minutes;

  const pauseDur = prosody.pauses.reduce((s, p) => s + (p.end - p.start), 0);
  const pauseRatio = pauseDur / totalSec;
  const meanPause = prosody.pauses.length ? pauseDur / prosody.pauses.length : 0;

  const avgProb = words.length ? words.reduce((s, w) => s + w.prob, 0) / words.length : -5; // log space or mapped prob
  const lowConfRate = words.filter((w) => w.prob < 0.3).length / Math.max(1, words.length);

  const pitchVar = variance(prosody.pitchHz.filter((x) => x > 0)); // ignore unvoiced
  const rmsAvg = average(prosody.rms);

  // helper “band” scorers (0..1)
  const sBand = (x: [number, number]) => (v: number) =>
    v <= x[0] ? v / x[0] : v >= x[1] ? x[1] / v : 1;
  const sLow = (idealMax: number) => (v: number) => Math.max(0, Math.min(1, idealMax / (v + 1e-6)));
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const mapProb = (p: number) => Math.max(0, Math.min(1, (p - 0.1) / 0.8)); // map 0.1..0.9 → 0..1

  const fluencyRaw = clamp(
    sBand([110, 170])(wpm) * 0.45 +
      sLow(0.25)(pauseRatio) * 0.25 +
      sLow(0.6)(meanPause) * 0.15 +
      sLow(4 / 60)((lowConfRate * wordCount) / minutes) * 0.15
  );

  const clarityRaw = clamp(
    mapProb(avgProb) * 0.7 +
      sBand([0.02, 0.2])(rmsAvg) * 0.15 +
      sBand([30, 120])(Math.sqrt(pitchVar)) * 0.15
  );

  const articulationRate = wordCount / ((totalSec - pauseDur) / 60);
  const confidenceRaw = clamp(
    sBand([40, 80])(Math.sqrt(pitchVar)) * 0.35 +
      sBand([140, 190])(articulationRate) * 0.35 +
      sLow(0.05)(lowConfRate) * 0.3
  );

  const to100 = (x: number) => Math.round(100 * x);
  return {
    transcript,
    wpm: Math.round(wpm),
    fluency: to100(fluencyRaw),
    clarity: to100(clarityRaw),
    confidence: to100(confidenceRaw),
    overall: Math.round(
      0.34 * to100(fluencyRaw) + 0.33 * to100(clarityRaw) + 0.33 * to100(confidenceRaw)
    ),
    insights: {
      longPauses: prosody.pauses.filter((p) => p.end - p.start > 0.8),
      lowConfidenceWords: words.filter((w) => w.prob < 0.2).map((w) => w.text),
    },
  };
}
```

_(Tune bands/weights for your audience and language; store them in remote config for A/B tests.)_

---

# 5) UX you can ship quickly

- **Record screen:** big mic button, waveform while recording, timer, “Upload file” secondary action.
- **Processing screen:** local badge (“On-device”) or “Sent to server” if fallback used.
- **Results screen:**

  - **Transcript** with low-confidence words **highlighted**
  - Three **cards**: Fluency, Clarity, Confidence with 0–100 & short tip
  - A small **timeline** with pause markers
  - “Try again” and “Save result”

All easily styled with NativeWind classes (rounded-2xl cards, shadows, spacings).

---

# 6) Model files & app size

- **Don’t** ship models inside the initial binary. Instead:

  1. On first run, **download** the chosen model (tiny/base) from your CDN.
  2. Verify checksum; store with `react-native-fs` in app’s documents dir.
  3. Expose a **Settings → Model** screen (tiny/base/multilingual).

Example:

```ts
import RNFS from "react-native-fs";
async function ensureModel() {
  const path = `${RNFS.DocumentDirectoryPath}/whisper-tiny-en.bin`;
  if (!(await RNFS.exists(path))) {
    await RNFS.downloadFile({ fromUrl: MODEL_URL, toFile: path }).promise;
  }
  return path;
}
```

---

# 7) Cloud fallback (your self-hosted server)

## 7.1 Docker compose (ASR + API)

```yaml
# server/docker-compose.yml
services:
  asr:
    image: ghcr.io/ggerganov/whisper-cpp:latest # or faster-whisper service container
    command: ["--help"] # (replace with a proper server image if using faster-whisper)
  api:
    build: .
    ports: ["8000:8000"]
    environment:
      WHISPER_MODEL: base.en
```

## 7.2 FastAPI skeleton

```py
# server/app.py
from fastapi import FastAPI, UploadFile
from pydantic import BaseModel
import librosa, numpy as np
from scoring import score_from_features
# call faster-whisper or whisper.cpp via subprocess or a python binding

app = FastAPI()

@app.post("/asr")
async def asr(file: UploadFile):
  # save temp, run faster-whisper, return words+probs+timestamps
  ...

@app.post("/prosody")
async def prosody(file: UploadFile):
  y, sr = librosa.load(await file.read(), sr=16000, mono=True)
  rms = librosa.feature.rms(y=y, frame_length=320, hop_length=160).flatten().tolist()
  f0 = librosa.yin(y, fmin=50, fmax=350, frame_length=1024, hop_length=160).tolist()
  # detect pauses by short-time energy threshold
  ...

@app.post("/score")
async def score_endpoint(file: UploadFile):
  # call /asr + /prosody, then aggregate with the same formula as mobile
  ...
```

## 7.3 RN fallback client

```ts
// src/api/client.ts
export async function evaluate(filePath: string, preferLocal = true) {
  try {
    if (preferLocal) {
      const asr = await transcribeLocal(filePath);
      const pros = await analyzeProsody(filePath);
      return score(asr.words, pros, asr.words.at(-1)?.end ?? 0);
    }
  } catch (e) {
    /* fall through */
  }

  // Fallback to server
  const form = new FormData();
  form.append("file", { uri: filePath, type: "audio/m4a", name: "audio.m4a" } as any);
  const [asr, pros] = await Promise.all([
    fetch(`${API_BASE}/asr`, { method: "POST", body: form }).then((r) => r.json()),
    fetch(`${API_BASE}/prosody`, { method: "POST", body: form }).then((r) => r.json()),
  ]);
  return score(asr.words, pros, asr.durationSec);
}
```

---

# 8) iOS & Android native notes

**iOS**

- Add **Microphone** permission string (NSMicrophoneUsageDescription)
- Enable background audio only if needed
- Use **Metal/ANE** via WhisperKit (automatic with Core ML)
- Keep memory ≤ 500 MB during inference; chunk long audio (e.g., 30–45s windows)

**Android**

- RECORD_AUDIO permission, handle sample rate resampling to 16k
- JNI bridges must run inference off the UI thread
- Use **NNAPI/GPU?** whisper.cpp is CPU-centric; ensure power-aware throttling for long jobs

---

# 9) Quality tips and extensions

- **Language packs:** for multilingual users, bundle `tiny` multilingual and auto-detect language.
- **Stability:** chunk long recordings, overlap 1–2 s, then stitch with timestamp smoothing.
- **Personalization:** store user baseline WPM; score relative improvements.
- **Explainability:** always attach 2–3 concrete tips per session (“You paused 18% of the time; aim for <12% next try”).
- **Privacy toggle:** “Keep audio on device” vs “Allow cloud fallback”.

---

# 10) What you can implement first (MVP checklist)

1. RN app with NativeWind UI (Record / Upload → Evaluate → Results).
2. iOS: WhisperKit bridge; Android: whisper.cpp bridge (tiny.en).
3. aubio bridge for pitch + pause detection.
4. TypeScript **scoring.ts** (formulas above).
5. Optional: FastAPI fallback with faster-whisper.

