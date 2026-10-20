`model.onnx` is a Keras Xception classifier, exported via `tf2onnx`.

- Input: `224x224x3`, channels-last (NHWC), preprocessed with Xception's
  own `preprocess_input` (scale pixels to `[-1, 1]`).
- Output: already-softmaxed probabilities over 16 classes — do not apply
  softmax again on the client.
- Labels: `../../src/lib/class_names.json`, in the exact order the model
  was trained on (index 0 = first output logit).

A second model (`densenet_model.onnx`, same 16 classes, ImageNet mean/std
normalization instead of `[-1, 1]`) was trained alongside this one but
isn't wired up — swap it in by pointing `MODEL_URL` at it and reverting
`imageToTensor` in `src/lib/classifier.js` to mean/std normalization
(`(pixel/255 - mean) / std`, not the current `pixel/127.5 - 1`).

If the model is ever re-exported, re-check `src/lib/classifier.js`
against the new file — `classifyImage` reads input/output tensor names
dynamically so a renamed Keras tensor won't break it, but the input
*shape* and *preprocessing* are **not** read from the file and must match
by hand.
