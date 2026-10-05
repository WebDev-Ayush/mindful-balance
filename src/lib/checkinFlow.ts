import type { PredictionResult, WellnessData } from '@/lib/stressModel';

const DRAFT_KEY = 'checkin_draft_v1';
const RESULT_KEY = 'checkin_result_v1';
const CAMERA_KEY = 'checkin_camera_pref_v1';

export type WellnessDraft = WellnessData;

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function getDefaultDraft(): WellnessDraft {
  return {
    mood: 3,
    sleepHours: 7,
    sleepQuality: 3,
    workHours: 8,
    screenTime: 5,
    physicalActivity: 30,
    socialInteraction: 3,
    phq9: Array(9).fill(0),
  };
}

export function loadDraft(): WellnessDraft {
  const storage = getStorage();
  if (!storage) return getDefaultDraft();

  const raw = storage.getItem(DRAFT_KEY);
  if (!raw) return getDefaultDraft();
  try {
    const parsed = JSON.parse(raw) as Partial<WellnessDraft>;
    const base = getDefaultDraft();
    const phq9 = Array.isArray(parsed.phq9) ? parsed.phq9.slice(0, 9) : base.phq9;
    return {
      ...base,
      ...parsed,
      phq9: phq9.map(v => (Number.isFinite(v) ? Math.max(0, Math.min(3, v)) : 0)),
    };
  } catch {
    return getDefaultDraft();
  }
}

export function saveDraft(draft: WellnessDraft): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearDraft(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(DRAFT_KEY);
}

export function saveResult(result: PredictionResult, data: WellnessData): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(
    RESULT_KEY,
    JSON.stringify({
      result,
      data,
      savedAt: Date.now(),
    })
  );
}

export function loadResult():
  | { result: PredictionResult; data: WellnessData; savedAt: number }
  | null {
  const storage = getStorage();
  if (!storage) return null;
  const raw = storage.getItem(RESULT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { result: PredictionResult; data: WellnessData; savedAt: number };
    return parsed ?? null;
  } catch {
    return null;
  }
}

export function clearResult(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(RESULT_KEY);
}

export type CameraPreference = 'unknown' | 'granted' | 'denied';

export function getCameraPreference(): CameraPreference {
  const storage = getStorage();
  if (!storage) return 'unknown';
  const raw = storage.getItem(CAMERA_KEY);
  if (raw === 'granted' || raw === 'denied') return raw;
  return 'unknown';
}

export function setCameraPreference(status: CameraPreference): void {
  const storage = getStorage();
  if (!storage) return;
  if (status === 'unknown') {
    storage.removeItem(CAMERA_KEY);
  } else {
    storage.setItem(CAMERA_KEY, status);
  }
}


