import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, Check, Lock, RefreshCw } from 'lucide-react';
import { generateModelUpdate, type ModelUpdate } from '@/lib/stressModel';

export function FederatedStatus() {
  const [status, setStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');
  const [lastUpdate, setLastUpdate] = useState<ModelUpdate | null>(null);

  useEffect(() => {
    // Simulate federated learning sync on mount
    const timer = setTimeout(() => {
      setStatus('syncing');
      setTimeout(() => {
        setLastUpdate(generateModelUpdate());
        setStatus('synced');
      }, 2000);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 border border-border"
    >
      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div
            key="idle"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"
          >
            <Cloud className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        )}
        {status === 'syncing' && (
          <motion.div
            key="syncing"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <RefreshCw className="w-4 h-4 text-primary" />
            </motion.div>
          </motion.div>
        )}
        {status === 'synced' && (
          <motion.div
            key="synced"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="w-8 h-8 rounded-lg bg-stress-low-bg flex items-center justify-center"
          >
            <Check className="w-4 h-4 text-stress-low" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          {status === 'idle' && 'Federated Learning'}
          {status === 'syncing' && 'Syncing model updates...'}
          {status === 'synced' && 'Model synchronized'}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {status === 'synced' && lastUpdate && (
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Encrypted update • {lastUpdate.parametersHash.slice(0, 12)}...
            </span>
          )}
          {status !== 'synced' && 'Privacy-preserving aggregation'}
        </p>
      </div>
    </motion.div>
  );
}
