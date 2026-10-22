import { useEffect, useRef, useState } from "react";
import type { HandLandmarker, HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { cargarDetector, dibujarMano } from "./mano";

export type EstadoCamara = { tipo: "cargando" } | { tipo: "error"; mensaje: string } | { tipo: "listo" };

// Abre la cámara, detecta la mano en cada cuadro y la dibuja encima. alResultado recibe cada detección.
export function useCamaraMano(alResultado: (r: HandLandmarkerResult) => void, color: () => string) {
  const video = useRef<HTMLVideoElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const cb = useRef(alResultado);
  const colorRef = useRef(color);
  cb.current = alResultado;
  colorRef.current = color;
  const [estado, setEstado] = useState<EstadoCamara>({ tipo: "cargando" });
  const [hayMano, setHayMano] = useState(false);

  useEffect(() => {
    let vivo = true;
    let flujo: MediaStream | null = null;
    let detector: HandLandmarker | null = null;
    let cuadro = 0;
    let tiempoVideo = -1;

    (async () => {
      try {
        flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } }, audio: false });
      } catch {
        if (vivo) setEstado({ tipo: "error", mensaje: "No se pudo usar la cámara. Revisa que le diste permiso a esta página y que ninguna otra app la esté usando." });
        return;
      }
      if (!vivo) {
        flujo.getTracks().forEach((t) => t.stop());
        return;
      }
      const v = video.current!;
      v.srcObject = flujo;
      await v.play().catch(() => undefined);
      try {
        detector = await cargarDetector();
      } catch {
        if (vivo) setEstado({ tipo: "error", mensaje: "No se pudo cargar el modelo que detecta la mano. Revisa el internet y recarga la página." });
        return;
      }
      if (!vivo) {
        detector.close();
        return;
      }
      setEstado({ tipo: "listo" });

      const ciclo = () => {
        if (!vivo) return;
        if (detector && v.readyState >= 2 && v.currentTime !== tiempoVideo) {
          tiempoVideo = v.currentTime;
          const c = lienzo.current!;
          if (c.width !== v.videoWidth) {
            c.width = v.videoWidth;
            c.height = v.videoHeight;
          }
          const r = detector.detectForVideo(v, performance.now());
          setHayMano(r.landmarks.length > 0);
          dibujarMano(c, r, colorRef.current());
          cb.current(r);
        }
        cuadro = requestAnimationFrame(ciclo);
      };
      cuadro = requestAnimationFrame(ciclo);
    })();

    return () => {
      vivo = false;
      cancelAnimationFrame(cuadro);
      flujo?.getTracks().forEach((t) => t.stop());
      detector?.close();
    };
  }, []);

  return { video, lienzo, estado, hayMano };
}
