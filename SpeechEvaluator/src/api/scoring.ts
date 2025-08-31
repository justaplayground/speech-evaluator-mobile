export interface Word {
  start: number;
  end: number;
  text: string;
  prob: number;
}

export interface Prosody {
  rms: number[];
  pitchHz: number[];
  pauses: Array<{ start: number; end: number }>;
}

export interface ScoringResult {
  transcript: string;
  wpm: number;
  fluency: number;
  clarity: number;
  confidence: number;
  overall: number;
  insights: {
    longPauses: Array<{ start: number; end: number }>;
    lowConfidenceWords: string[];
  };
}

export function score(
  words: Word[],
  prosody: Prosody,
  totalSec: number
): ScoringResult {
  const transcript = words
    .map((w) => w.text)
    .join(" ")
    .trim();
  
  const wordCount = words.length;
  const minutes = Math.max(totalSec / 60, 1e-6);
  const wpm = wordCount / minutes;

  // Calculate pause metrics
  const pauseDur = prosody.pauses.reduce((s, p) => s + (p.end - p.start), 0);
  const pauseRatio = pauseDur / totalSec;
  const meanPause = prosody.pauses.length ? pauseDur / prosody.pauses.length : 0;

  // Calculate confidence metrics
  const avgProb = words.length ? words.reduce((s, w) => s + w.prob, 0) / words.length : 0.1;
  const lowConfRate = words.filter((w) => w.prob < 0.3).length / Math.max(1, words.length);

  // Calculate prosody metrics
  const pitchVar = variance(prosody.pitchHz.filter((x) => x > 0)); // ignore unvoiced
  const rmsAvg = average(prosody.rms);

  // Helper scoring functions
  const scoreBand = (x: [number, number]) => (v: number) =>
    v <= x[0] ? v / x[0] : v >= x[1] ? x[1] / v : 1;
  
  const scoreLow = (idealMax: number) => (v: number) => 
    Math.max(0, Math.min(1, idealMax / (v + 1e-6)));
  
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  
  const mapProb = (p: number) => Math.max(0, Math.min(1, (p - 0.1) / 0.8)); // map 0.1..0.9 → 0..1

  // Calculate fluency score
  const fluencyRaw = clamp(
    scoreBand([110, 170])(wpm) * 0.45 +
    scoreLow(0.25)(pauseRatio) * 0.25 +
    scoreLow(0.6)(meanPause) * 0.15 +
    scoreLow(4 / 60)((lowConfRate * wordCount) / minutes) * 0.15
  );

  // Calculate clarity score
  const clarityRaw = clamp(
    mapProb(avgProb) * 0.7 +
    scoreBand([0.02, 0.2])(rmsAvg) * 0.15 +
    scoreBand([30, 120])(Math.sqrt(pitchVar)) * 0.15
  );

  // Calculate confidence score
  const articulationRate = wordCount / ((totalSec - pauseDur) / 60);
  const confidenceRaw = clamp(
    scoreBand([40, 80])(Math.sqrt(pitchVar)) * 0.35 +
    scoreBand([140, 190])(articulationRate) * 0.35 +
    scoreLow(0.05)(lowConfRate) * 0.3
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

// Helper functions
function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - mean, 2));
  return squareDiffs.reduce((a, b) => a + b, 0) / values.length;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Mock ASR and prosody analysis for development
export function mockAnalysis(audioPath: string): Promise<{ words: Word[]; prosody: Prosody; duration: number }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock data for development
      const mockWords: Word[] = [
        { start: 0, end: 0.5, text: "Hello", prob: 0.9 },
        { start: 0.6, end: 1.2, text: "world", prob: 0.85 },
        { start: 1.3, end: 2.0, text: "this", prob: 0.8 },
        { start: 2.1, end: 2.8, text: "is", prob: 0.95 },
        { start: 2.9, end: 3.5, text: "a", prob: 0.9 },
        { start: 3.6, end: 4.2, text: "test", prob: 0.75 },
        { start: 4.3, end: 5.0, text: "recording", prob: 0.7 },
      ];

      const mockProsody: Prosody = {
        rms: Array.from({ length: 50 }, () => Math.random() * 0.15 + 0.05),
        pitchHz: Array.from({ length: 50 }, () => Math.random() * 50 + 100),
        pauses: [
          { start: 1.25, end: 1.35 },
          { start: 2.05, end: 2.15 },
          { start: 3.55, end: 3.65 },
        ],
      };

      resolve({
        words: mockWords,
        prosody: mockProsody,
        duration: 5.0,
      });
    }, 2000); // Simulate processing time
  });
}