# Extracción Nocturna

Videojuego FPS 3D desarrollado con **Three.js** para el curso *Computación Gráfica y Visual* (Universidad Privada del Norte – T3).

**Sinopsis:** La ciudad ha caído bajo una infección. Debes cruzar una calle oscura y infestada, administrar cada bala y alcanzar la zona de extracción antes de ser atrapado.

---

## Cómo ejecutarlo

Necesitas un servidor local (no funciona abriendo el HTML directamente).

```bash
# Desde la carpeta del proyecto
python -m http.server 5500
```

Luego abre: **http://localhost:5500**

También puedes usar la extensión **Live Server** de VS Code.

---

## Controles

| Entrada            | Acción                     |
|--------------------|----------------------------|
| W A S D            | Desplazamiento             |
| Mouse              | Orientar la cámara         |
| Clic izquierdo     | Un disparo (sin automático)|
| 1                  | Seleccionar Revólver       |
| 2                  | Seleccionar Escopeta       |
| Esc                | Pausar                     |

---

## Requisitos funcionales cubiertos

| RF   | Descripción                                      | Implementación |
|------|--------------------------------------------------|----------------|
| RF01 | Dos armas GLB, cambio con 1/2, un disparo por clic | Sí |
| RF02 | Munición independiente por arma, solo se recupera con objetos | Sí |
| RF03 | Mundo 3D con inicio, recorrido y zona final      | Sí |
| RF04 | Enemigos con modelos GLB                         | Sí |
| RF05 | Detección por rango + persecución                | Sí |
| RF06 | Cámara FPS + movimiento WASD + arma en primera persona | Sí |
| RF07 | Raycasting, 2 impactos exactos, desactivación al morir | Sí |
| RF08 | Progresión clara + mensaje de victoria           | Sí |
| RF09 | Game Over al contacto                            | Sí |
| RF10 | Objetos coleccionables (munición + velocidad)    | Sí |
| RF11 | Dificultad (munición limitada, enemigos rápidos, barreras) | Sí |
| RF12 | Repositorio + README + video                     | Pendiente de subir |

---

## Modelos GLB

Coloca los archivos en `models/`:

```
models/
├── revolver.glb   → arma 1 (Revólver)
├── escopeta.glb   → arma 2 (ya incluida)
└── zombie.glb     → enemigo
```

Si faltan los archivos, el juego usa modelos de respaldo generados por código y sigue funcionando. Para la entrega se recomienda incluir los tres GLB.

Fuentes libres sugeridas:
- Zombis: Quaternius (CC0)
- Armas low-poly: Sketchfab / itch.io

---

## Estructura

```
extraccion-nocturna/
├── index.html
├── juego.js
├── README.md
└── models/
    ├── revolver.glb
    ├── escopeta.glb
    └── zombie.glb
```

---

## Ubicación de los requisitos en el código (`juego.js`)

- Cámara y movimiento → `moverJugador`, `PointerLockControls`
- Armas y cambio → `montarArmas`, `cambiarArma`
- Disparo único → evento `mousedown` + `disparar`
- Munición → objeto `municion` + `actualizarPickups`
- Escenario → `construirEscenario`, objeto `MAPA`
- Enemigos GLB → `crearEnemigo`
- Detección y persecución → `actualizarEnemigos`
- Impactos y 2 vidas → `disparar` (raycasting) + `herirEnemigo`
- Victoria / Game Over → `victoria`, `finPartida`
- Coleccionables → `crearPickup`, `actualizarPickups`

---

## Recursos externos

- Three.js (MIT) – https://threejs.org/
- Modelos 3D: ver sección de modelos GLB
- Texturas de fachadas y calle, y sonidos: generados por código (Canvas + Web Audio)

---

**Curso:** Computación Gráfica y Visual – UPN  
**Evaluación:** T3
