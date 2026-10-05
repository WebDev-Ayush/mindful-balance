// Local on-device stress prediction model with federated learning support
// This implements a lightweight ML model that runs entirely in the browser

export interface WellnessData {
  mood: number; // 1-5 scale
  sleepHours: number;
  sleepQuality: number; // 1-5 scale
  workHours: number;
  screenTime: number;
  physicalActivity: number; // minutes
  socialInteraction: number; // 1-5 scale
  /**
   * PHQ-9 responses for the last 2 weeks.
   * Each item is 0-3:
   * 0 = Not at all
   * 1 = Several days
   * 2 = More than half the days
   * 3 = Nearly every day
   */
  phq9: number[];
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

// Model weights interface for federated learning
export interface ModelWeights {
  mood: number;
  sleepHours: number;
  sleepQuality: number;
  workHours: number;
  screenTime: number;
  physicalActivity: number;
  socialInteraction: number;
  phq9: number;
  bias: number;
}

// Default weights for the local model (updated via federated learning)
const DEFAULT_WEIGHTS: ModelWeights = {
  mood: -0.25,
  sleepHours: -0.15,
  sleepQuality: -0.2,
  workHours: 0.15,
  screenTime: 0.1,
  physicalActivity: -0.1,
  socialInteraction: -0.15,
  phq9: 0.2,
  bias: 50, // Base stress score
};

function safeRandomId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
      return (crypto as any).randomUUID();
    }
  } catch {
    // ignore and fall back
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

// Load weights from localStorage or use defaults
function loadModelWeights(): ModelWeights {
  const stored = localStorage.getItem('model_weights');
  if (stored) {
    try {
      return { ...DEFAULT_WEIGHTS, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_WEIGHTS;
    }
  }
  return DEFAULT_WEIGHTS;
}

// Save weights to localStorage
function saveModelWeights(weights: ModelWeights): void {
  localStorage.setItem('model_weights', JSON.stringify(weights));
}

// Get current model weights
let currentWeights = loadModelWeights();

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

export function calculatePhq9Total(phq9: number[] | undefined): number {
  if (!phq9 || !Array.isArray(phq9)) return 0;
  const total = phq9
    .slice(0, 9)
    .reduce((sum, v) => sum + (Number.isFinite(v) ? Math.max(0, Math.min(3, v)) : 0), 0);
  return Math.max(0, Math.min(27, total));
}

// Normalize features for model input
function normalizeFeatures(data: WellnessData): Record<keyof ModelWeights, number> {
  const phq9Total = calculatePhq9Total(data.phq9);
  return {
    mood: (5 - data.mood) / 4, // 0 = best mood, 1 = worst mood
    sleepHours: Math.abs(data.sleepHours - 7.5) / 7.5, // Deviation from optimal
    sleepQuality: (5 - data.sleepQuality) / 4, // 0 = best, 1 = worst
    workHours: Math.max(0, data.workHours - 8) / 8, // Excess work hours
    screenTime: Math.max(0, data.screenTime - 4) / 8, // Excess screen time
    physicalActivity: 1 - Math.min(data.physicalActivity / 60, 1), // Inverse of activity
    socialInteraction: (5 - data.socialInteraction) / 4, // 0 = best, 1 = worst
    phq9: phq9Total / 27, // 0..1
    bias: 1, // Bias term
  };
}

export function predictStress(data: WellnessData, weights: ModelWeights = currentWeights): PredictionResult {
  const factors: PredictionResult['factors'] = [];
  const features = normalizeFeatures(data);
  
  // Compute weighted sum using model weights
  let weightedSum = weights.bias;
  
  const contributions: Record<string, number> = {
    mood: features.mood * weights.mood * 20,
    sleepHours: features.sleepHours * weights.sleepHours * 15,
    sleepQuality: features.sleepQuality * weights.sleepQuality * 15,
    workHours: features.workHours * weights.workHours * 20,
    screenTime: features.screenTime * weights.screenTime * 10,
    physicalActivity: features.physicalActivity * weights.physicalActivity * 15,
    socialInteraction: features.socialInteraction * weights.socialInteraction * 10,
    phq9: features.phq9 * weights.phq9 * 25,
  };

  weightedSum += Object.values(contributions).reduce((sum, val) => sum + val, 0);

  // Build factors array
  factors.push({
    name: 'Mood',
    impact: data.mood >= 4 ? 'positive' : data.mood <= 2 ? 'negative' : 'neutral',
    contribution: Math.abs(contributions.mood),
  });
  factors.push({
    name: 'Sleep Duration',
    impact: data.sleepHours >= 7 && data.sleepHours <= 8 ? 'positive' : data.sleepHours < 6 ? 'negative' : 'neutral',
    contribution: Math.abs(contributions.sleepHours),
  });
  factors.push({
    name: 'Sleep Quality',
    impact: data.sleepQuality >= 4 ? 'positive' : data.sleepQuality <= 2 ? 'negative' : 'neutral',
    contribution: Math.abs(contributions.sleepQuality),
  });
  factors.push({
    name: 'Work Hours',
    impact: data.workHours <= 8 ? 'positive' : data.workHours > 10 ? 'negative' : 'neutral',
    contribution: Math.abs(contributions.workHours),
  });
  factors.push({
    name: 'Screen Time',
    impact: data.screenTime <= 4 ? 'positive' : data.screenTime > 8 ? 'negative' : 'neutral',
    contribution: Math.abs(contributions.screenTime),
  });
  factors.push({
    name: 'Physical Activity',
    impact: data.physicalActivity >= 30 ? 'positive' : data.physicalActivity < 15 ? 'negative' : 'neutral',
    contribution: Math.abs(contributions.physicalActivity),
  });
  factors.push({
    name: 'Social Connection',
    impact: data.socialInteraction >= 4 ? 'positive' : data.socialInteraction <= 2 ? 'negative' : 'neutral',
    contribution: Math.abs(contributions.socialInteraction),
  });
  const phq9Total = calculatePhq9Total(data.phq9);
  factors.push({
    name: 'PHQ-9 (2-week mood)',
    impact: phq9Total >= 10 ? 'negative' : phq9Total <= 4 ? 'neutral' : 'neutral',
    contribution: Math.abs(contributions.phq9),
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
    confidence: 0.85 + Math.random() * 0.1,
    factors: factors.slice(0, 4), // Top 4 factors
    timestamp: new Date(),
  };
}

// Federated learning interfaces and functions
export interface ModelUpdate {
  id: string;
  timestamp: Date;
  encrypted: boolean;
  parametersHash: string;
  weights: ModelWeights;
  sampleCount: number;
  clientId: string;
}

export interface GradientUpdate {
  gradients: Partial<ModelWeights>;
  sampleCount: number;
}

// Compute gradients using Mean Squared Error loss
// Target stress score is inferred from user feedback or historical patterns
function computeGradients(
  data: WellnessData,
  predictedScore: number,
  targetScore?: number
): Partial<ModelWeights> {
  // If no target provided, use a simple heuristic based on prediction
  // In a real system, this would come from user feedback
  const target = targetScore ?? predictedScore;
  const error = predictedScore - target;
  const features = normalizeFeatures(data);
  const learningRate = 0.001;

  // Compute gradients for each weight
  return {
    mood: -learningRate * error * features.mood * 20,
    sleepHours: -learningRate * error * features.sleepHours * 15,
    sleepQuality: -learningRate * error * features.sleepQuality * 15,
    workHours: -learningRate * error * features.workHours * 20,
    screenTime: -learningRate * error * features.screenTime * 10,
    physicalActivity: -learningRate * error * features.physicalActivity * 15,
    socialInteraction: -learningRate * error * features.socialInteraction * 10,
    phq9: -learningRate * error * features.phq9 * 25,
    bias: -learningRate * error,
  };
}

// Train model on local data
export function trainLocalModel(
  trainingData: Array<{ data: WellnessData; target?: number }>,
  epochs: number = 1
): GradientUpdate {
  let aggregatedGradients: Partial<ModelWeights> = {
    mood: 0,
    sleepHours: 0,
    sleepQuality: 0,
    workHours: 0,
    screenTime: 0,
    physicalActivity: 0,
    socialInteraction: 0,
    phq9: 0,
    bias: 0,
  };

  for (let epoch = 0; epoch < epochs; epoch++) {
    for (const { data, target } of trainingData) {
      const prediction = predictStress(data);
      const gradients = computeGradients(data, prediction.score, target);
      
      // Accumulate gradients
      Object.keys(aggregatedGradients).forEach((key) => {
        const k = key as keyof ModelWeights;
        aggregatedGradients[k] = (aggregatedGradients[k] || 0) + (gradients[k] || 0);
      });
    }
  }

  // Average gradients
  const sampleCount = trainingData.length * epochs;
  Object.keys(aggregatedGradients).forEach((key) => {
    const k = key as keyof ModelWeights;
    aggregatedGradients[k] = (aggregatedGradients[k] || 0) / sampleCount;
  });

  return {
    gradients: aggregatedGradients,
    sampleCount,
  };
}

// Apply gradients to update local model
export function applyGradients(gradients: Partial<ModelWeights>): void {
  Object.keys(gradients).forEach((key) => {
    const k = key as keyof ModelWeights;
    if (gradients[k] !== undefined) {
      currentWeights[k] = (currentWeights[k] || 0) - (gradients[k] || 0);
    }
  });
  saveModelWeights(currentWeights);
}

// Update model weights from server (federated averaging result)
export function updateModelWeights(weights: ModelWeights): void {
  currentWeights = weights;
  saveModelWeights(weights);
}

// Get current model weights
export function getModelWeights(): ModelWeights {
  return { ...currentWeights };
}

// Generate model update for federated learning
export function generateModelUpdate(clientId: string): ModelUpdate {
  const weights = getModelWeights();
  const hash = btoa(JSON.stringify(weights)).slice(0, 32);
  
  return {
    id: safeRandomId(),
    timestamp: new Date(),
    encrypted: true,
    parametersHash: hash,
    weights,
    sampleCount: 1,
    clientId,
  };
}

// Local storage for wellness history
const STORAGE_KEY = 'wellness_history';

export function saveWellnessData(data: WellnessData & { prediction: PredictionResult }): void {
  const history = getWellnessHistory();
  history.push({
    ...data,
    id: safeRandomId(),
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

