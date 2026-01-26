import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PredictionResult } from '@/lib/stressModel';

interface FactorBreakdownProps {
  prediction: PredictionResult | null;
}

export function FactorBreakdown({ prediction }: FactorBreakdownProps) {
  if (!prediction) return null;

  const impactConfig = {
    positive: {
      icon: TrendingDown,
      label: 'Reducing stress',
      color: 'text-stress-low',
      bg: 'bg-stress-low-bg',
    },
    negative: {
      icon: TrendingUp,
      label: 'Increasing stress',
      color: 'text-stress-high',
      bg: 'bg-stress-high-bg',
    },
    neutral: {
      icon: Minus,
      label: 'Neutral impact',
      color: 'text-stress-medium',
      bg: 'bg-stress-medium-bg',
    },
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="w-5 h-5 text-primary" />
          Key Factors
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {prediction.factors.map((factor, index) => {
          const config = impactConfig[factor.impact];
          const Icon = config.icon;

          return (
            <motion.div
              key={factor.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.bg)}>
                  <Icon className={cn('w-4 h-4', config.color)} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{factor.name}</p>
                  <p className={cn('text-xs', config.color)}>{config.label}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className={cn('h-full rounded-full', config.bg)}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(factor.contribution * 5, 100)}%` }}
                    transition={{ delay: 0.2 + 0.1 * index, duration: 0.5 }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
