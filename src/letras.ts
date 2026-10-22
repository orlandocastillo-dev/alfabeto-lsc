// Las 21 letras del alfabeto manual que se hacen con la mano quieta.
// G, H, J, Ñ, S y Z llevan movimiento y quedan para después.
export const LETRAS = ["A", "B", "C", "D", "E", "F", "I", "K", "L", "M", "N", "O", "P", "Q", "R", "T", "U", "V", "W", "X", "Y"] as const;
export type Letra = (typeof LETRAS)[number];

// Grabaciones que pedimos por letra y persona
export const META = 3;

// Diccionario básico de la Lengua de Señas Colombiana (Instituto Caro y Cuervo e INSOR), alfabeto manual en la página 573
export const LAMINA_OFICIAL = "https://www.colombiaaprende.edu.co/sites/default/files/files_public/2022-04/Diccionario-lengua-de-senas.pdf#page=625";
