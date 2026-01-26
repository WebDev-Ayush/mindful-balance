import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/Header';
import { WellnessForm } from '@/components/WellnessForm';
import { StressIndicator } from '@/components/StressIndicator';
import { WellnessTips } from '@/components/WellnessTips';
import { FactorBreakdown } from '@/components/FactorBreakdown';
import { PrivacyBadge } from '@/components/PrivacyBadge';
import { FederatedStatus } from '@/components/FederatedStatus';
import { predictStress, saveWellnessData, type WellnessData, type PredictionResult } from '@/lib/stressModel';

const Index = () => {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleWellnessSubmit = async (data: WellnessData) => {
    setIsProcessing(true);
    
    // Simulate local processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const result = predictStress(data);
    setPrediction(result);
    saveWellnessData({ ...data, prediction: result });
    
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen gradient-hero">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 pb-16">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 mb-8"
        >
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-foreground mb-4"
          >
            Your Wellness,{' '}
            <span className="text-gradient">Your Privacy</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Monitor your stress levels with AI that respects your privacy.
            All analysis happens locally on your device through federated learning.
          </motion.p>
        </motion.section>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            <WellnessForm onSubmit={handleWellnessSubmit} isProcessing={isProcessing} />
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <FederatedStatus />
            </motion.div>
          </motion.div>

          {/* Right Column - Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-6"
          >
            {/* Stress Indicator Card */}
            <div className="glass-card rounded-2xl p-8">
              <div className="flex flex-col items-center">
                <StressIndicator prediction={prediction} size="lg" />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {prediction && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <FactorBreakdown prediction={prediction} />
                  <WellnessTips prediction={prediction} />
                </motion.div>
              )}
            </AnimatePresence>

            {!prediction && (
              <PrivacyBadge variant="detailed" />
            )}
          </motion.div>
        </div>

        {/* How It Works Section */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-16"
        >
          <h3 className="text-2xl font-bold text-center mb-8 text-foreground">
            How Privacy-First AI Works
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Enter Your Data',
                description: 'Share your daily wellness metrics securely in your browser.',
              },
              {
                step: '02',
                title: 'Local Analysis',
                description: 'AI processes everything on your device. Raw data never leaves.',
              },
              {
                step: '03',
                title: 'Federated Learning',
                description: 'Only encrypted model updates improve the global AI, not your data.',
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="glass-card rounded-2xl p-6 text-center group hover:shadow-medium transition-shadow"
              >
                <div className="w-12 h-12 rounded-full gradient-calm text-primary-foreground font-bold text-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  {item.step}
                </div>
                <h4 className="font-semibold text-foreground mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground">
        <p>MindGuard • Privacy-First Wellness Monitoring</p>
        <p className="mt-1 text-xs">Your data never leaves your device.</p>
      </footer>
    </div>
  );
};

export default Index;
