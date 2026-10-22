import { createClient } from "@supabase/supabase-js";
import type { Letra } from "./letras";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const llave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const db = url && llave ? createClient(url, llave, { auth: { persistSession: false } }) : null;

export type Cuadro = { p: number[]; w: number[] };

// Un id al azar por dispositivo, para saber cuántas personas distintas grabaron (no guarda nada personal)
export function idGrabador(): string {
  try {
    let id = localStorage.getItem("lsc:grabador");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("lsc:grabador", id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export async function guardarMuestra(letra: Letra, mano: "Left" | "Right" | null, cuadros: Cuadro[]): Promise<string | null> {
  if (!db) return "La página no está conectada a la base de datos.";
  const { error } = await db.from("senas_muestras").insert({ letra, mano, grabador: idGrabador(), cuadros });
  if (!error) return null;
  return /fetch|network/i.test(error.message) ? "No hay internet. Revisa la conexión e inténtalo otra vez." : "No se pudo guardar. Inténtalo otra vez.";
}
