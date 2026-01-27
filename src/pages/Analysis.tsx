import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { StressIndicator } from '@/components/StressIndicator';
import { FactorBreakdown } from '@/components/FactorBreakdown';
import { WellnessTips } from '@/components/WellnessTips';
import { FederatedStatus } from '@/components/FederatedStatus';
import { clearDraft, clearResult, loadDraft } from '@/lib/checkinFlow';
import { predictStress, saveWellnessData, type PredictionResult, type WellnessData } from '@/lib/stressModel';

export default function Analysis() {
  const navigate = useNavigate();
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);

  useEffect(() => {
    // Always compute from the latest saved draft so the page never shows "no analysis"
    const draft: WellnessData = loadDraft();
    const result = predictStress(draft);
    saveWellnessData({ ...draft, prediction: result });
    setPrediction(result);
  }, []);

  if (!prediction) {
    return (
      <div className="min-h-screen gradient-hero">
        <Header />
        <main className="max-w-3xl mx-auto px-4 pb-16 pt-10">
          <div className="glass-card rounded-2xl p-6 space-y-3">
            <p className="text-sm font-semibold text-foreground">
              No analysis yet
            </p>
            <p className="text-xs text-muted-foreground">
              Complete the check-in to see your stress analysis.
            </p>
            <button
              type="button"
              onClick={() => navigate('/checkin')}
              className="text-xs font-medium text-primary hover:underline"
            >
              Start check-in
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero">
      <Header />
      <main className="max-w-6xl mx-auto px-4 pb-16">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.25 }}
          className="pt-10 space-y-8"
        >
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-8">
                <div className="flex flex-col items-center">
                  <StressIndicator prediction={prediction} size="lg" />
                </div>
              </div>

              <FederatedStatus />

              <div className="glass-card rounded-2xl p-6 space-y-3">
                <p className="text-sm font-semibold text-foreground">Next steps</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/checkin')}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    New check-in
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearDraft();
                      clearResult();
                      navigate('/checkin');
                    }}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Reset answers
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <FactorBreakdown prediction={prediction} />
              <WellnessTips prediction={prediction} />
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}

