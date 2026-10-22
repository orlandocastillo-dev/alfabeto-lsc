import { useCallback, useEffect, useRef, useState } from "react";
import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { useCamaraMano, type EstadoCamara } from "./camara";
import { LAMINA_OFICIAL, LETRAS, META, type Letra } from "./letras";
import { cuadroDe } from "./mano";
import { predecir, rasgos, type Modelo } from "./modelo";
import { guardarMuestra, type Cuadro } from "./nube";

type Pantalla = "inicio" | "probar" | "grabar";
const desdeHash = (): Pantalla => (location.hash === "#/grabar" ? "grabar" : location.hash === "#/probar" ? "probar" : "inicio");

export function App() {
  const [pantalla, setPantalla] = useState<Pantalla>(desdeHash);
  useEffect(() => {
    const cambio = () => setPantalla(desdeHash());
    addEventListener("hashchange", cambio);
    return () => removeEventListener("hashchange", cambio);
  }, []);
  if (pantalla === "grabar") return <Grabar />;
  if (pantalla === "probar") return <Probar />;
  return <Inicio />;
}

function Barra({ titulo }: { titulo: string }) {
  return (
    <header className="barra">
      <a href="#/" className="barra__volver">
        ← Alfabeto LSC
      </a>
      <span>{titulo}</span>
    </header>
  );
}

const ABECEDARIO = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");
const RECONOCE = new Set<string>(LETRAS);

function Inicio() {
  return (
    <main className="inicio">
      <header className="cabeza">
        <span>Alfabeto LSC</span>
        <span>Lengua de Señas Colombiana</span>
      </header>

      <div className="portada">
        <div className="portada__texto">
          <h1>Deletrea con la mano. La cámara lee.</h1>
          <p>
            Haz una letra del alfabeto manual frente a la cámara y el modelo te dice cuál es. Va armando la palabra a medida que deletreas. Todo pasa en tu celular o computador: la imagen de la cámara no
            sale de tu equipo.
          </p>
          <div className="acciones">
            <a className="boton" href="#/probar">
              Probar el reconocedor
            </a>
            <a className="enlace" href={LAMINA_OFICIAL} target="_blank" rel="noopener">
              Ver el alfabeto oficial ↗
            </a>
          </div>
        </div>

        <figure className="lamina">
          <ol aria-label="Alfabeto manual">
            {ABECEDARIO.map((l) => (
              <li key={l} data-pronto={!RECONOCE.has(l) || undefined}>
                {l}
                {!RECONOCE.has(l) && <small>pronto</small>}
              </li>
            ))}
          </ol>
          <figcaption>
            Reconoce las {LETRAS.length} letras que se hacen con la mano quieta. Las rayadas llevan movimiento y quedan para después.
          </figcaption>
        </figure>
      </div>

      <section className="ayuda">
        <p className="ayuda__marca">Se buscan manos</p>
        <div>
          <h2>Ayúdame a mejorarlo</h2>
          <p>
            El modelo aprende de ejemplos, y entre más manos distintas vea, mejor funciona con cualquier persona. No necesitas saber lengua de señas, solo copiar cada letra de la lámina: son 3
            grabaciones de 3 segundos por letra.
          </p>
          <p>
            <strong>No se guarda ninguna imagen ni video.</strong> Solo las posiciones de 21 puntos de la mano (números), sin tu nombre ni ningún dato tuyo.
          </p>
          <a className="boton boton--claro" href="#/grabar">
            Grabar ejemplos
          </a>
        </div>
      </section>

      <p className="fuente">
        Señas tomadas del alfabeto manual del Diccionario básico de la Lengua de Señas Colombiana (Instituto Caro y Cuervo e INSOR, página 573).
      </p>
    </main>
  );
}

function VistaCamara({ video, lienzo, estado, hayMano, encima, borde }: { video: React.RefObject<HTMLVideoElement | null>; lienzo: React.RefObject<HTMLCanvasElement | null>; estado: EstadoCamara; hayMano: boolean; encima?: React.ReactNode; borde?: boolean }) {
  return (
    <div className="camara" data-grabando={borde || undefined}>
      <video ref={video} playsInline muted />
      <canvas ref={lienzo} aria-hidden="true" />
      {estado.tipo === "cargando" && <p className="camara__estado">Preparando la cámara y el modelo…</p>}
      {estado.tipo === "error" && <p className="camara__estado camara__estado--error">{estado.mensaje}</p>}
      {estado.tipo === "listo" && !hayMano && <p className="camara__pista">Pon la mano frente a la cámara</p>}
      {encima}
    </div>
  );
}

