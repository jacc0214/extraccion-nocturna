import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

// --- Configuración ---
const AJUSTES = {
  jugador: { velocidad: 4.8, velocidadBoost: 7.6, duracionBoost: 5.5, radio: 0.38, alturaOjos: 1.65 },
  contactoLetal: 0.95,
  enemigo: {
    archivo: './models/zombie.glb', altura: 1.75, rangoDeteccion: 14.5,
    velocidadBase: 1.85, velocidadRapida: 3.6, vida: 2, correccionYaw: 0
  },
  armas: {
    1: { nombre: 'Revólver', archivo: './models/revolver.glb', balas: 10, recargaCaja: 5,
         enfriamiento: 0.38, alcance: 70, escala: 0.42, offset: [0.26, -0.22, -0.48], rotY: -Math.PI / 20 },
    2: { nombre: 'Escopeta', archivo: './models/escopeta.glb', balas: 5, recargaCaja: 2,
         enfriamiento: 0.95, alcance: 32, escala: 0.88, offset: [0.27, -0.26, -0.70], rotY: Math.PI / 2 }
  }
};

const MAPA = {
  inicioZ: 6,
  extraccion: [-192, -180],
  mitadCalle: 7.5,
  barreras: [[-25, 3.5], [-52, -3.2], [-78, 1.5], [-105, 4.0], [-132, -4.5], [-158, 0], [-175, 2.5]],
  cajas: [[-4, -15], [5, -28], [-5, -48], [4, -68], [-3, -95], [5, -118], [-4, -145], [3, -170]],
  enemigos: [
    [-3.5, -20], [4.2, -32], [0, -45], [-4, -58], [3.8, -70], [4.5, -88], [-3.2, -100],
    [0.5, -115], [-4.5, -128], [3.5, -140], [-2, -152], [0, -165], [5, -172], [-5, -182]
  ],
  cajasMunicion: [[-5, -38], [4.5, -72], [-4.5, -108], [4, -138], [-3.5, -160]],
  potenciadores: [[0, -85], [0, -150]]
};

// --- Escena, cámara, luces ---
const escena = new THREE.Scene();
escena.background = new THREE.Color(0x070b12);
escena.fog = new THREE.Fog(0x070b12, 5, 48);

const camara = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.06, 350);
camara.position.set(0, AJUSTES.jugador.alturaOjos, MAPA.inicioZ);
escena.add(camara);

const render = new THREE.WebGLRenderer({ antialias: true });
render.setSize(innerWidth, innerHeight);
render.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(render.domElement);

escena.add(new THREE.HemisphereLight(0x5a6e9a, 0x1a1a22, 0.95));
const luna = new THREE.DirectionalLight(0x9aafd4, 0.65);
luna.position.set(-12, 28, 8);
escena.add(luna);

const linterna = new THREE.SpotLight(0xfff0d0, 110, 42, 0.48, 0.55, 1.4);
linterna.position.set(0.08, -0.08, 0);
linterna.target.position.set(0, 0, -8);
camara.add(linterna, linterna.target);

addEventListener('resize', () => {
  camara.aspect = innerWidth / innerHeight;
  camara.updateProjectionMatrix();
  render.setSize(innerWidth, innerHeight);
});

// --- Mundo ---
const obstaculos = [];
const superficiesSolidas = [];

function crearBloque(cx, cz, ancho, fondo, alto, material) {
  const malla = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, fondo), material);
  malla.position.set(cx, alto / 2, cz);
  escena.add(malla);
  superficiesSolidas.push(malla);
  obstaculos.push({
    minX: cx - ancho / 2, maxX: cx + ancho / 2,
    minZ: cz - fondo / 2, maxZ: cz + fondo / 2
  });
  return malla;
}

function texturaFachada() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#252830';
  ctx.fillRect(0, 0, 128, 128);
  for (let y = 10; y < 128; y += 30)
    for (let x = 10; x < 128; x += 28) {
      ctx.fillStyle = Math.random() < 0.15 ? '#b8953a' : '#0e1118';
      ctx.fillRect(x, y, 14, 18);
    }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function texturaCalle() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#222428';
  ctx.fillRect(0, 0, 64, 128);
  for (let i = 0; i < 280; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
    ctx.fillRect(Math.random() * 64, Math.random() * 128, 2, 2);
  }
  ctx.fillStyle = '#c9a54a';
  ctx.fillRect(29, 0, 5, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 14);
  return tex;
}

