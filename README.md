# Alfabeto LSC

Página para grabar ejemplos del alfabeto de la Lengua de Señas Colombiana y entrenar con ellos un modelo que reconozca las letras con la cámara.

Esta es la primera parte del proyecto: recoger los datos. La cámara detecta los 21 puntos de la mano con MediaPipe y se guardan esas posiciones en Supabase. No se guarda ninguna imagen ni video.

Por ahora son las 21 letras que se hacen con la mano quieta. G, H, J, Ñ, S y Z llevan movimiento y van después. Las señas se copian del alfabeto manual del *Diccionario básico de la Lengua de Señas Colombiana* (Instituto Caro y Cuervo e INSOR, página 573).

## Correrla

```bash
npm install
npm run dev
```

Copia `.env.example` como `.env.local` con la URL y la llave anon de Supabase. La tabla está en `supabase/senas_muestras.sql`: cualquiera puede agregar grabaciones, pero nadie las puede leer desde el navegador.

Hecha con React, TypeScript, Vite y MediaPipe.
