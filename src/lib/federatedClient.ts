// Client for federated learning server communication

const API_BASE_URL = import.meta.env.VITE_FEDERATED_SERVER_URL || 'http://localhost:3001';

export interface ServerModel {
  weights: {
    mood: number;
    sleepHours: number;
    sleepQuality: number;
    workHours: number;
    screenTime: number;
    physicalActivity: number;
    socialInteraction: number;
    phq9: number;
    bias: number;
  };
  timestamp: number;
  pendingUpdates: number;
  modelVersion?: number;
  roundId?: string;
}

export interface UpdateResponse {
  success: boolean;
  message: string;
  pendingUpdates: number;
}

export interface ServerStats {
  globalModel: ServerModel['weights'];
  pendingUpdates: number;
  uniqueClients: number;
  lastAggregation: string;
  clientCounts: Record<string, number>;
}

// Get or create client ID
function getClientId(): string {
  let clientId = localStorage.getItem('federated_client_id');
  if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem('federated_client_id', clientId);
  }
  return clientId;
}

export async function registerClient(): Promise<string> {
  const existing = localStorage.getItem('federated_client_id');
  if (existing) return existing;
  const response = await fetch(`${API_BASE_URL}/api/fl/v1/register`, { method: 'POST' });
  if (!response.ok) throw new Error(`Register failed: ${response.status}`);
  const data = await response.json();
  const clientId = data.clientId as string;
  localStorage.setItem('federated_client_id', clientId);
  return clientId;
}

export interface RoundInfo {
  roundId: string;
  startedAt: number;
  minUpdatesToAggregate: number;
  pendingUpdates: number;
  modelVersion: number;
}

export async function fetchRoundInfo(): Promise<RoundInfo> {
  const response = await fetch(`${API_BASE_URL}/api/fl/v1/round`);
  if (!response.ok) throw new Error(`Round fetch failed: ${response.status}`);
  return await response.json();
}

// Fetch global model from server
export async function fetchGlobalModel(): Promise<ServerModel> {
  try {
    // Prefer v1 API when available
    const v1 = await fetch(`${API_BASE_URL}/api/fl/v1/model`);
    if (v1.ok) return await v1.json();

    // Fallback to legacy endpoint
    const legacy = await fetch(`${API_BASE_URL}/api/federated/model`);
    if (!legacy.ok) throw new Error(`HTTP error! status: ${legacy.status}`);
    return await legacy.json();
  } catch (error) {
    console.error('Error fetching global model:', error);
    throw error;
  }
}

// Submit model update to server
export async function submitModelUpdate(
  weights: ServerModel['weights'],
  sampleCount: number = 1
): Promise<UpdateResponse> {
  try {
    const clientId = await registerClient();
    let roundId: string | undefined;
    try {
      const round = await fetchRoundInfo();
      roundId = round.roundId;
    } catch {
      // ignore; server might not support v1
    }

    // Prefer v1 endpoint
    const v1 = await fetch(`${API_BASE_URL}/api/fl/v1/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weights, sampleCount, clientId, roundId }),
    });
    if (v1.ok) return await v1.json();

    // Fallback to legacy endpoint
    const legacy = await fetch(`${API_BASE_URL}/api/federated/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weights, sampleCount, clientId }),
    });
    if (!legacy.ok) throw new Error(`HTTP error! status: ${legacy.status}`);
    return await legacy.json();
  } catch (error) {
    console.error('Error submitting model update:', error);
    throw error;
  }
}

// Get server statistics
export async function getServerStats(): Promise<ServerStats> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/federated/stats`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching server stats:', error);
    throw error;
  }
}

// Force aggregation on server
export async function forceAggregation(): Promise<ServerModel> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/federated/aggregate`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return {
      weights: data.weights,
      timestamp: Date.now(),
      pendingUpdates: 0,
    };
  } catch (error) {
    console.error('Error forcing aggregation:', error);
    throw error;
  }
}

// Check server health
export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