function construirEscenario() {
  const mitad = MAPA.mitadCalle;

  const suelo = new THREE.Mesh(
    new THREE.PlaneGeometry(mitad * 2, 220),
    new THREE.MeshStandardMaterial({ map: texturaCalle(), roughness: 0.92 })
  );
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.set(0, 0, -95);
  escena.add(suelo);

  const fachadaBase = texturaFachada();
  for (let z = 14; z > -205; z -= 11) {
    for (const lado of [-1, 1]) {
      const h = 7 + Math.random() * 11;
      const tex = fachadaBase.clone();
      tex.needsUpdate = true;
      tex.repeat.set(2.8, Math.round(h / 3.5));
      crearBloque(lado * (mitad + 6.5), z, 13, 11, h,
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.88 }));
    }
  }

  const muro = new THREE.MeshStandardMaterial({ color: 0x2c3038 });
  crearBloque(0, 18, 40, 3.5, 9, muro);
  crearBloque(0, -200, 40, 3.5, 9, muro);

  const oxido = new THREE.MeshStandardMaterial({ color: 0x6e3a22, roughness: 0.75 });
  const hueco = 4.2;
  for (const [z, gx] of MAPA.barreras) {
    const izq = (gx - hueco / 2) - (-mitad);
    const der = mitad - (gx + hueco / 2);
    if (izq > 0.15) crearBloque(-mitad + izq / 2, z, izq, 1.3, 2.2, oxido);
    if (der > 0.15) crearBloque(mitad - der / 2, z, der, 1.3, 2.2, oxido);
  }

  const madera = new THREE.MeshStandardMaterial({ color: 0x7a5c32, roughness: 0.85 });
  for (const [x, z] of MAPA.cajas) crearBloque(x, z, 1.4, 1.4, 1.4, madera);

  // Inicio
  const anillo = new THREE.Mesh(
    new THREE.RingGeometry(2.0, 2.8, 28),
    new THREE.MeshBasicMaterial({ color: 0x3b82f6, side: THREE.DoubleSide })
  );
  anillo.rotation.x = -Math.PI / 2;
  anillo.position.set(0, 0.04, MAPA.inicioZ);
  escena.add(anillo);

  // Extracción
  const [za, zb] = MAPA.extraccion;
  const centro = (za + zb) / 2;
  const plataforma = new THREE.Mesh(
    new THREE.PlaneGeometry(mitad * 2 - 1.5, Math.abs(za - zb)),
    new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.32 })
  );
  plataforma.rotation.x = -Math.PI / 2;
  plataforma.position.set(0, 0.05, centro);
  escena.add(plataforma);

  const haz = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 2.8, 70, 20, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x10b981, transparent: true, opacity: 0.22,
      side: THREE.DoubleSide, fog: false
    })
  );
  haz.position.set(0, 35, centro);
  escena.add(haz);

  const luzExtraccion = new THREE.PointLight(0x10b981, 180, 38, 2);
  luzExtraccion.position.set(0, 3.5, centro);
  escena.add(luzExtraccion);
}

// --- Carga de modelos ---
const cargador = new GLTFLoader();
const modelos = { arma1: null, arma2: null, zombie: null };

async function intentarCargar(ruta) {
  try { return await cargador.loadAsync(ruta); }
  catch { console.warn('No se encontró ' + ruta); return null; }
}

function normalizar(objeto, tamañoObjetivo, usarAltura, sobreSuelo) {
  const caja = new THREE.Box3().setFromObject(objeto);
  const dim = caja.getSize(new THREE.Vector3());
  const centro = caja.getCenter(new THREE.Vector3());
  const ref = usarAltura ? dim.y : Math.max(dim.x, dim.y, dim.z);
  const factor = tamañoObjetivo / (ref || 1);
  const grupo = new THREE.Group();
  objeto.scale.multiplyScalar(factor);
  objeto.position.set(
    -centro.x * factor,
    sobreSuelo ? -caja.min.y * factor : -centro.y * factor,
    -centro.z * factor
  );
  grupo.add(objeto);
  return grupo;
}

