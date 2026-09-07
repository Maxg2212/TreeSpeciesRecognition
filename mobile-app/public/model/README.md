Place the trained, exported model here as `model.onnx`.

Pipeline: train/fine-tune the classifier (TF/Keras) → export to `.onnx` via
`tf2onnx` → drop the resulting file here as `model.onnx`.

Until a real model is added, `src/lib/classifier.js` will fail to load the
session — that's expected; the rest of the capture/geolocate/submit flow
can still be exercised by stubbing `classifyImage`.

When the real model is added, update in `src/lib/classifier.js`:
- `INPUT_SIZE` to match the model's expected input resolution
- `INPUT_NAME` to match the model's actual input tensor name
- `MEAN` / `STD` to match the normalization used during training
- `LABELS` to the class order used during training
