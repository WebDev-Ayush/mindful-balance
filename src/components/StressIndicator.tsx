import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { StressLevel, PredictionResult } from '@/lib/stressModel';

interface StressIndicatorProps {
  prediction: PredictionResult | null;
  size?: 'sm' | 'md' | 'lg';
}

const levelConfig = {
  low: {
    label: 'Low Stress',
    description: "You're doing great! Keep up the healthy habits.",
    emoji: '🌿',
    gradient: 'from-stress-low to-emerald-400',
    bgClass: 'stress-indicator-low',
  },
  medium: {
    label: 'Moderate Stress',
    description: 'Some tension detected. Consider taking a break.',
    emoji: '🌤️',
    gradient: 'from-stress-medium to-amber-400',
    bgClass: 'stress-indicator-medium',
  },
  high: {
    label: 'Elevated Stress',
    description: 'Your body needs attention. Try some relaxation.',
    emoji: '🌅',
    gradient: 'from-stress-high to-orange-400',
    bgClass: 'stress-indicator-high',
  },
};

const sizeConfig = {
  sm: { ring: 'w-24 h-24', text: 'text-lg', score: 'text-2xl' },
  md: { ring: 'w-40 h-40', text: 'text-xl', score: 'text-4xl' },
  lg: { ring: 'w-56 h-56', text: 'text-2xl', score: 'text-5xl' },
};

export function StressIndicator({ prediction, size = 'md' }: StressIndicatorProps) {
  if (!prediction) {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <div className={cn(
          sizeConfig[size].ring,
          'rounded-full border-4 border-dashed border-muted-foreground/20 flex items-center justify-center'
        )}>
          <span className="text-muted-foreground text-sm text-center px-4">
            Enter your wellness data to see your stress level
          </span>
        </div>
      </div>
    );
  }

  const config = levelConfig[prediction.level];
  const { ring, text, score } = sizeConfig[size];
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (prediction.score / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex flex-col items-center gap-6"
    >
      <div className="relative">
        <motion.div
          className={cn(ring, 'rounded-full flex items-center justify-center relative')}
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Background circle */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted/50"
            />
            <motion.circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              stroke="url(#stressGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
            />
            <defs>
              <linearGradient id="stressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={prediction.level === 'low' ? '#22c55e' : prediction.level === 'medium' ? '#f59e0b' : '#ef4444'} />
                <stop offset="100%" stopColor={prediction.level === 'low' ? '#10b981' : prediction.level === 'medium' ? '#fbbf24' : '#f97316'} />
              </linearGradient>
            </defs>
          </svg>

          {/* Center content */}
          <div className="flex flex-col items-center z-10">
            <motion.span
              className="text-3xl"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {config.emoji}
            </motion.span>
            <motion.span
              className={cn(score, 'font-bold bg-clip-text text-transparent bg-gradient-to-br', config.gradient)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {Math.round(prediction.score)}
            </motion.span>
          </div>
        </motion.div>

        {/* Confidence indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-card px-3 py-1 rounded-full shadow-soft border border-border text-xs font-medium text-muted-foreground"
        >
          {Math.round(prediction.confidence * 100)}% confidence
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-center space-y-2"
      >
        <h3 className={cn(text, 'font-semibold', config.bgClass, 'inline-block px-4 py-2 rounded-full')}>
          {config.label}
        </h3>
        <p className="text-muted-foreground max-w-xs mx-auto">
          {config.description}
        </p>
      </motion.div>
    </motion.div>
  );
}