function armaRespaldo(id) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.55, roughness: 0.35 });
  const madera = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.8 });
  if (id === 1) {
    const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.085, 0.26), metal);
    const mango = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.13, 0.055), metal);
    mango.position.set(0, -0.09, 0.09);
    mango.rotation.x = 0.18;
    g.add(cuerpo, mango);
  } else {
    const cañon = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.048, 0.65), metal);
    const culata = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.09, 0.28), madera);
    culata.position.set(0, -0.025, 0.38);
    const corredera = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.055, 0.16), madera);
    corredera.position.set(0, -0.04, -0.08);
    g.add(cañon, culata, corredera);
  }
  return g;
}

function zombieRespaldo() {
  const g = new THREE.Group();
  const piel = new THREE.MeshStandardMaterial({ color: 0x6a8a58, roughness: 0.9 });
  const ropa = new THREE.MeshStandardMaterial({ color: 0x3d3228, roughness: 0.9 });
  const pieza = (w, h, d, mat, x, y, z) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    p.position.set(x, y, z);
    g.add(p);
  };
  pieza(0.48, 0.68, 0.28, ropa, 0, 1.05, 0);
  pieza(0.30, 0.30, 0.30, piel, 0, 1.58, 0);
  pieza(0.16, 0.75, 0.16, ropa, -0.16, 0.38, 0);
  pieza(0.16, 0.75, 0.16, ropa, 0.16, 0.38, 0);
  pieza(0.13, 0.13, 0.65, piel, -0.32, 1.25, 0.32);
  pieza(0.13, 0.13, 0.65, piel, 0.32, 1.25, 0.32);
  return g;
}

// --- Estado ---
let fase = 'menu';
const controles = new PointerLockControls(camara, document.body);
const jugador = { pos: camara.position, boostRestante: 0 };
const municion = { 1: AJUSTES.armas[1].balas, 2: AJUSTES.armas[2].balas };
let armaActual = 1;
let enfriamiento = 0;
let retroceso = 0;

const listaEnemigos = [];
const cajasImpacto = [];
const objetosSuelo = [];
const portadoresArma = {};

const $ = (id) => document.getElementById(id);
const ui = {
  restantes: $('restantes'), metros: $('metros'),
  aviso: $('aviso'), mira: $('mira'), velocidad: $('velocidad')
};
let temporizadorAviso = 0;

function mostrarAviso(texto, seg = 1.8) {
  ui.aviso.textContent = texto;
  ui.aviso.classList.add('visible');
  temporizadorAviso = seg;
}

function actualizarArsenal() {
  for (const id of [1, 2]) {
    const el = $('slot' + id);
    el.classList.toggle('activo', id === armaActual);
    el.classList.toggle('vacio', municion[id] === 0);
    el.querySelector('.cargador').textContent = municion[id] + ' balas';
    el.querySelector('.nombre').textContent = AJUSTES.armas[id].nombre;
  }
}

function mostrarPantalla(titulo, clase, texto, etiquetaBoton, callback) {
  const t = $('titulo-pantalla');
  t.textContent = titulo;
  t.className = clase || '';
  $('texto-pantalla').innerHTML = texto;
  const btn = $('boton-pantalla');
  btn.textContent = etiquetaBoton;
  btn.disabled = false;
  btn.onclick = callback;
  $('pantalla').classList.remove('oculta');
}
const ocultarPantalla = () => $('pantalla').classList.add('oculta');

// Sonido
let ctxAudio = null;
function tono(freq, dur, tipo = 'square', vol = 0.14) {
  if (!ctxAudio) return;
  const o = ctxAudio.createOscillator();
  const g = ctxAudio.createGain();
  o.type = tipo;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctxAudio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctxAudio.currentTime + dur);
  o.connect(g);
  g.connect(ctxAudio.destination);
  o.start();
  o.stop(ctxAudio.currentTime + dur);
}
function sonidoDisparo(potente) {
  tono(potente ? 85 : 150, potente ? 0.28 : 0.13, 'sawtooth', 0.22);
}

