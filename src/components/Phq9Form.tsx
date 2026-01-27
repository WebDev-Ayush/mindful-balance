import { useState } from 'react';
import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Brain, ArrowLeft, Sparkles } from 'lucide-react';

interface Phq9FormProps {
  initialValues?: number[];
  onBack?: () => void;
  onSubmit: (phq9: number[]) => void;
  isProcessing?: boolean;
}

const phq9Labels = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'];
const phq9Questions = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
  'Trouble concentrating on things, such as reading the newspaper or watching television',
  'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
  'Thoughts that you would be better off dead or of hurting yourself in some way',
];

export function Phq9Form({ initialValues, onBack, onSubmit, isProcessing }: Phq9FormProps) {
  const [values, setValues] = useState<number[]>(() => {
    const base = Array(9).fill(0);
    if (!initialValues) return base;
    return base.map((_, i) => {
      const v = initialValues[i];
      if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
      return Math.max(0, Math.min(3, v));
    });
  });

  const total = values.reduce((s, v) => s + v, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-4 flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <CardTitle className="text-xl">PHQ-9 Check-in</CardTitle>
        </div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </button>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Over the last 2 weeks, how often have you been bothered by the following?
            </Label>
            <span className="text-sm font-semibold text-foreground bg-muted px-2 py-0.5 rounded-md">
              Total: {total}/27
            </span>
          </div>

          <div className="space-y-5 max-h-[420px] pr-1 overflow-y-auto">
            {phq9Questions.map((question, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-foreground leading-snug">
                    <span className="text-muted-foreground mr-2">Q{idx + 1}.</span>
                    {question}
                  </p>
                  <span className="shrink-0 text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded-md">
                    {phq9Labels[values[idx] ?? 0]}
                  </span>
                </div>
                <Slider
                  value={[values[idx] ?? 0]}
                  onValueChange={([value]) =>
                    setValues(prev => {
                      const next = prev.slice(0, 9);
                      next[idx] = value;
                      return next;
                    })
                  }
                  min={0}
                  max={3}
                  step={1}
                  className="cursor-pointer"
                />
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            This questionnaire is for self-check only and is not a diagnosis. If you’re in immediate danger or
            considering self-harm, seek local emergency help.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              type="submit"
              className="w-full gradient-calm text-primary-foreground font-semibold py-4 text-base shadow-glow hover:shadow-medium transition-all duration-300"
              disabled={isProcessing}
            >
              <span className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                {isProcessing ? 'Analyzing...' : 'View Stress Analysis'}
              </span>
            </Button>
          </motion.div>
        </form>
      </CardContent>
    </Card>
  );
}

