import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, Check, Lock, RefreshCw, AlertCircle } from 'lucide-react';
import { 
  getModelWeights, 
  updateModelWeights, 
  getWellnessHistory,
  trainLocalModel,
  type ModelWeights 
} from '@/lib/stressModel';
import { 
  fetchGlobalModel, 
  submitModelUpdate, 
  checkServerHealth,
  type ServerModel 
} from '@/lib/federatedClient';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export function FederatedStatus() {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  // Check server health on mount
  useEffect(() => {
    checkServerHealth().then(setServerOnline);
  }, []);

  // Sync with federated learning server
  const syncWithServer = useCallback(async () => {
    try {
      setStatus('syncing');
      setError(null);

      // Check if server is online
      const isOnline = await checkServerHealth();
      setServerOnline(isOnline);

      if (!isOnline) {
        setStatus('offline');
        return;
      }

      // Fetch latest global model
      const globalModel = await fetchGlobalModel();
      
      // Update local model with global weights
      updateModelWeights(globalModel.weights);
      
      // Train on local data if available
      const localHistory = getWellnessHistory();
      if (localHistory.length > 0) {
        const trainingData = localHistory.slice(-10).map(entry => ({
          data: {
            mood: entry.mood,
            sleepHours: entry.sleepHours,
            sleepQuality: entry.sleepQuality,
            workHours: entry.workHours,
            screenTime: entry.screenTime,
            physicalActivity: entry.physicalActivity,
            socialInteraction: entry.socialInteraction,
            phq9: Array.isArray(entry.phq9) ? entry.phq9.slice(0, 9) : Array(9).fill(0),
          },
          target: entry.prediction?.score,
        }));

        if (trainingData.length > 0) {
          // Train locally
          const gradientUpdate = trainLocalModel(trainingData, 1);
          
          // Apply gradients to get updated weights
          const currentWeights = getModelWeights();
          const updatedWeights: ModelWeights = {
            mood: currentWeights.mood - (gradientUpdate.gradients.mood || 0),
            sleepHours: currentWeights.sleepHours - (gradientUpdate.gradients.sleepHours || 0),
            sleepQuality: currentWeights.sleepQuality - (gradientUpdate.gradients.sleepQuality || 0),
            workHours: currentWeights.workHours - (gradientUpdate.gradients.workHours || 0),
            screenTime: currentWeights.screenTime - (gradientUpdate.gradients.screenTime || 0),
            physicalActivity: currentWeights.physicalActivity - (gradientUpdate.gradients.physicalActivity || 0),
            socialInteraction: currentWeights.socialInteraction - (gradientUpdate.gradients.socialInteraction || 0),
            bias: currentWeights.bias - (gradientUpdate.gradients.bias || 0),
          };

          // Submit update to server
          await submitModelUpdate(updatedWeights, gradientUpdate.sampleCount);
        }
      } else {
        // No local data, just submit current weights
        const currentWeights = getModelWeights();
        await submitModelUpdate(currentWeights, 1);
      }

      setStatus('synced');
      setLastSync(new Date());
    } catch (err) {
      console.error('Federated sync error:', err);
      setError(err instanceof Error ? err.message : 'Sync failed');
      setStatus('error');
    }
  }, []);

  // Initial sync on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      syncWithServer();
    }, 2000);

    return () => clearTimeout(timer);
  }, [syncWithServer]);

  // Periodic sync every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (status !== 'syncing') {
        syncWithServer();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [syncWithServer, status]);

  const getStatusIcon = () => {
    switch (status) {
      case 'idle':
        return <Cloud className="w-4 h-4 text-muted-foreground" />;
      case 'syncing':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw className="w-4 h-4 text-primary" />
          </motion.div>
        );
      case 'synced':
        return <Check className="w-4 h-4 text-stress-low" />;
      case 'error':
      case 'offline':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return 'Federated Learning';
      case 'syncing':
        return 'Syncing model updates...';
      case 'synced':
        return 'Model synchronized';
      case 'error':
        return 'Sync error';
      case 'offline':
        return 'Server offline';
    }
  };

  const getStatusSubtext = () => {
    if (status === 'synced' && lastSync) {
      const minutesAgo = Math.floor((Date.now() - lastSync.getTime()) / 60000);
      return `Last sync: ${minutesAgo === 0 ? 'just now' : `${minutesAgo}m ago`}`;
    }
    if (status === 'error' && error) {
      return error;
    }
    if (status === 'offline') {
      return 'Retrying connection...';
    }
    return 'Privacy-preserving aggregation';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 border border-border"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            status === 'syncing' 
              ? 'bg-primary/10' 
              : status === 'synced'
              ? 'bg-stress-low-bg'
              : status === 'error' || status === 'offline'
              ? 'bg-destructive/10'
              : 'bg-muted'
          }`}
        >
          {getStatusIcon()}
        </motion.div>
      </AnimatePresence>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          {getStatusText()}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {status === 'synced' && (
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              {getStatusSubtext()}
            </span>
          )}
          {status !== 'synced' && getStatusSubtext()}
        </p>
      </div>
    </motion.div>
  );
}
