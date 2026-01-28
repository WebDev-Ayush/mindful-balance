import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { EmotionDetection, type EmotionResult } from '@/components/EmotionDetection';
import { loadDraft, saveResult as saveEmotionResult } from '@/lib/checkinFlow';
import { predictStress, saveWellnessData, type WellnessData } from '@/lib/stressModel';

export default function Emotion() {
  const navigate = useNavigate();
  const [emotion, setEmotion] = useState<EmotionResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    setIsSaving(true);
    try {
      const draft: WellnessData = loadDraft();

      // For now, we treat certain emotions as mildly increasing or decreasing stress.
      let emotionDelta = 0;
      if (emotion) {
        const sign =
          emotion.label === 'happy' || emotion.label === 'neutral'
            ? -1
            : emotion.label === 'sad' ||
              emotion.label === 'angry' ||
              emotion.label === 'fear' ||
              emotion.label === 'disgust'
            ? 1
            : 0;
        emotionDelta = sign * Math.round(emotion.confidence * 5);
      }

      const baseResult = predictStress(draft);
      const adjustedScore = Math.max(0, Math.min(100, baseResult.score + emotionDelta));
      const adjustedResult = { ...baseResult, score: adjustedScore };

      saveWellnessData({ ...draft, prediction: adjustedResult });
      saveEmotionResult(adjustedResult, draft);

      navigate('/analysis');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero">
      <Header />
      <main className="max-w-4xl mx-auto px-4 pb-16">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.25 }}
          className="pt-10 space-y-6"
        >
          <div className="max-w-2xl mx-auto text-center space-y-2">
            <h2 className="text-xl md:text-2xl font-semibold text-foreground">
              Optional emotion-based insight
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              If you&apos;re comfortable, we can run a quick on-device emotion scan to add another signal to your
              stress analysis. You can also skip this step.
            </p>
          </div>

          <div className="space-y-4">
            <EmotionDetection onDetected={setEmotion} />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate('/analysis')}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                Skip emotion scan
              </button>
              <button
                type="button"
                onClick={handleContinue}
                disabled={isSaving}
                className="inline-flex items-center rounded-full bg-gradient-to-r from-teal-400 via-sky-400 to-orange-400 px-4 py-1.5 text-[11px] font-semibold text-slate-950 shadow-glow hover:opacity-95 transition"
              >
                {isSaving ? 'Finalizing analysis…' : 'Continue to analysis'}
              </button>
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}

