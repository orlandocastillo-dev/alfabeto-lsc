// El mismo clasificador que entrena modelo/entrenar.py, corriendo en el navegador
export type Modelo = {
  letras: string[];
  media: number[];
  escala: number[];
  capas: { w: number[][]; b: number[] }[];
};

const DEDOS = [4, 8, 12, 16, 20];

// Igual que rasgos() en entrenar.py: puntos centrados en la muñeca y escalados, más distancias entre puntas
export function rasgos(w: number[], mano: string | null): number[] {
  const p: number[][] = [];
  for (let i = 0; i < 21; i++) p.push([w[i * 3] * (mano === "Left" ? -1 : 1), w[i * 3 + 1], w[i * 3 + 2]]);
  const [x0, y0, z0] = p[0];
  for (const q of p) {
    q[0] -= x0;
    q[1] -= y0;
    q[2] -= z0;
  }
  const escala = Math.hypot(p[9][0], p[9][1], p[9][2]) || 1;
  const plano = p.flatMap((q) => q.map((v) => v / escala));
  const puntas: number[] = [];
  for (let i = 0; i < DEDOS.length; i++)
    for (let j = i + 1; j < DEDOS.length; j++) {
      const a = DEDOS[i] * 3, b = DEDOS[j] * 3;
      puntas.push(Math.hypot(plano[a] - plano[b], plano[a + 1] - plano[b + 1], plano[a + 2] - plano[b + 2]));
    }
  return [...plano, ...puntas];
}

// Probabilidad de cada letra
export function predecir(m: Modelo, x: number[]): number[] {
  let a = x.map((v, i) => (v - m.media[i]) / m.escala[i]);
  m.capas.forEach((capa, k) => {
    const salida = capa.b.slice();
    for (let i = 0; i < a.length; i++) {
      const fila = capa.w[i];
      for (let j = 0; j < salida.length; j++) salida[j] += a[i] * fila[j];
    }
    a = k < m.capas.length - 1 ? salida.map((v) => Math.max(0, v)) : salida;
  });
  const max = Math.max(...a);
  const e = a.map((v) => Math.exp(v - max));
  const s = e.reduce((t, v) => t + v, 0);
  return e.map((v) => v / s);
}
