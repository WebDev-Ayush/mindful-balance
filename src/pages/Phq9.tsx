import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Phq9Form } from '@/components/Phq9Form';
import { loadDraft, saveDraft, saveResult, clearResult } from '@/lib/checkinFlow';
import { predictStress, saveWellnessData, type WellnessData } from '@/lib/stressModel';

function FullscreenLoader({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            className="glass-card rounded-2xl p-6 w-[min(420px,90vw)] text-center space-y-4"
          >
            <div className="mb-preloader">
              <div className="mb-loader-main">
                <div className="mb-loaders">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={`bar-${i}`} className="mb-loader-bar" />
                  ))}
                </div>
                <div className="mb-loadersB">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={`col-${i}`} className="mb-loader-column">
                      <div className={`mb-ball mb-ball-${i}`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Analyzing locally…</p>
              <p className="text-xs text-muted-foreground">
                Previous steps are hidden while we generate your result.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Phq9() {
  const navigate = useNavigate();
  const draft = loadDraft();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (phq9: number[]) => {
    setIsProcessing(true);
    clearResult();

    try {
      const normalized = phq9.slice(0, 9).map(v => (Number.isFinite(v) ? Math.max(0, Math.min(3, v)) : 0));
      const full: WellnessData = { ...draft, phq9: normalized };
      saveDraft(full);

      // Simulate local processing time (and allow animation to be clearly visible)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = predictStress(full);
      saveWellnessData({ ...full, prediction: result });
      saveResult(result, full);

      // After PHQ-9, go to optional emotion scan step before final analysis
      navigate('/emotion');
    } catch (err) {
      console.error('PHQ-9 submission error:', err);
      // Fallback: go to analysis even if something failed, so user isn’t stuck
      navigate('/analysis');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero">
      <Header />
      <main className="max-w-3xl mx-auto px-4 pb-16">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.25 }}
          className="pt-10"
        >
          <Phq9Form
            initialValues={draft.phq9}
            onBack={() => navigate('/checkin')}
            onSubmit={handleSubmit}
            isProcessing={isProcessing}
          />
        </motion.section>
      </main>

      <FullscreenLoader visible={isProcessing} />
    </div>
  );
}