// --- Armas ---
const destello = new THREE.PointLight(0xffaa44, 0, 5.5, 2);
camara.add(destello);
destello.position.set(0.22, -0.12, -0.85);

function montarArmas() {
  for (const id of [1, 2]) {
    const cfg = AJUSTES.armas[id];
    const glb = modelos['arma' + id];
    let portador;
    if (glb) {
      const pieza = normalizar(glb.scene.clone(true), cfg.escala, false, false);
      pieza.rotation.y = cfg.rotY;
      portador = new THREE.Group();
      portador.add(pieza);
    } else {
      portador = new THREE.Group();
      portador.add(normalizar(armaRespaldo(id), cfg.escala, false, false));
    }
    portador.position.set(...cfg.offset);
    portador.userData.base = portador.position.clone();
    portador.visible = id === armaActual;
    camara.add(portador);
    portadoresArma[id] = portador;
  }
}

function cambiarArma(id) {
  if (fase !== 'jugando' || id === armaActual) return;
  armaActual = id;
  for (const k of [1, 2]) portadoresArma[k].visible = k === id;
  actualizarArsenal();
  tono(480, 0.04, 'triangle', 0.09);
}

// --- Enemigos ---
function crearEnemigo(x, z, indice) {
  const glb = modelos.zombie;
  let cuerpo, clips = [];
  if (glb) {
    cuerpo = SkeletonUtils.clone(glb.scene);
    cuerpo = normalizar(cuerpo, AJUSTES.enemigo.altura, true, true);
    clips = glb.animations;
  } else {
    cuerpo = zombieRespaldo();
  }
  cuerpo.traverse((nodo) => { if (nodo.isMesh) nodo.material = nodo.material.clone(); });

  const contenedor = new THREE.Group();
  contenedor.add(cuerpo);
  contenedor.position.set(x, 0, z);
  contenedor.rotation.y = Math.random() * Math.PI * 2;
  escena.add(contenedor);

  const hitbox = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 1.85, 0.85),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitbox.position.y = 0.92;
  contenedor.add(hitbox);

  const enemigo = {
    contenedor, cuerpo, hitbox,
    vida: AJUSTES.enemigo.vida,
    estado: 'inactivo',
    velocidad: indice % 5 === 4 ? AJUSTES.enemigo.velocidadRapida : AJUSTES.enemigo.velocidadBase,
    mezclador: null, destelloRojo: 0, caida: 0
  };
  hitbox.userData.ref = enemigo;

  if (clips.length) {
    enemigo.mezclador = new THREE.AnimationMixer(cuerpo);
    // Preferir animación de caminar para que el movimiento se vea claramente
    const clip = clips.find((c) => /walk/i.test(c.name)) ||
                 clips.find((c) => /run/i.test(c.name)) ||
                 clips.find((c) => /idle/i.test(c.name)) ||
                 clips[0];
    enemigo.mezclador.clipAction(clip).play();
  }
  listaEnemigos.push(enemigo);
  cajasImpacto.push(hitbox);
}

function activarDestello(enemigo) {
  enemigo.destelloRojo = 0.11;
  enemigo.cuerpo.traverse((n) => {
    if (n.isMesh && n.material.emissive) {
      n.material.emissive.set(0xff0000);
      n.material.emissiveIntensity = 1.4;
    }
  });
}

function apagarDestello(enemigo) {
  enemigo.cuerpo.traverse((n) => {
    if (n.isMesh && n.material.emissive) {
      n.material.emissive.set(0x000000);
      n.material.emissiveIntensity = 1;
    }
  });
}

function herirEnemigo(enemigo) {
  enemigo.vida -= 1;
  activarDestello(enemigo);
  if (enemigo.vida <= 0) {
    enemigo.estado = 'muerto';
    const idx = cajasImpacto.indexOf(enemigo.hitbox);
    if (idx >= 0) cajasImpacto.splice(idx, 1);
    if (enemigo.mezclador) enemigo.mezclador.stopAllAction();
    actualizarContador();
    tono(75, 0.35, 'sawtooth', 0.18);
  }
}

function actualizarContador() {
  ui.restantes.textContent = listaEnemigos.filter((e) => e.estado !== 'muerto').length;
}

