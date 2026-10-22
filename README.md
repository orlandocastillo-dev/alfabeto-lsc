# Alfabeto LSC

Página para grabar ejemplos del alfabeto de la Lengua de Señas Colombiana y entrenar con ellos un modelo que reconozca las letras con la cámara.

Tiene dos partes:

- **Probar**: haces una letra frente a la cámara y el modelo dice cuál es. Si la sostienes un segundo, la escribe y así vas deletreando.
- **Grabar**: para recoger ejemplos. La cámara detecta los 21 puntos de la mano con MediaPipe y se guardan esas posiciones en Supabase. No se guarda ninguna imagen ni video.

## El modelo

`modelo/entrenar.py` toma los puntos de cada cuadro, los centra en la muñeca y los escala según el tamaño de la mano, les suma las distancias entre las puntas de los dedos y entrena una red neuronal pequeña con scikit-learn. El resultado se guarda en `public/modelo.json` y la página hace la misma cuenta en el navegador (`src/modelo.ts`); hay una prueba que revisa que las dos den lo mismo.

Para medirlo, el modelo aprende con dos grabaciones de cada letra y se prueba con la tercera, que nunca vio. En la primera versión, con una sola persona, acertó el 94 %. Con más personas grabando debería mejorar, y también va a medir mejor qué tan bien funciona con alguien que el modelo no conoce.

Las grabaciones no están en el repositorio: se descargan de Supabase a `modelo/datos/` para entrenar.

Por ahora son las 21 letras que se hacen con la mano quieta. G, H, J, Ñ, S y Z llevan movimiento y van después. Las señas se copian del alfabeto manual del *Diccionario básico de la Lengua de Señas Colombiana* (Instituto Caro y Cuervo e INSOR, página 573).

## Correrla

```bash
npm install
npm run dev
```

Copia `.env.example` como `.env.local` con la URL y la llave anon de Supabase. La tabla está en `supabase/senas_muestras.sql`: cualquiera puede agregar grabaciones, pero nadie las puede leer desde el navegador.

Hecha con React, TypeScript, Vite y MediaPipe.
