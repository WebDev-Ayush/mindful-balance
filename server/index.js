import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// -------------------------
// Federated Learning (v1)
// -------------------------
// This is a simple, round-based coordinator suitable for demos.
// It is NOT production-grade: no auth, no secure aggregation, no DP, no attestation.

// In-memory storage for federated learning
// In production, use a proper database
let globalModel = {
  mood: -0.25,
  sleepHours: -0.15,
  sleepQuality: -0.2,
  workHours: 0.15,
  screenTime: 0.1,
  physicalActivity: -0.1,
  socialInteraction: -0.15,
  phq9: 0.2,
  bias: 50,
};

let pendingUpdates = [];
let clientCounts = new Map();
let lastAggregation = Date.now();
const AGGREGATION_INTERVAL = 60000; // Aggregate every 60 seconds

let modelVersion = 1;
let roundId = `round-${Date.now()}`;
let roundStartedAt = Date.now();
const MIN_UPDATES_TO_AGGREGATE = 3;

// Federated Averaging algorithm
function federatedAverage(updates) {
  if (updates.length === 0) return globalModel;

  const totalSamples = updates.reduce((sum, update) => sum + (update.sampleCount || 1), 0);
  
  if (totalSamples === 0) return globalModel;

  const aggregated = {
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

  // Weighted average based on sample count
  updates.forEach((update) => {
    const weight = (update.sampleCount || 1) / totalSamples;
    const w = update.weights || update;
    
    Object.keys(aggregated).forEach((key) => {
      aggregated[key] += (w[key] || 0) * weight;
    });
  });

  // Exponential moving average with global model (FedAvg with momentum)
  const alpha = 0.7; // Weight for new aggregated model
  Object.keys(globalModel).forEach((key) => {
    globalModel[key] = alpha * aggregated[key] + (1 - alpha) * globalModel[key];
  });

  return globalModel;
}

function maybeStartNewRound() {
  roundId = `round-${Date.now()}`;
  roundStartedAt = Date.now();
}

// Endpoint to submit model update from client
app.post('/api/federated/update', (req, res) => {
  try {
    const { weights, sampleCount, clientId } = req.body;

    if (!weights || !clientId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Store update
    pendingUpdates.push({
      weights,
      sampleCount: sampleCount || 1,
      clientId,
      timestamp: Date.now(),
    });

    // Track client participation
    clientCounts.set(clientId, (clientCounts.get(clientId) || 0) + 1);

    console.log(`Received update from client ${clientId} (${pendingUpdates.length} pending)`);

    res.json({
      success: true,
      message: 'Update received',
      pendingUpdates: pendingUpdates.length,
    });
  } catch (error) {
    console.error('Error processing update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to get current global model
app.get('/api/federated/model', (req, res) => {
  // Check if we should aggregate
  const now = Date.now();
  if (now - lastAggregation > AGGREGATION_INTERVAL && pendingUpdates.length > 0) {
    console.log(`Aggregating ${pendingUpdates.length} updates`);
    globalModel = federatedAverage(pendingUpdates);
    pendingUpdates = [];
    lastAggregation = now;
    modelVersion += 1;
    maybeStartNewRound();
  }

  res.json({
    weights: globalModel,
    timestamp: lastAggregation,
    modelVersion,
    roundId,
    pendingUpdates: pendingUpdates.length,
  });
});

// Endpoint to force aggregation
app.post('/api/federated/aggregate', (req, res) => {
  if (pendingUpdates.length === 0) {
    return res.json({
      success: true,
      message: 'No updates to aggregate',
      weights: globalModel,
      modelVersion,
      roundId,
    });
  }

  const updateCount = pendingUpdates.length;
  console.log(`Force aggregating ${updateCount} updates`);
  globalModel = federatedAverage(pendingUpdates);
  pendingUpdates = [];
  lastAggregation = Date.now();
  modelVersion += 1;
  maybeStartNewRound();

  res.json({
    success: true,
    message: 'Aggregation complete',
    weights: globalModel,
    aggregatedUpdates: updateCount,
    modelVersion,
    roundId,
  });
});

// Endpoint to get server stats
app.get('/api/federated/stats', (req, res) => {
  res.json({
    globalModel,
    pendingUpdates: pendingUpdates.length,
    uniqueClients: clientCounts.size,
    lastAggregation: new Date(lastAggregation).toISOString(),
    clientCounts: Object.fromEntries(clientCounts),
    modelVersion,
    roundId,
    roundStartedAt,
  });
});

// -------------------------
// FL v1 (round-based) API
// -------------------------
app.post('/api/fl/v1/register', (req, res) => {
  // Client can either provide its own ID or let server generate.
  const provided = req.body?.clientId;
  const clientId = typeof provided === 'string' && provided.length > 0 ? provided : crypto.randomUUID();
  if (!clientCounts.has(clientId)) clientCounts.set(clientId, 0);
  res.json({ clientId });
});

app.get('/api/fl/v1/round', (req, res) => {
  res.json({
    roundId,
    startedAt: roundStartedAt,
    minUpdatesToAggregate: MIN_UPDATES_TO_AGGREGATE,
    pendingUpdates: pendingUpdates.length,
    modelVersion,
  });
});

app.get('/api/fl/v1/model', (req, res) => {
  // Aggregate automatically if enough updates came in, or interval elapsed
  const now = Date.now();
  const shouldAggregate =
    (pendingUpdates.length >= MIN_UPDATES_TO_AGGREGATE) ||
    (now - lastAggregation > AGGREGATION_INTERVAL && pendingUpdates.length > 0);

  if (shouldAggregate) {
    console.log(`Aggregating ${pendingUpdates.length} updates (v1)`);
    globalModel = federatedAverage(pendingUpdates);
    pendingUpdates = [];
    lastAggregation = now;
    modelVersion += 1;
    maybeStartNewRound();
  }

  res.json({
    weights: globalModel,
    modelVersion,
    roundId,
    timestamp: lastAggregation,
    pendingUpdates: pendingUpdates.length,
  });
});

app.post('/api/fl/v1/update', (req, res) => {
  try {
    const { weights, sampleCount, clientId, roundId: clientRoundId } = req.body;
    if (!weights || !clientId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Optional: enforce round match (for demo, accept stale round updates too)
    const acceptedRoundId = typeof clientRoundId === 'string' && clientRoundId.length > 0 ? clientRoundId : roundId;

    pendingUpdates.push({
      weights,
      sampleCount: sampleCount || 1,
      clientId,
      roundId: acceptedRoundId,
      timestamp: Date.now(),
    });

    clientCounts.set(clientId, (clientCounts.get(clientId) || 0) + 1);
    res.json({ success: true, roundId: acceptedRoundId, pendingUpdates: pendingUpdates.length });
  } catch (error) {
    console.error('Error processing v1 update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/fl/v1/round/:roundId/aggregate', (req, res) => {
  const requestedRound = req.params.roundId;
  // Aggregate only updates matching the requested round
  const forRound = pendingUpdates.filter(u => u.roundId === requestedRound);
  const remaining = pendingUpdates.filter(u => u.roundId !== requestedRound);

  if (forRound.length === 0) {
    return res.json({
      weights: globalModel,
      modelVersion,
      roundId,
      timestamp: lastAggregation,
      pendingUpdates: pendingUpdates.length,
      message: 'No updates for that round',
    });
  }

  console.log(`Aggregating ${forRound.length} updates for ${requestedRound}`);
  globalModel = federatedAverage(forRound);
  pendingUpdates = remaining;
  lastAggregation = Date.now();
  modelVersion += 1;
  maybeStartNewRound();

  res.json({
    weights: globalModel,
    modelVersion,
    roundId,
    timestamp: lastAggregation,
    pendingUpdates: pendingUpdates.length,
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Federated Learning Server running on http://localhost:${PORT}`);
  console.log(`Global model initialized:`, globalModel);
});
