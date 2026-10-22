import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from "@mediapipe/tasks-vision";

const MODELO = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export async function cargarDetector(): Promise<HandLandmarker> {
  const archivos = await FilesetResolver.forVisionTasks("/mediapipe");
  const opciones = (delegate: "GPU" | "CPU") => ({
    baseOptions: { modelAssetPath: MODELO, delegate },
    runningMode: "VIDEO" as const,
    numHands: 1,
    minHandDetectionConfidence: 0.6,
    minTrackingConfidence: 0.5,
  });
  try {
    return await HandLandmarker.createFromOptions(archivos, opciones("GPU"));
  } catch {
    // Algunos celulares no dejan usar la GPU
    return await HandLandmarker.createFromOptions(archivos, opciones("CPU"));
  }
}

// Huesos de la mano: pares de puntos que se unen con una línea
const HUESOS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

export function dibujarMano(lienzo: HTMLCanvasElement, r: HandLandmarkerResult | null, color: string) {
  const ctx = lienzo.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, lienzo.width, lienzo.height);
  const puntos = r?.landmarks?.[0];
  if (!puntos) return;
  const { width: w, height: h } = lienzo;
  ctx.lineWidth = Math.max(2, w / 220);
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  for (const [a, b] of HUESOS) {
    ctx.beginPath();
    ctx.moveTo(puntos[a].x * w, puntos[a].y * h);
    ctx.lineTo(puntos[b].x * w, puntos[b].y * h);
    ctx.stroke();
  }
  ctx.fillStyle = "#fff";
  for (const p of puntos) {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, Math.max(2.5, w / 160), 0, Math.PI * 2);
    ctx.fill();
  }
}

const r4 = (n: number) => Math.round(n * 10000) / 10000;

// Los 21 puntos en dos versiones: sobre la imagen (p) y en metros alrededor de la mano (w)
export function cuadroDe(r: HandLandmarkerResult) {
  const p = r.landmarks[0].flatMap((q) => [r4(q.x), r4(q.y), r4(q.z)]);
  const w = (r.worldLandmarks[0] ?? []).flatMap((q) => [r4(q.x), r4(q.y), r4(q.z)]);
  return { p, w };
}
