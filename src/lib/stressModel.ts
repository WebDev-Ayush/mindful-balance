// Local on-device stress prediction model
// This simulates a lightweight ML model that runs entirely in the browser

export interface WellnessData {
  mood: number; // 1-5 scale
  sleepHours: number;
  sleepQuality: number; // 1-5 scale
  workHours: number;
  screenTime: number;
  physicalActivity: number; // minutes
  socialInteraction: number; // 1-5 scale
}

export type StressLevel = 'low' | 'medium' | 'high';

export interface PredictionResult {
  level: StressLevel;
  score: number; // 0-100
  confidence: number;
  factors: {
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    contribution: number;
  }[];
  timestamp: Date;
}

// Weights for the local model (would be updated via federated learning)
const MODEL_WEIGHTS = {
  mood: -0.25,
  sleepHours: -0.15,
  sleepQuality: -0.2,
  workHours: 0.15,
  screenTime: 0.1,
  physicalActivity: -0.1,
  socialInteraction: -0.15,
};

// Optimal values for normalization
const OPTIMAL_VALUES = {
  mood: 4,
  sleepHours: 7.5,
  sleepQuality: 4,
  workHours: 8,
  screenTime: 4,
  physicalActivity: 60,
  socialInteraction: 4,
};

function normalizeValue(value: number, optimal: number, isInverse: boolean = false): number {
  const deviation = Math.abs(value - optimal) / optimal;
  return isInverse ? 1 - Math.min(deviation, 1) : Math.min(deviation, 1);
}

export function predictStress(data: WellnessData): PredictionResult {
  const factors: PredictionResult['factors'] = [];
  let weightedSum = 50; // Start at neutral

  // Mood impact
  const moodNorm = (5 - data.mood) / 4;
  const moodContribution = moodNorm * 20;
  weightedSum += moodContribution;
  factors.push({
    name: 'Mood',
    impact: data.mood >= 4 ? 'positive' : data.mood <= 2 ? 'negative' : 'neutral',
    contribution: Math.abs(moodContribution),
  });

  // Sleep hours impact
  const sleepDeviation = Math.abs(data.sleepHours - 7.5) / 7.5;
  const sleepContribution = sleepDeviation * 15;
  weightedSum += data.sleepHours < 6 || data.sleepHours > 9 ? sleepContribution : -sleepContribution * 0.5;
  factors.push({
    name: 'Sleep Duration',
    impact: data.sleepHours >= 7 && data.sleepHours <= 8 ? 'positive' : data.sleepHours < 6 ? 'negative' : 'neutral',
    contribution: Math.abs(sleepContribution),
  });

  // Sleep quality impact
  const sleepQualityNorm = (5 - data.sleepQuality) / 4;
  const sleepQualityContribution = sleepQualityNorm * 15;
  weightedSum += sleepQualityContribution;
  factors.push({
    name: 'Sleep Quality',
    impact: data.sleepQuality >= 4 ? 'positive' : data.sleepQuality <= 2 ? 'negative' : 'neutral',
    contribution: Math.abs(sleepQualityContribution),
  });

  // Work hours impact
  const workDeviation = Math.max(0, data.workHours - 8) / 8;
  const workContribution = workDeviation * 20;
  weightedSum += workContribution;
  factors.push({
    name: 'Work Hours',
    impact: data.workHours <= 8 ? 'positive' : data.workHours > 10 ? 'negative' : 'neutral',
    contribution: Math.abs(workContribution),
  });

  // Screen time impact
  const screenDeviation = Math.max(0, data.screenTime - 4) / 8;
  const screenContribution = screenDeviation * 10;
  weightedSum += screenContribution;
  factors.push({
    name: 'Screen Time',
    impact: data.screenTime <= 4 ? 'positive' : data.screenTime > 8 ? 'negative' : 'neutral',
    contribution: Math.abs(screenContribution),
  });

  // Physical activity impact
  const activityNorm = Math.min(data.physicalActivity / 60, 1);
  const activityContribution = (1 - activityNorm) * 15;
  weightedSum += activityContribution - (activityNorm * 10);
  factors.push({
    name: 'Physical Activity',
    impact: data.physicalActivity >= 30 ? 'positive' : data.physicalActivity < 15 ? 'negative' : 'neutral',
    contribution: Math.abs(activityContribution),
  });

  // Social interaction impact
  const socialNorm = (5 - data.socialInteraction) / 4;
  const socialContribution = socialNorm * 10;
  weightedSum += socialContribution;
  factors.push({
    name: 'Social Connection',
    impact: data.socialInteraction >= 4 ? 'positive' : data.socialInteraction <= 2 ? 'negative' : 'neutral',
    contribution: Math.abs(socialContribution),
  });

  // Clamp score between 0-100
  const score = Math.max(0, Math.min(100, weightedSum));

  // Determine stress level
  let level: StressLevel;
  if (score < 35) {
    level = 'low';
  } else if (score < 65) {
    level = 'medium';
  } else {
    level = 'high';
  }

  // Sort factors by contribution
  factors.sort((a, b) => b.contribution - a.contribution);

  return {
    level,
    score,
    confidence: 0.85 + Math.random() * 0.1, // Simulated confidence
    factors: factors.slice(0, 4), // Top 4 factors
    timestamp: new Date(),
  };
}

// Simulated federated learning model update
export interface ModelUpdate {
  id: string;
  timestamp: Date;
  encrypted: boolean;
  parametersHash: string;
}

export function generateModelUpdate(): ModelUpdate {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    encrypted: true,
    parametersHash: btoa(Math.random().toString()).slice(0, 32),
  };
}

// Local storage for wellness history
const STORAGE_KEY = 'wellness_history';

export function saveWellnessData(data: WellnessData & { prediction: PredictionResult }): void {
  const history = getWellnessHistory();
  history.push({
    ...data,
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
  });
  // Keep only last 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const filtered = history.filter(h => new Date(h.date).getTime() > thirtyDaysAgo);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function getWellnessHistory(): (WellnessData & { prediction: PredictionResult; id: string; date: string })[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}
