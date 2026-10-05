import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Camera, SmilePlus } from 'lucide-react';
import * as tf from '@tensorflow/tfjs';
import * as faceapi from 'face-api.js';

type EmotionLabel =
  | 'angry'
  | 'disgust'
  | 'fear'
  | 'happy'
  | 'sad'
  | 'surprise'
  | 'neutral';

export interface EmotionResult {
  label: EmotionLabel;
  confidence: number; // 0..1
}

interface EmotionDetectionProps {
  onDetected?: (result: EmotionResult) => void;
}

const MODEL_URL = '/models/emotion/model.json';
const FACEAPI_MODEL_URL = '/models/face-api';

// FER2013 label order (matches your Python repo):
// 0 Angry, 1 Disgust, 2 Fear, 3 Happy, 4 Sad, 5 Surprise, 6 Neutral
const FER2013_LABELS: EmotionLabel[] = [
  'angry',
  'disgust',
  'fear',
  'happy',
  'sad',
  'surprise',
  'neutral',
];

type FaceBox = { x: number; y: number; width: number; height: number };

async function detectFaceBoxFromVideo(video: HTMLVideoElement): Promise<FaceBox | null> {
  const FaceDetectorCtor = (window as unknown as { FaceDetector?: new (opts?: unknown) => { detect: (input: unknown) => Promise<Array<{ boundingBox: DOMRectReadOnly }> > } })
    .FaceDetector;

  if (!FaceDetectorCtor) return null;

  try {
    const detector = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 1 });
    const faces = await detector.detect(video);
    const bb = faces?.[0]?.boundingBox;
    if (!bb) return null;
    return { x: bb.x, y: bb.y, width: bb.width, height: bb.height };
  } catch {
    return null;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function toSquareCrop(box: FaceBox, frameW: number, frameH: number): FaceBox {
  const size = Math.max(box.width, box.height);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const x = clamp(cx - size / 2, 0, Math.max(0, frameW - size));
  const y = clamp(cy - size / 2, 0, Math.max(0, frameH - size));
  const s = Math.min(size, frameW - x, frameH - y);
  return { x, y, width: s, height: s };
}

async function runTfjsEmotionModel(imageData: ImageData, model: tf.LayersModel): Promise<EmotionResult> {
  // This matches the Emotion-Recognition model: (1, 48, 48, 1) float32 in [0,1]
  const input = tf.tidy(() => {
    let img = tf.browser.fromPixels(imageData); // [h,w,3] (alpha may be dropped)
    img = tf.image.resizeBilinear(img, [48, 48], true);
    img = img.mean(2).expandDims(-1); // grayscale: [48,48,1]
    return img.expandDims(0).toFloat().div(255); // [1,48,48,1]
  });

  const out = model.predict(input) as tf.Tensor;
  const probs = await out.data();
  tf.dispose([input, out]);

  let bestIdx = 0;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[bestIdx]) bestIdx = i;
  }

  const label = FER2013_LABELS[bestIdx] ?? 'neutral';
  const confidence = Number(probs[bestIdx] ?? 0);
  return { label, confidence };
}

export function EmotionDetection({ onDetected }: EmotionDetectionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<EmotionResult | null>(null);
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [usingFaceApi, setUsingFaceApi] = useState(false);

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

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        // Prefer Face API expression net if present (real pretrained model).
        // Falls back to a custom TFJS model at /models/emotion/model.json.
        await tf.ready();

        try {
          await faceapi.nets.tinyFaceDetector.loadFromUri(FACEAPI_MODEL_URL);
          await faceapi.nets.faceExpressionNet.loadFromUri(FACEAPI_MODEL_URL);
          if (!alive) return;
          setUsingFaceApi(true);
          return;
        } catch (e) {
          console.warn('Face API models not available, falling back to custom TFJS model.', e);
        }

        const m = await tf.loadLayersModel(MODEL_URL);
        if (!alive) return;
        setModel(m);
      } catch (e) {
        console.error('Emotion model load error', e);
        if (!alive) return;
        setError(
          'Emotion models not found. Run `npm run setup:emotion` (downloads face-api models), or add a TFJS model to public/models/emotion/.',
        );
      } finally {
        if (!alive) return;
        setIsModelLoading(false);
      }
    };

    void load();

    return () => {
      alive = false;
    };
  }, []);

  const handleAnalyze = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    try {
      setIsAnalyzing(true);
      setError(null);

      if (!usingFaceApi && !model) {
        setError('Emotion model is not ready yet. Please wait a moment.');
        return;
      }

      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      ctx.drawImage(video, 0, 0, width, height);
      let prediction: EmotionResult;

      if (usingFaceApi) {
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
          .withFaceExpressions();

        if (!detection?.expressions) {
          setError('No face detected. Please face the camera and try again.');
          return;
        }

        const exp = detection.expressions;
        // Map face-api.js outputs to our labels (lowercase)
        const candidates: Array<[EmotionLabel, number]> = [
          ['angry', exp.angry ?? 0],
          ['disgust', exp.disgusted ?? 0],
          ['fear', exp.fearful ?? 0],
          ['happy', exp.happy ?? 0],
          ['sad', exp.sad ?? 0],
          ['surprise', exp.surprised ?? 0],
          ['neutral', exp.neutral ?? 0],
        ];

        candidates.sort((a, b) => b[1] - a[1]);
        prediction = { label: candidates[0]?.[0] ?? 'neutral', confidence: candidates[0]?.[1] ?? 0 };
      } else {
        const face = await detectFaceBoxFromVideo(video);

        // If face detection is unavailable, fall back to center-crop.
        const crop = face
          ? toSquareCrop(face, width, height)
          : { x: width * 0.2, y: height * 0.1, width: width * 0.6, height: height * 0.8 };

        const imageData = ctx.getImageData(
          Math.round(crop.x),
          Math.round(crop.y),
          Math.round(crop.width),
          Math.round(crop.height),
        );

        prediction = await runTfjsEmotionModel(imageData, model!);
      }

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
            disabled={isAnalyzing || isModelLoading || hasCamera === false}
          >
            <Camera className="h-3.5 w-3.5" />
            {isModelLoading ? 'Loading model…' : isAnalyzing ? 'Analyzing…' : 'Run emotion scan'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


