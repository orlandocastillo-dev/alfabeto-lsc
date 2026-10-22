"""Entrena el clasificador del alfabeto con los puntos de la mano.

Uso: python3 entrenar.py
Lee datos/muestras.json y guarda el modelo en ../public/modelo.json para usarlo en la página.
"""
import json
from collections import Counter, defaultdict

import numpy as np
from sklearn.metrics import confusion_matrix
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler

DEDOS = [4, 8, 12, 16, 20]


def rasgos(w, mano):
    """Los 21 puntos centrados en la muñeca y escalados por el tamaño de la mano."""
    p = np.array(w, dtype=float).reshape(21, 3)
    if mano == "Left":
        p[:, 0] *= -1  # las dos manos quedan iguales
    p = p - p[0]
    escala = np.linalg.norm(p[9]) or 1.0
    p = p / escala
    # Distancias entre las puntas de los dedos: ayudan a separar letras parecidas (M/N, R/T)
    puntas = [np.linalg.norm(p[a] - p[b]) for i, a in enumerate(DEDOS) for b in DEDOS[i + 1:]]
    return np.concatenate([p.ravel(), puntas])


def cargar():
    filas = json.load(open("datos/muestras.json"))
    X, y, grupo = [], [], []
    vistas = defaultdict(int)
    for f in filas:
        n = vistas[f["letra"]]
        vistas[f["letra"]] += 1
        for w in f["w"]:
            if len(w) != 63:
                continue
            X.append(rasgos(w, f["mano"]))
            y.append(f["letra"])
            grupo.append(n % 3)  # en qué tanda quedó la grabación
    return np.array(X), np.array(y), np.array(grupo), filas


def modelo():
    return MLPClassifier(hidden_layer_sizes=(64,), alpha=1e-3, max_iter=2000, random_state=7)


def main():
    X, y, grupo, filas = cargar()
    letras = sorted(set(y))
    print(f"{len(filas)} grabaciones, {len(X)} cuadros, {len(letras)} letras, {len({f['grabador'] for f in filas})} persona(s)")

    # Se entrena con dos grabaciones de cada letra y se prueba con la tercera, que el modelo nunca vio
    reales, predichas = [], []
    for k in range(3):
        tr, te = grupo != k, grupo == k
        esc = StandardScaler().fit(X[tr])
        m = modelo().fit(esc.transform(X[tr]), y[tr])
        reales += list(y[te])
        predichas += list(m.predict(esc.transform(X[te])))
    reales, predichas = np.array(reales), np.array(predichas)
    acierto = (reales == predichas).mean()
    print(f"\nAcierto en grabaciones que no vio: {acierto:.1%}")

    print("\nPor letra:")
    for l in letras:
        s = reales == l
        errores = Counter(predichas[s & (predichas != l)])
        extra = ", ".join(f"{k} ({v})" for k, v in errores.most_common(2))
        print(f"  {l}: {(predichas[s] == l).mean():5.0%}" + (f"   se confunde con {extra}" if extra else ""))

    cm = confusion_matrix(reales, predichas, labels=letras)
    json.dump({"letras": letras, "matriz": cm.tolist(), "acierto": acierto}, open("datos/evaluacion.json", "w"))

    # Modelo final con todos los datos, en un JSON que la página lee directo
    esc = StandardScaler().fit(X)
    m = modelo().fit(esc.transform(X), y)
    json.dump(
        {
            "letras": list(m.classes_),
            "media": esc.mean_.round(6).tolist(),
            "escala": esc.scale_.round(6).tolist(),
            "capas": [{"w": W.round(5).tolist(), "b": b.round(5).tolist()} for W, b in zip(m.coefs_, m.intercepts_)],
        },
        open("../public/modelo.json", "w"),
    )
    print("\nModelo guardado en public/modelo.json")


if __name__ == "__main__":
    main()
