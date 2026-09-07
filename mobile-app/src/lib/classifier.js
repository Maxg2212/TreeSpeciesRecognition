import * as ort from "onnxruntime-web";

// Adjust these to match however the .onnx model was actually exported
// (input tensor size, channel order, and normalization must match training).
const MODEL_URL = "/model/model.onnx";
const INPUT_SIZE = 224;
const INPUT_NAME = "input";
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

export const LABELS = [
  // Fill in with the actual class order the model was trained with.
];

let sessionPromise = null;

function getSession() {
  if (!sessionPromise) {
    sessionPromise = ort.InferenceSession.create(MODEL_URL).catch((err) => {
      sessionPromise = null;
      throw new Error(
        `Could not load ${MODEL_URL}. Place a trained model.onnx under public/model/ before running inference. (${err.message})`
      );
    });
  }
  return sessionPromise;
}

function imageToTensor(imageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(imageElement, 0, 0, INPUT_SIZE, INPUT_SIZE);

  const { data } = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
  const floatData = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
  const pixelCount = INPUT_SIZE * INPUT_SIZE;

  // HWC RGBA -> CHW RGB, normalized.
  for (let i = 0; i < pixelCount; i++) {
    const r = data[i * 4] / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;
    floatData[i] = (r - MEAN[0]) / STD[0];
    floatData[pixelCount + i] = (g - MEAN[1]) / STD[1];
    floatData[2 * pixelCount + i] = (b - MEAN[2]) / STD[2];
  }

  return new ort.Tensor("float32", floatData, [1, 3, INPUT_SIZE, INPUT_SIZE]);
}

function softmax(logits) {
  const max = Math.max(...logits);
  const exps = logits.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / sum);
}

export async function classifyImage(imageElement) {
  const session = await getSession();
  const tensor = imageToTensor(imageElement);
  const outputs = await session.run({ [INPUT_NAME]: tensor });
  const [outputName] = session.outputNames;
  const logits = Array.from(outputs[outputName].data);
  const probabilities = softmax(logits);

  let bestIndex = 0;
  for (let i = 1; i < probabilities.length; i++) {
    if (probabilities[i] > probabilities[bestIndex]) bestIndex = i;
  }

  return {
    species: LABELS[bestIndex] ?? `class_${bestIndex}`,
    confidence: probabilities[bestIndex],
  };
}
