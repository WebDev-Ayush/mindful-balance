import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Heart, Coffee, Trees, Music, BookOpen } from 'lucide-react';
import type { StressLevel, PredictionResult } from '@/lib/stressModel';

interface WellnessTipsProps {
  prediction: PredictionResult | null;
}

const tipsByLevel: Record<StressLevel, { icon: typeof Lightbulb; title: string; description: string }[]> = {
  low: [
    { icon: Heart, title: 'Maintain Your Routine', description: 'Your current habits are working well. Keep them up!' },
    { icon: Trees, title: 'Enjoy Nature', description: 'A walk outside can help maintain your positive state.' },
    { icon: Music, title: 'Express Gratitude', description: 'Take a moment to appreciate the good things in your day.' },
  ],
  medium: [
    { icon: Coffee, title: 'Take Short Breaks', description: 'Step away from work every 90 minutes for 10-15 minutes.' },
    { icon: Trees, title: 'Try Deep Breathing', description: '4-7-8 breathing: inhale 4s, hold 7s, exhale 8s.' },
    { icon: BookOpen, title: 'Limit Screen Time', description: 'Consider reducing recreational screen time before bed.' },
  ],
  high: [
    { icon: Heart, title: 'Practice Self-Compassion', description: "It's okay to feel stressed. Be gentle with yourself." },
    { icon: Trees, title: 'Get Moving', description: 'Even a 10-minute walk can help reduce stress hormones.' },
    { icon: Music, title: 'Connect With Someone', description: 'Talking to a friend or loved one can provide relief.' },
    { icon: Lightbulb, title: 'Consider Support', description: 'If stress persists, speaking with a professional can help.' },
  ],
};

export function WellnessTips({ prediction }: WellnessTipsProps) {
  if (!prediction) return null;

  const tips = tipsByLevel[prediction.level];

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="w-5 h-5 text-stress-medium" />
          Personalized Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tips.map((tip, index) => (
          <motion.div
            key={tip.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group cursor-default"
          >
            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <tip.icon className="w-4 h-4 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{tip.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{tip.description}</p>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