// --- Disparo ---
const rayo = new THREE.Raycaster();
const centroPantalla = new THREE.Vector2(0, 0);

function disparar() {
  const cfg = AJUSTES.armas[armaActual];
  if (enfriamiento > 0) return;
  if (municion[armaActual] <= 0) {
    tono(110, 0.05, 'square', 0.09);
    mostrarAviso('Sin munición. Busca una caja', 1.1);
    return;
  }
  municion[armaActual] -= 1;
  enfriamiento = cfg.enfriamiento;
  retroceso = 1;
  destello.intensity = 38;
  sonidoDisparo(armaActual === 2);
  actualizarArsenal();

  rayo.setFromCamera(centroPantalla, camara);
  rayo.far = cfg.alcance;
  const impactoZ = rayo.intersectObjects(cajasImpacto, false)[0];
  const impactoPared = rayo.intersectObjects(superficiesSolidas, false)[0];

  if (impactoZ && (!impactoPared || impactoZ.distance < impactoPared.distance)) {
    herirEnemigo(impactoZ.object.userData.ref);
    ui.mira.classList.add('impacto');
    setTimeout(() => ui.mira.classList.remove('impacto'), 100);
  }
}

addEventListener('mousedown', (e) => {
  if (e.button === 0 && fase === 'jugando' && controles.isLocked) disparar();
});

// --- Coleccionables ---
function crearPickup(tipo, x, z) {
  let malla;
  if (tipo === 'municion') {
    malla = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.32, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x3d4a1c, emissive: 0xfbbf24, emissiveIntensity: 0.55 })
    );
  } else {
    malla = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28),
      new THREE.MeshStandardMaterial({ color: 0x2dd4bf, emissive: 0x2dd4bf, emissiveIntensity: 0.85 })
    );
  }
  malla.position.set(x, 0.75, z);
  escena.add(malla);
  objetosSuelo.push({ tipo, malla, recogido: false });
}

function actualizarPickups(dt, t) {
  for (const obj of objetosSuelo) {
    if (obj.recogido) continue;
    obj.malla.rotation.y += dt * 1.8;
    obj.malla.position.y = 0.75 + Math.sin(t * 2.8 + obj.malla.position.x) * 0.07;
    const dx = obj.malla.position.x - jugador.pos.x;
    const dz = obj.malla.position.z - jugador.pos.z;
    if (dx * dx + dz * dz < 2.25) {
      obj.recogido = true;
      escena.remove(obj.malla);
      if (obj.tipo === 'municion') {
        municion[1] += AJUSTES.armas[1].recargaCaja;
        municion[2] += AJUSTES.armas[2].recargaCaja;
        actualizarArsenal();
        mostrarAviso(`+${AJUSTES.armas[1].recargaCaja} revólver · +${AJUSTES.armas[2].recargaCaja} escopeta`);
        tono(680, 0.11, 'triangle', 0.14);
      } else {
        jugador.boostRestante = AJUSTES.jugador.duracionBoost;
        mostrarAviso('¡Velocidad aumentada!');
        tono(860, 0.18, 'triangle', 0.14);
      }
    }
  }
}

// --- Colisiones ---
function resolverColision(pos, radio) {
  for (let pasada = 0; pasada < 2; pasada++) {
    for (const o of obstaculos) {
      const nx = Math.max(o.minX, Math.min(pos.x, o.maxX));
      const nz = Math.max(o.minZ, Math.min(pos.z, o.maxZ));
      let dx = pos.x - nx, dz = pos.z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= radio * radio) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        const empuje = radio - d;
        pos.x += (dx / d) * empuje;
        pos.z += (dz / d) * empuje;
      } else {
        const izq = pos.x - o.minX, der = o.maxX - pos.x;
        const arr = pos.z - o.minZ, aba = o.maxZ - pos.z;
        const menor = Math.min(izq, der, arr, aba);
        if (menor === izq) pos.x = o.minX - radio;
        else if (menor === der) pos.x = o.maxX + radio;
        else if (menor === arr) pos.z = o.minZ - radio;
        else pos.z = o.maxZ + radio;
      }
    }
  }
}

