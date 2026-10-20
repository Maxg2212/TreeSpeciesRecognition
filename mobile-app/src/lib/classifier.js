// The default "onnxruntime-web" entry pulls in the full multi-backend
// bundle (WebGPU/WebNN's jsep runtime included), whose wasm+loader pairing
// doesn't resolve under Vite's dev server. We only need CPU wasm, so use
// the dedicated wasm-only entry instead.
import * as ort from "onnxruntime-web/wasm";
// Explicit ?url import: lets Vite track this as a real asset (correctly
// served in dev, copied+hashed in prod) instead of relying on ort's own
// import.meta.url resolution, which doesn't survive Vite's dev server.
import ortWasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";
import classNames from "./class_names.json";

// xception_model.onnx: Keras Xception, input 224x224x3 channels-last (NHWC),
// preprocessed with Xception's own preprocess_input (scale to [-1, 1]), output
// already softmax probabilities over 16 classes (Dense(16, activation="softmax")).
const MODEL_URL = "/model/model.onnx";
const INPUT_SIZE = 224;

export const LABELS = classNames;

ort.env.wasm.wasmPaths = { "ort-wasm-simd-threaded.wasm": ortWasmUrl };
// Single-threaded: avoids needing cross-origin-isolation headers
// (SharedArrayBuffer) that this dev setup doesn't send.
ort.env.wasm.numThreads = 1;

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
  const pixelCount = INPUT_SIZE * INPUT_SIZE;
  const floatData = new Float32Array(pixelCount * 3);

  // HWC RGBA -> HWC RGB, scaled to [-1, 1] (Xception's preprocess_input).
  for (let i = 0; i < pixelCount; i++) {
    floatData[i * 3] = data[i * 4] / 127.5 - 1;
    floatData[i * 3 + 1] = data[i * 4 + 1] / 127.5 - 1;
    floatData[i * 3 + 2] = data[i * 4 + 2] / 127.5 - 1;
  }

  return new ort.Tensor("float32", floatData, [1, INPUT_SIZE, INPUT_SIZE, 3]);
}

export async function classifyImage(imageElement) {
  const session = await getSession();
  const tensor = imageToTensor(imageElement);
  const [inputName] = session.inputNames;
  const [outputName] = session.outputNames;
  const outputs = await session.run({ [inputName]: tensor });
  const probabilities = Array.from(outputs[outputName].data);

  let bestIndex = 0;
  for (let i = 1; i < probabilities.length; i++) {
    if (probabilities[i] > probabilities[bestIndex]) bestIndex = i;
  }

  return {
    species: LABELS[bestIndex] ?? `class_${bestIndex}`,
    confidence: probabilities[bestIndex],
  };
}