// ---------- Probar ----------

const VENTANA = 8; // cuadros que se promedian para que la letra no salte
const SOSTENER = 22; // cuadros seguidos con la misma letra para escribirla (~0,8 s)

function Probar() {
  const [modelo, setModelo] = useState<Modelo | null>(null);
  const [top, setTop] = useState<{ letra: string; p: number }[]>([]);
  const [texto, setTexto] = useState("");
  const [carga, setCarga] = useState(0);
  const historia = useRef<number[][]>([]);
  const racha = useRef({ letra: "", n: 0, escrita: false });

  useEffect(() => {
    fetch("/modelo.json")
      .then((r) => r.json())
      .then(setModelo)
      .catch(() => undefined);
  }, []);

  const alResultado = useCallback(
    (r: HandLandmarkerResult) => {
      if (!modelo) return;
      if (!r.landmarks.length) {
        historia.current = [];
        racha.current = { letra: "", n: 0, escrita: false };
        setTop([]);
        setCarga(0);
        return;
      }
      const w = r.worldLandmarks[0].flatMap((q) => [q.x, q.y, q.z]);
      const mano = r.handedness[0]?.[0]?.categoryName ?? null;
      historia.current.push(predecir(modelo, rasgos(w, mano)));
      if (historia.current.length > VENTANA) historia.current.shift();
      const prom = modelo.letras.map((_, i) => historia.current.reduce((s, p) => s + p[i], 0) / historia.current.length);
      const orden = prom.map((p, i) => ({ letra: modelo.letras[i], p })).sort((a, b) => b.p - a.p);
      setTop(orden.slice(0, 3));

      const mejor = orden[0];
      const ra = racha.current;
      if (mejor.p < 0.6) {
        racha.current = { letra: "", n: 0, escrita: false };
        setCarga(0);
        return;
      }
      if (mejor.letra === ra.letra) ra.n++;
      else racha.current = { letra: mejor.letra, n: 1, escrita: false };
      setCarga(Math.min(1, racha.current.n / SOSTENER));
      if (!racha.current.escrita && racha.current.n >= SOSTENER) {
        racha.current.escrita = true;
        setTexto((t) => (t + mejor.letra).slice(-40));
      }
    },
    [modelo],
  );

  const cam = useCamaraMano(alResultado, () => "#e5097f");
  const actual = top[0];

  return (
    <>
      <Barra titulo="Probar" />
      <main className="pantalla">
        <VistaCamara {...cam} />
        <section className="ficha" data-activa={(actual && actual.p >= 0.6) || undefined} aria-live="polite">
          <p className="ficha__rotulo">{modelo ? (actual ? "Estás haciendo la" : "Esperando una mano") : "Cargando el modelo"}</p>
          <p className="ficha__letra">{actual && actual.p >= 0.6 ? actual.letra : "?"}</p>
          <div className="ficha__carga" aria-hidden="true">
            <i style={{ width: `${carga * 100}%` }} />
          </div>
          <table className="top">
            <caption>Lo que ve el modelo</caption>
            <tbody>
              {(top.length ? top : [null, null, null]).map((t, i) => (
                <tr key={t?.letra ?? i}>
                  <th>{t?.letra ?? "·"}</th>
                  <td>
                    <span className="top__barra">
                      <i style={{ width: `${t ? Math.round(t.p * 100) : 0}%` }} />
                    </span>
                  </td>
                  <td>{t ? `${Math.round(t.p * 100)} %` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="cinta">
          <p className="cinta__rotulo">Lo que llevas deletreado</p>
          <p className="cinta__texto" aria-label="Texto">
            {texto ? texto.split("").map((c, i) => <span key={i}>{c === " " ? "\u00a0" : c}</span>) : <em>Sostén una letra un segundo para escribirla</em>}
            <b className="cinta__cursor" />
          </p>
          <div className="botones">
            <button className="boton boton--borde" onClick={() => setTexto((t) => t + " ")}>
              Espacio
            </button>
            <button className="boton boton--borde" onClick={() => setTexto((t) => t.slice(0, -1))}>
              Borrar
            </button>
            <button className="boton boton--borde" onClick={() => setTexto("")}>
              Limpiar
            </button>
          </div>
        </section>
        <p className="fuente pantalla__nota">
          Primera versión, entrenada con una sola persona.{" "}
          <a href={LAMINA_OFICIAL} target="_blank" rel="noopener">
            Ver el alfabeto oficial
          </a>
        </p>
      </main>
    </>
  );
}

// ---------- Grabar ----------

type Progreso = Partial<Record<Letra, number>>;
const leerProgreso = (): Progreso => {
  try {
    return JSON.parse(localStorage.getItem("lsc:progreso") ?? "{}");
  } catch {
    return {};
  }
};

type Fase = { tipo: "quieto" } | { tipo: "cuenta"; n: number } | { tipo: "grabando" } | { tipo: "guardando" };

function Grabar() {
  const grabando = useRef(false);
  const cuadros = useRef<Cuadro[]>([]);
  const mano = useRef<"Left" | "Right" | null>(null);
  const ultimaCaptura = useRef(0);

  const [fase, setFase] = useState<Fase>({ tipo: "quieto" });
  const [progreso, setProgreso] = useState<Progreso>(leerProgreso);
  const [letra, setLetra] = useState<Letra>(() => LETRAS.find((l) => (leerProgreso()[l] ?? 0) < META) ?? "A");
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const cam = useCamaraMano(
    (r) => {
      const ahora = performance.now();
      if (grabando.current && r.landmarks.length && ahora - ultimaCaptura.current >= 90) {
        ultimaCaptura.current = ahora;
        cuadros.current.push(cuadroDe(r));
        mano.current = (r.handedness[0]?.[0]?.categoryName as "Left" | "Right") ?? null;
      }
    },
    () => (grabando.current ? "#ffffff" : "#e5097f"),
  );

  const grabar = useCallback(async () => {
    setAviso(null);
    for (const n of [3, 2, 1]) {
      setFase({ tipo: "cuenta", n });
      await new Promise((r) => setTimeout(r, 800));
    }
    cuadros.current = [];
    mano.current = null;
    grabando.current = true;
    setFase({ tipo: "grabando" });
    await new Promise((r) => setTimeout(r, 3000));
    grabando.current = false;

    if (cuadros.current.length < 12) {
      setFase({ tipo: "quieto" });
      setAviso({ tipo: "error", texto: "No se vio bien la mano. Ponla más cerca de la cámara, con buena luz, y vuelve a grabar." });
      return;
    }
    setFase({ tipo: "guardando" });
    const error = await guardarMuestra(letra, mano.current, cuadros.current);
    setFase({ tipo: "quieto" });
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
  const ocupado = fase.tipo !== "quieto";
  const listo = cam.estado.tipo === "listo";

  return (
    <>
      <Barra titulo="Grabar ejemplos" />
      <main className="pantalla">
        <VistaCamara
          {...cam}
          borde={fase.tipo === "grabando"}
          encima={
            <>
              {fase.tipo === "cuenta" && <p className="camara__cuenta">{fase.n}</p>}
              {fase.tipo === "grabando" && <p className="camara__rec">Grabando…</p>}
            </>
          }
        />
        <section className="ficha ficha--grabar" aria-live="polite">
          <div className="ficha__fila">
            <p className="ficha__letra">{letra}</p>
            <div>
              <p className="ficha__titulo">Haz la letra {letra}</p>
              <p className="ficha__sub">
                {Math.min(progreso[letra] ?? 0, META)} de {META} grabaciones · {total} de {LETRAS.length * META} en total
              </p>
              <a href={LAMINA_OFICIAL} target="_blank" rel="noopener">
                Ver cómo se hace en la lámina oficial
              </a>
            </div>
          </div>

          <button className="boton boton--grande" onClick={grabar} disabled={!listo || ocupado || !cam.hayMano}>
            {fase.tipo === "guardando" ? "Guardando…" : fase.tipo === "grabando" ? "Mantén la seña…" : fase.tipo === "cuenta" ? "Prepárate…" : "Grabar 3 segundos"}
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
    </>
  );
}