// --- Entrada ---
const teclas = {};
addEventListener('keydown', (e) => {
  teclas[e.code] = true;
  if (e.code === 'Digit1') cambiarArma(1);
  if (e.code === 'Digit2') cambiarArma(2);
});
addEventListener('keyup', (e) => { teclas[e.code] = false; });

const dirFrente = new THREE.Vector3();
const dirDerecha = new THREE.Vector3();
const ejeY = new THREE.Vector3(0, 1, 0);
let tiempoBob = 0;

function moverJugador(dt) {
  camara.getWorldDirection(dirFrente);
  dirFrente.y = 0;
  dirFrente.normalize();
  dirDerecha.crossVectors(dirFrente, ejeY).normalize();

  let mx = 0, mz = 0;
  if (teclas['KeyW']) mz += 1;
  if (teclas['KeyS']) mz -= 1;
  if (teclas['KeyD']) mx += 1;
  if (teclas['KeyA']) mx -= 1;

  const enMovimiento = mx !== 0 || mz !== 0;
  if (enMovimiento) {
    const len = Math.hypot(mx, mz);
    const vel = (jugador.boostRestante > 0 ? AJUSTES.jugador.velocidadBoost : AJUSTES.jugador.velocidad) * dt;
    jugador.pos.x += ((dirFrente.x * mz + dirDerecha.x * mx) / len) * vel;
    jugador.pos.z += ((dirFrente.z * mz + dirDerecha.z * mx) / len) * vel;
    resolverColision(jugador.pos, AJUSTES.jugador.radio);
    tiempoBob += dt * 8.5;
  }
  jugador.pos.y = AJUSTES.jugador.alturaOjos;

  if (jugador.boostRestante > 0) {
    jugador.boostRestante -= dt;
    ui.velocidad.style.display = 'block';
    if (jugador.boostRestante <= 0) ui.velocidad.style.display = 'none';
  }

  const portador = portadoresArma[armaActual];
  if (portador) {
    const base = portador.userData.base;
    portador.position.set(
      base.x + (enMovimiento ? Math.sin(tiempoBob) * 0.009 : 0),
      base.y + (enMovimiento ? Math.abs(Math.cos(tiempoBob)) * 0.011 : 0),
      base.z + retroceso * 0.07
    );
    portador.rotation.x = retroceso * 0.11;
  }
  retroceso = Math.max(0, retroceso - dt * 7.5);
  destello.intensity = Math.max(0, destello.intensity - dt * 550);
}

// --- Lógica de enemigos ---
function actualizarEnemigos(dt, t) {
  for (const e of listaEnemigos) {
    if (e.mezclador && e.estado === 'activo') e.mezclador.update(dt);
    if (e.destelloRojo > 0) {
      e.destelloRojo -= dt;
      if (e.destelloRojo <= 0) apagarDestello(e);
    }
    if (e.estado === 'muerto') {
      if (e.caida < 1) {
        e.caida = Math.min(1, e.caida + dt * 1.9);
        e.contenedor.rotation.x = -e.caida * (Math.PI / 2);
        e.contenedor.position.y = e.caida * 0.12;
      }
      continue;
    }

    const p = e.contenedor.position;
    const dx = jugador.pos.x - p.x;
    const dz = jugador.pos.z - p.z;
    const dist = Math.hypot(dx, dz);

    if (e.estado === 'inactivo') {
      e.cuerpo.rotation.z = Math.sin(t * 1.4 + p.x) * 0.035;
      if (dist < AJUSTES.enemigo.rangoDeteccion) e.estado = 'activo';
      else continue;
    }

    e.cuerpo.rotation.z = 0;
    const nx = dx / dist, nz = dz / dist;
    p.x += nx * e.velocidad * dt;
    p.z += nz * e.velocidad * dt;

    for (const otro of listaEnemigos) {
      if (otro === e || otro.estado === 'muerto') continue;
      const ox = p.x - otro.contenedor.position.x;
      const oz = p.z - otro.contenedor.position.z;
      const d2 = ox * ox + oz * oz;
      if (d2 < 0.55 && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        p.x += (ox / d) * 0.018;
        p.z += (oz / d) * 0.018;
      }
    }
    resolverColision(p, 0.38);
    e.contenedor.rotation.y = Math.atan2(nx, nz) + AJUSTES.enemigo.correccionYaw;
    if (!e.mezclador) e.cuerpo.position.y = Math.abs(Math.sin(t * 7.5 + p.x)) * 0.04;

    if (dist < AJUSTES.contactoLetal) {
      finPartida();
      return;
    }
  }
}

