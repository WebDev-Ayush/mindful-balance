import { useState } from 'react';
import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Brain, Moon, Briefcase, Smartphone, Dumbbell, Users, Sparkles } from 'lucide-react';
import type { WellnessData } from '@/lib/stressModel';

interface WellnessFormProps {
  onSubmit: (data: WellnessData) => void;
  isProcessing?: boolean;
}

const moodLabels = ['Very Low', 'Low', 'Neutral', 'Good', 'Great'];
const qualityLabels = ['Poor', 'Fair', 'Average', 'Good', 'Excellent'];
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

export function WellnessForm({ onSubmit, isProcessing }: WellnessFormProps) {
  const [data, setData] = useState<WellnessData>({
    mood: 3,
    sleepHours: 7,
    sleepQuality: 3,
    workHours: 8,
    screenTime: 5,
    physicalActivity: 30,
    socialInteraction: 3,
    phq9: Array(9).fill(0),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(data);
  };

  const formFields = [
    {
      key: 'mood' as const,
      label: 'Current Mood',
      icon: Brain,
      min: 1,
      max: 5,
      step: 1,
      displayValue: moodLabels[data.mood - 1],
      color: 'text-primary',
    },
    {
      key: 'sleepHours' as const,
      label: 'Sleep Duration',
      icon: Moon,
      min: 0,
      max: 12,
      step: 0.5,
      displayValue: `${data.sleepHours} hours`,
      color: 'text-indigo-500',
    },
    {
      key: 'sleepQuality' as const,
      label: 'Sleep Quality',
      icon: Moon,
      min: 1,
      max: 5,
      step: 1,
      displayValue: qualityLabels[data.sleepQuality - 1],
      color: 'text-indigo-500',
    },
    {
      key: 'workHours' as const,
      label: 'Work Hours Today',
      icon: Briefcase,
      min: 0,
      max: 16,
      step: 0.5,
      displayValue: `${data.workHours} hours`,
      color: 'text-amber-500',
    },
    {
      key: 'screenTime' as const,
      label: 'Screen Time',
      icon: Smartphone,
      min: 0,
      max: 16,
      step: 0.5,
      displayValue: `${data.screenTime} hours`,
      color: 'text-rose-500',
    },
    {
      key: 'physicalActivity' as const,
      label: 'Physical Activity',
      icon: Dumbbell,
      min: 0,
      max: 180,
      step: 5,
      displayValue: `${data.physicalActivity} min`,
      color: 'text-emerald-500',
    },
    {
      key: 'socialInteraction' as const,
      label: 'Social Interaction',
      icon: Users,
      min: 1,
      max: 5,
      step: 1,
      displayValue: qualityLabels[data.socialInteraction - 1],
      color: 'text-sky-500',
    },
  ];

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="w-5 h-5 text-primary" />
          Daily Wellness Check-in
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {formFields.map((field, index) => (
            <motion.div
              key={field.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <field.icon className={`w-4 h-4 ${field.color}`} />
                  {field.label}
                </Label>
                <span className="text-sm font-semibold text-foreground bg-muted px-2 py-0.5 rounded-md">
                  {field.displayValue}
                </span>
              </div>
              <Slider
                value={[data[field.key]]}
                onValueChange={([value]) => setData(prev => ({ ...prev, [field.key]: value }))}
                min={field.min}
                max={field.max}
                step={field.step}
                className="cursor-pointer"
              />
            </motion.div>
          ))}

          {/* PHQ-9 Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="space-y-4 pt-2"
          >
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                PHQ-9 (last 2 weeks)
              </Label>
              <span className="text-sm font-semibold text-foreground bg-muted px-2 py-0.5 rounded-md">
                Total: {data.phq9.reduce((s, v) => s + v, 0)}/27
              </span>
            </div>

            <div className="space-y-5">
              {phq9Questions.map((question, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-foreground leading-snug">
                      <span className="text-muted-foreground mr-2">Q{idx + 1}.</span>
                      {question}
                    </p>
                    <span className="shrink-0 text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded-md">
                      {phq9Labels[data.phq9[idx] ?? 0]}
                    </span>
                  </div>
                  <Slider
                    value={[data.phq9[idx] ?? 0]}
                    onValueChange={([value]) =>
                      setData(prev => {
                        const next = prev.phq9.slice(0, 9);
                        next[idx] = value;
                        return { ...prev, phq9: next };
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
              This questionnaire is for self-check only and is not a diagnosis. If you’re in immediate danger or considering self-harm, seek local emergency help.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              type="submit"
              className="w-full gradient-calm text-primary-foreground font-semibold py-6 text-lg shadow-glow hover:shadow-medium transition-all duration-300"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Brain className="w-5 h-5" />
                  </motion.span>
                  Analyzing locally...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Analyze Stress Level
                </span>
              )}
            </Button>
          </motion.div>
        </form>
      </CardContent>
    </Card>
  );
}

