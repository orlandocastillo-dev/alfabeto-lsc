import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { predecir, rasgos, type Modelo } from "../src/modelo";
import casos from "./casos-prueba.json";

const m: Modelo = JSON.parse(readFileSync(new URL("../public/modelo.json", import.meta.url), "utf8"));

describe("modelo en el navegador", () => {
  it("da las mismas probabilidades que Python", () => {
    for (const c of casos) {
      const p = predecir(m, rasgos(c.w, c.mano));
      p.forEach((v, i) => expect(v).toBeCloseTo(c.prob[i], 4));
    }
  });
});