// --- Fin de partida ---
function finPartida() {
  if (fase !== 'jugando') return;
  fase = 'derrota';
  controles.unlock();
  tono(95, 0.7, 'sawtooth', 0.28);
  mostrarPantalla('GAME OVER', 'derrota',
    'Un enemigo te alcanzó. La extracción falló.',
    'Reintentar', () => location.reload());
}

function victoria() {
  if (fase !== 'jugando') return;
  fase = 'victoria';
  controles.unlock();
  tono(560, 0.28, 'triangle', 0.18);
  setTimeout(() => tono(820, 0.45, 'triangle', 0.18), 220);
  mostrarPantalla('¡EXTRACCIÓN EXITOSA!', 'victoria',
    'Has llegado a la zona segura. Misión cumplida.',
    'Jugar de nuevo', () => location.reload());
}

// --- Bucle ---
const reloj = new THREE.Clock();

function bucle() {
  requestAnimationFrame(bucle);
  const dt = Math.min(reloj.getDelta(), 0.05);
  const t = reloj.elapsedTime;

  if (fase === 'jugando') {
    enfriamiento = Math.max(0, enfriamiento - dt);
    moverJugador(dt);
    actualizarEnemigos(dt, t);
    actualizarPickups(dt, t);

    const [za] = MAPA.extraccion;
    ui.metros.textContent = Math.max(0, Math.round(jugador.pos.z - za));
    if (temporizadorAviso > 0) {
      temporizadorAviso -= dt;
      if (temporizadorAviso <= 0) ui.aviso.classList.remove('visible');
    }

    const [zA, zB] = MAPA.extraccion;
    if (jugador.pos.z < zA && jugador.pos.z > zB - 18 && Math.abs(jugador.pos.x) < MAPA.mitadCalle) {
      victoria();
    }
  } else {
    actualizarPickups(dt, t);
  }
  render.render(escena, camara);
}

// --- Arranque ---
async function iniciar() {
  const [a1, a2, zb] = await Promise.all([
    intentarCargar(AJUSTES.armas[1].archivo),
    intentarCargar(AJUSTES.armas[2].archivo),
    intentarCargar(AJUSTES.enemigo.archivo)
  ]);
  modelos.arma1 = a1;
  modelos.arma2 = a2;
  modelos.zombie = zb;

  construirEscenario();
  montarArmas();
  MAPA.enemigos.forEach(([x, z], i) => crearEnemigo(x, z, i));
  MAPA.cajasMunicion.forEach(([x, z]) => crearPickup('municion', x, z));
  MAPA.potenciadores.forEach(([x, z]) => crearPickup('boost', x, z));
  actualizarArsenal();
  actualizarContador();

  mostrarPantalla(
    'EXTRACCIÓN NOCTURNA', '',
    'La ciudad cayó. Debes cruzar la calle infestada, conservar cada bala y alcanzar la <b style="color:#34d399">zona de extracción</b> antes de que te alcancen.<br><br>' +
    '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> moverse · <b>Mouse</b> mirar · <b>Clic</b> disparar<br>' +
    '<kbd>1</kbd> Revólver · <kbd>2</kbd> Escopeta<br>' +
    'Cada enemigo cae con exactamente 2 impactos. Recoge las cajas para reponer munición.',
    'COMENZAR',
    () => {
      ctxAudio = ctxAudio || new (window.AudioContext || window.webkitAudioContext)();
      controles.lock();
    }
  );
}

controles.addEventListener('lock', () => {
  if (fase === 'menu') fase = 'jugando';
  if (fase === 'jugando') ocultarPantalla();
});
controles.addEventListener('unlock', () => {
  if (fase === 'jugando') {
    mostrarPantalla('PAUSA', '', 'Haz clic para continuar la misión.', 'Continuar', () => controles.lock());
  }
});

iniciar();
bucle();
