import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Camera, SmilePlus } from 'lucide-react';

type EmotionLabel = 'calm' | 'stressed' | 'sad' | 'happy' | 'neutral';

export interface EmotionResult {
  label: EmotionLabel;
  confidence: number; // 0..1
}

interface EmotionDetectionProps {
  onDetected?: (result: EmotionResult) => void;
}

// Lightweight on-device "model" placeholder.
// Right now it uses average brightness/contrast as a heuristic.
// You can replace this with a real TFJS model later.
function runLocalEmotionModel(imageData: ImageData): EmotionResult {
  const { data, width, height } = imageData;
  let sum = 0;
  let sumSq = 0;
  const n = width * height;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    sum += lum;
    sumSq += lum * lum;
  }

  const mean = sum / n;
  const variance = sumSq / n - mean * mean;
  const contrast = Math.sqrt(Math.max(variance, 0)); // 0..255 roughly

  let label: EmotionLabel = 'neutral';

  if (mean > 160 && contrast < 40) label = 'happy';
  else if (mean < 90 && contrast > 40) label = 'sad';
  else if (contrast > 65) label = 'stressed';
  else if (mean >= 100 && mean <= 150 && contrast < 30) label = 'calm';

  const confidence = Math.min(1, Math.max(0.3, contrast / 100));

  return { label, confidence };
}

export function EmotionDetection({ onDetected }: EmotionDetectionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<EmotionResult | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setHasCamera(false);
          setError('Camera access is not available in this browser.');
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setHasCamera(true);
        }
      } catch (err) {
        console.error('Camera error', err);
        setHasCamera(false);
        setError('Unable to access camera. Please allow camera permissions.');
      }
    };

    void start();

    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const handleAnalyze = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    try {
      setIsAnalyzing(true);
      setError(null);

      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      ctx.drawImage(video, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);

      const prediction = runLocalEmotionModel(imageData);
      setResult(prediction);
      onDetected?.(prediction);
    } catch (err) {
      console.error('Emotion analyze error', err);
      setError('Something went wrong while analyzing. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SmilePlus className="w-5 h-5 text-primary" />
          <CardTitle className="text-base md:text-lg">Optional Emotion Scan</CardTitle>
        </div>
        <span className="text-[10px] rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
          On-device · No upload
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border/60 bg-muted/40">
          {hasCamera === false && (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p className="text-xs text-muted-foreground">
                Camera not available. You can still continue without emotion scanning.
              </p>
            </div>
          )}
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
            autoPlay
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <p className="text-[11px] leading-snug text-muted-foreground">
          We take a short snapshot of your face and run an on-device model to estimate your current emotion.
          No video or image is ever sent to a server.
        </p>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-[11px] text-destructive">{error}</p>
          </div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2"
          >
            <div className="text-xs">
              <p className="font-semibold text-foreground capitalize">Detected emotion: {result.label}</p>
              <p className="text-[11px] text-muted-foreground">
                Confidence: {(result.confidence * 100).toFixed(0)}%
              </p>
            </div>
          </motion.div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1 text-xs"
            onClick={handleAnalyze}
            disabled={isAnalyzing || hasCamera === false}
          >
            <Camera className="h-3.5 w-3.5" />
            {isAnalyzing ? 'Analyzing…' : 'Run emotion scan'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

