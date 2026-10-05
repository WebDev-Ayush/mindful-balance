## Emotion model files go here

This app expects a TensorFlow.js **Layers** model at:

- `public/models/emotion/model.json`
- plus the referenced weight shard files (e.g. `group1-shard1of1.bin`, etc.)

### Recommended (works out of the box): Face API pretrained expression model

This repo also supports a ready-to-use pretrained on-device model (no training required).

1. Install deps:

```bash
npm install
```

2. Download the model files into `public/models/face-api/`:

```bash
npm run setup:emotion
```

Then restart the dev server and the emotion scan will use Face API automatically.

### How to generate these from `Emotion-Recognition/emotion_model.h5`

1. Make sure you have `emotion_model.h5` (train it via `Emotion-Recognition/model_maker.py` or download it).
2. Convert it to TFJS using the Python converter:

```bash
python -m pip install tensorflowjs
tensorflowjs_converter \
  --input_format=keras \
  "emotion_model.h5" \
  "/path/to/mindful-balance/public/models/emotion"
```

After that, restart the Vite dev server and the web app will load the model on-device.


