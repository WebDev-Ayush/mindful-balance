# Federated Learning Server

This server coordinates federated learning for the Mindful Balance application. It implements federated averaging to aggregate model updates from multiple clients while preserving privacy.

## Features

- **Federated Averaging**: Aggregates model updates from multiple clients using weighted averaging
- **Privacy-Preserving**: Only model weights are shared, never raw user data
- **Automatic Aggregation**: Periodically aggregates pending updates
- **Client Tracking**: Tracks unique clients and their contributions

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The server will run on `http://localhost:3001` by default.

## API Endpoints

### `GET /health`
Health check endpoint.

### `GET /api/federated/model`
Get the current global model weights. Automatically aggregates pending updates if enough time has passed.

### `POST /api/federated/update`
Submit a model update from a client.

**Request Body:**
```json
{
  "weights": {
    "mood": -0.25,
    "sleepHours": -0.15,
    "sleepQuality": -0.2,
    "workHours": 0.15,
    "screenTime": 0.1,
    "physicalActivity": -0.1,
    "socialInteraction": -0.15,
    "bias": 50
  },
  "sampleCount": 10,
  "clientId": "uuid-here"
}
```

### `POST /api/federated/aggregate`
Force immediate aggregation of pending updates.

### `GET /api/federated/stats`
Get server statistics including pending updates, unique clients, and aggregation status.

## Environment Variables

- `PORT`: Server port (default: 3001)

## How It Works

1. Clients train locally on their data
2. Clients send only model weight updates (not raw data) to the server
3. Server aggregates updates using federated averaging
4. Server distributes the aggregated global model back to clients
5. Clients update their local models with the global model

This ensures user privacy while improving model accuracy through collective learning.

