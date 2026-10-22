import { useCallback, useEffect, useRef, useState } from "react";
import type { HandLandmarker, HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { LAMINA_OFICIAL, LETRAS, META, type Letra } from "./letras";
import { cargarDetector, cuadroDe, dibujarMano } from "./mano";
import { guardarMuestra, type Cuadro } from "./nube";

type Progreso = Partial<Record<Letra, number>>;

const leerProgreso = (): Progreso => {
  try {
    return JSON.parse(localStorage.getItem("lsc:progreso") ?? "{}");
  } catch {
    return {};
  }
};

export function App() {
  const [empezo, setEmpezo] = useState(false);
  return empezo ? <Grabar /> : <Inicio onEmpezar={() => setEmpezo(true)} />;
}

function Inicio({ onEmpezar }: { onEmpezar: () => void }) {
  return (
    <main className="inicio">
      <p className="marca">Alfabeto LSC</p>
      <h1>Ayúdame a enseñarle a un modelo el alfabeto de la Lengua de Señas Colombiana</h1>
      <p>
        Estoy haciendo una app que reconoce con la cámara las letras del alfabeto de señas. Para que aprenda necesita ejemplos de muchas manos, y aquí puedes grabar los tuyos. No necesitas saber
        lengua de señas: copias cada letra de la lámina oficial.
      </p>
      <ol className="pasos">
        <li>Abre la lámina del alfabeto (botón de abajo). Si puedes, ábrela en otro equipo o imprímela para tenerla al lado.</li>
        <li>Permite la cámara y pon la mano frente a ella. Vas a ver los puntos de tu mano dibujados encima.</li>
        <li>Haz la forma de la letra que te pida y dale a Grabar. Son 3 segundos por grabación y 3 grabaciones por letra.</li>
      </ol>
      <p className="privado">
        <strong>No se guarda ninguna imagen ni video.</strong> Solo se guardan las posiciones de 21 puntos de la mano (números), sin tu nombre ni ningún dato tuyo.
      </p>
      <div className="acciones">
        <button className="boton" onClick={onEmpezar}>
          Empezar a grabar
        </button>
        <a className="boton boton--borde" href={LAMINA_OFICIAL} target="_blank" rel="noopener">
          Ver la lámina oficial
        </a>
      </div>
      <p className="fuente">
        La lámina es del Diccionario básico de la Lengua de Señas Colombiana, del Instituto Caro y Cuervo y el INSOR (alfabeto manual, página 573). Aquí solo van las 21 letras que se hacen con la mano
        quieta; G, H, J, Ñ, S y Z llevan movimiento y quedan para después.
      </p>
    </main>
  );
}

type Estado = { tipo: "cargando" } | { tipo: "error"; mensaje: string } | { tipo: "listo" } | { tipo: "cuenta"; n: number } | { tipo: "grabando" } | { tipo: "guardando" };

function Grabar() {
  const video = useRef<HTMLVideoElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const detector = useRef<HandLandmarker | null>(null);
  const ultimo = useRef<HandLandmarkerResult | null>(null);
  const grabando = useRef(false);
  const cuadros = useRef<Cuadro[]>([]);
  const mano = useRef<"Left" | "Right" | null>(null);

  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });
  const [hayMano, setHayMano] = useState(false);
  const [progreso, setProgreso] = useState<Progreso>(leerProgreso);
  const [letra, setLetra] = useState<Letra>(() => LETRAS.find((l) => (leerProgreso()[l] ?? 0) < META) ?? "A");
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  // Cámara y detector
  useEffect(() => {
    let vivo = true;
    let flujo: MediaStream | null = null;
    let cuadro = 0;
    let tiempoVideo = -1;
    let ultimaCaptura = 0;

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
        detector.current = await cargarDetector();
      } catch {
        if (vivo) setEstado({ tipo: "error", mensaje: "No se pudo cargar el modelo que detecta la mano. Revisa el internet y recarga la página." });
        return;
      }
      if (!vivo) return;
      setEstado({ tipo: "listo" });

      const ciclo = () => {
        if (!vivo) return;
        const d = detector.current;
        if (d && v.readyState >= 2 && v.currentTime !== tiempoVideo) {
          tiempoVideo = v.currentTime;
          const c = lienzo.current!;
          if (c.width !== v.videoWidth) {
            c.width = v.videoWidth;
            c.height = v.videoHeight;
          }
          const r = d.detectForVideo(v, performance.now());
          ultimo.current = r;
          const con = r.landmarks.length > 0;
          setHayMano(con);
          dibujarMano(c, r, grabando.current ? "#f6c453" : "#5ad1b4");
          const ahora = performance.now();
          if (grabando.current && con && ahora - ultimaCaptura >= 90) {
            ultimaCaptura = ahora;
            cuadros.current.push(cuadroDe(r));
            mano.current = (r.handedness[0]?.[0]?.categoryName as "Left" | "Right") ?? null;
          }
        }
        cuadro = requestAnimationFrame(ciclo);
      };
      cuadro = requestAnimationFrame(ciclo);
    })();

    return () => {
      vivo = false;
      cancelAnimationFrame(cuadro);
      flujo?.getTracks().forEach((t) => t.stop());
      detector.current?.close();
    };
  }, []);

  const grabar = useCallback(async () => {
    setAviso(null);
    for (const n of [3, 2, 1]) {
      setEstado({ tipo: "cuenta", n });
      await new Promise((r) => setTimeout(r, 800));
    }
    cuadros.current = [];
    mano.current = null;
    grabando.current = true;
    setEstado({ tipo: "grabando" });
    await new Promise((r) => setTimeout(r, 3000));
    grabando.current = false;

    if (cuadros.current.length < 12) {
      setEstado({ tipo: "listo" });
      setAviso({ tipo: "error", texto: "No se vio bien la mano. Ponla más cerca de la cámara, con buena luz, y vuelve a grabar." });
      return;
    }
    setEstado({ tipo: "guardando" });
    const error = await guardarMuestra(letra, mano.current, cuadros.current);
    setEstado({ tipo: "listo" });
    if (error) {
      setAviso({ tipo: "error", texto: error });
      return;
    }
    const nuevo = { ...progreso, [letra]: (progreso[letra] ?? 0) + 1 };
    setProgreso(nuevo);
    try {
      localStorage.setItem("lsc:progreso", JSON.stringify(nuevo));
    } catch {
      // modo privado: el progreso solo dura mientras la página esté abierta
    }
    const hechas = nuevo[letra] ?? 0;
    if (hechas >= META) {
      const siguiente = LETRAS.find((l) => (nuevo[l] ?? 0) < META);
      setAviso({ tipo: "ok", texto: siguiente ? `¡Listo la ${letra}! Sigue la ${siguiente}.` : "¡Terminaste las 21 letras! Muchas gracias." });
      if (siguiente) setLetra(siguiente);
    } else {
      setAviso({ tipo: "ok", texto: `Guardada (${hechas} de ${META}). Para la siguiente, mueve un poco la mano: más cerca, más lejos o un poco de lado.` });
    }
  }, [letra, progreso]);

  const total = LETRAS.reduce((s, l) => s + Math.min(progreso[l] ?? 0, META), 0);
  const ocupado = estado.tipo === "cuenta" || estado.tipo === "grabando" || estado.tipo === "guardando";

  return (
    <main className="grabar">
      <div className="camara" data-grabando={estado.tipo === "grabando" || undefined}>
        <video ref={video} playsInline muted />
        <canvas ref={lienzo} aria-hidden="true" />
        {estado.tipo === "cargando" && <p className="camara__estado">Preparando la cámara y el modelo…</p>}
        {estado.tipo === "error" && <p className="camara__estado camara__estado--error">{estado.mensaje}</p>}
        {estado.tipo === "cuenta" && <p className="camara__cuenta">{estado.n}</p>}
        {estado.tipo === "grabando" && <p className="camara__rec">Grabando…</p>}
        {estado.tipo === "listo" && !hayMano && <p className="camara__pista">Pon la mano frente a la cámara</p>}
      </div>

      <section className="panel" aria-live="polite">
        <div className="panel__letra">
          <span className="letra">{letra}</span>
          <div>
            <p className="panel__titulo">Haz la letra {letra}</p>
            <p className="panel__sub">
              {Math.min(progreso[letra] ?? 0, META)} de {META} grabaciones · {total} de {LETRAS.length * META} en total
            </p>
            <a href={LAMINA_OFICIAL} target="_blank" rel="noopener">
              Ver cómo se hace en la lámina oficial
            </a>
          </div>
        </div>

        <button className="boton boton--grande" onClick={grabar} disabled={estado.tipo !== "listo" || !hayMano}>
          {estado.tipo === "guardando" ? "Guardando…" : estado.tipo === "grabando" ? "Mantén la seña…" : estado.tipo === "cuenta" ? "Prepárate…" : "Grabar 3 segundos"}
        </button>
        {aviso && <p className={`aviso aviso--${aviso.tipo}`}>{aviso.texto}</p>}

        <div className="letras" role="group" aria-label="Elegir letra">
          {LETRAS.map((l) => {
            const n = Math.min(progreso[l] ?? 0, META);
            return (
              <button key={l} className="letras__una" aria-pressed={l === letra} data-lista={n >= META || undefined} onClick={() => setLetra(l)} disabled={ocupado}>
                {l}
                <span className="letras__n">{n >= META ? "✓" : `${n}/${META}`}</span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
