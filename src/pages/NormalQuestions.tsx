import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { NormalCheckinForm } from '@/components/NormalCheckinForm';
import { getCameraPreference, loadDraft, saveDraft, setCameraPreference, type CameraPreference } from '@/lib/checkinFlow';
import type { WellnessData } from '@/lib/stressModel';
import { AlertCircle, Camera } from 'lucide-react';

export default function NormalQuestions() {
  const navigate = useNavigate();
  const draft = loadDraft();
  const [cameraPref, setCameraPref] = useState<CameraPreference>(() => getCameraPreference());
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    setCameraPreference(cameraPref);
  }, [cameraPref]);

  const handleRequestCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is not available in this browser.');
        setCameraPref('denied');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach(track => track.stop());
      setCameraPref('granted');
    } catch (err) {
      console.error('Camera permission error', err);
      setCameraError('Camera permission was denied. You can still continue without emotion-based analysis.');
      setCameraPref('denied');
    }
  };

  const handleNext = (partial: Omit<WellnessData, 'phq9'>) => {
    saveDraft({ ...draft, ...partial });
    navigate('/phq9');
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
          className="pt-10 space-y-4"
        >
          {cameraPref === 'unknown' && (
            <div className="glass-card rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Allow camera for emotion insights?</p>
              </div>
              <p className="text-xs text-muted-foreground">
                We use a short on-device camera snapshot later to estimate your facial emotion. Video never leaves your
                device, and this step is optional.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleRequestCamera}
                  className="inline-flex items-center rounded-full bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground hover:opacity-95 transition"
                >
                  Allow camera
                </button>
                <button
                  type="button"
                  onClick={() => setCameraPref('denied')}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  Not now
                </button>
              </div>
              {cameraError && (
                <div className="mt-2 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  <p className="text-[11px] text-destructive">{cameraError}</p>
                </div>
              )}
            </div>
          )}

          <NormalCheckinForm initialData={draft} onNext={handleNext} />
        </motion.section>
      </main>
    </div>
  );
}


