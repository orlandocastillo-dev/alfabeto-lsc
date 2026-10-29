import { useEffect, useRef, useState } from "react";

// Los 21 puntos de la mano como los entrega MediaPipe, dibujados a mano para tres letras (en una caja de 100×100).
type Pose = [number, number][];
const B: Pose = [
  [50, 92], [40, 84], [34, 74], [37, 65], [45, 60],
  [41, 55], [40, 40], [39, 30], [38, 20],
  [50, 53], [50, 37], [50, 26], [50, 15],
  [58, 55], [59, 40], [60, 30], [60, 21],
  [65, 59], [68, 47], [70, 39], [71, 31],
];
const L: Pose = [
  [50, 92], [40, 84], [30, 78], [21, 72], [12, 67],
  [42, 56], [41, 40], [40, 29], [39, 18],
  [50, 56], [53, 46], [52, 56], [49, 60],
  [58, 58], [61, 50], [59, 59], [56, 62],
  [65, 62], [68, 55], [66, 62], [63, 65],
];
const A: Pose = [
  [50, 92], [40, 84], [35, 74], [35, 64], [36, 54],
  [42, 56], [43, 46], [44, 54], [43, 60],
  [50, 55], [51, 45], [51, 53], [50, 59],
  [58, 57], [59, 48], [58, 56], [57, 61],
  [65, 60], [66, 52], [65, 59], [63, 63],
];
const HUESOS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];
const SECUENCIA = [
  { letra: "B", pose: B, p: 0.94, otras: [["P", 0.03], ["U", 0.02]] },
  { letra: "L", pose: L, p: 0.97, otras: [["C", 0.02], ["D", 0.01]] },
  { letra: "A", pose: A, p: 0.91, otras: [["E", 0.05], ["T", 0.02]] },
] as const;

const mezclar = (a: Pose, b: Pose, t: number): Pose => a.map(([x, y], i) => [x + (b[i][0] - x) * t, y + (b[i][1] - y) * t]);
const suave = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** El visor de la portada: una mano que pasa por B, L y A, y lo que el modelo diría de cada una. */
export function ManoAnimada() {
  const [i, setI] = useState(0);
  const [pose, setPose] = useState<Pose>(B);
  const desde = useRef<Pose>(B);

  useEffect(() => {
    const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = setInterval(() => setI((n) => (n + 1) % SECUENCIA.length), 2600);
    if (quieto) clearInterval(id);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const meta = SECUENCIA[i].pose;
    const inicio = performance.now();
    const origen = desde.current;
    let raf = 0;
    const paso = (t: number) => {
      const k = Math.min(1, (t - inicio) / 700);
      const p = mezclar(origen, meta, suave(k));
      desde.current = p;
      setPose(p);
      if (k < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [i]);

  const actual = SECUENCIA[i];
  return (
    <figure className="visor" aria-label="Ejemplo: el modelo reconoce las letras B, L y A">
      <div className="visor__marco">
        <span className="visor__esquina visor__esquina--1" />
        <span className="visor__esquina visor__esquina--2" />
        <span className="visor__esquina visor__esquina--3" />
        <span className="visor__esquina visor__esquina--4" />
        <p className="visor__vivo">
          <i /> En vivo
        </p>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          {HUESOS.map(([a, b]) => (
            <line key={`${a}-${b}`} x1={pose[a][0]} y1={pose[a][1]} x2={pose[b][0]} y2={pose[b][1]} className="visor__hueso" />
          ))}
          {pose.map(([x, y], n) => (
            <circle key={n} cx={x} cy={y} r={n === 0 ? 2.4 : [4, 8, 12, 16, 20].includes(n) ? 2.2 : 1.6} className="visor__punto" />
          ))}
        </svg>
      </div>
      <figcaption className="visor__lectura" aria-live="polite">
        <span className="visor__letra">{actual.letra}</span>
        <span className="visor__datos">
          <span className="visor__fila">
            <b>{actual.letra}</b>
            <span className="visor__barra">
              <i style={{ width: `${actual.p * 100}%` }} />
            </span>
            {Math.round(actual.p * 100)} %
          </span>
          {actual.otras.map(([l, p]) => (
            <span key={l} className="visor__fila visor__fila--tenue">
              <b>{l}</b>
              <span className="visor__barra">
                <i style={{ width: `${p * 100}%` }} />
              </span>
              {Math.round(p * 100)} %
            </span>
          ))}
        </span>
      </figcaption>
    </figure>
  );
}
