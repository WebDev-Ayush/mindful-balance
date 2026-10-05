import { motion } from 'framer-motion';
import { Shield, Lock, Cpu, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrivacyBadgeProps {
  variant?: 'compact' | 'detailed';
}

export function PrivacyBadge({ variant = 'compact' }: PrivacyBadgeProps) {
  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stress-low-bg text-stress-low text-xs font-medium"
      >
        <Shield className="w-3.5 h-3.5" />
        <span>Privacy Protected</span>
      </motion.div>
    );
  }

  const features = [
    {
      icon: Cpu,
      title: 'On-Device AI',
      description: 'Analysis happens locally in your browser',
    },
    {
      icon: Lock,
      title: 'No Raw Data Sent',
      description: 'Your personal data never leaves your device',
    },
    {
      icon: Cloud,
      title: 'Federated Learning',
      description: 'Model improves without sharing your data',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-6 space-y-4"
    >
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl gradient-calm flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Privacy-First Architecture</h3>
          <p className="text-xs text-muted-foreground">Your data stays with you</p>
        </div>
      </div>

      <div className="grid gap-3">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * index }}
            className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
          >
            <feature.icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{feature.title}</p>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

