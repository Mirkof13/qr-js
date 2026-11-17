# Clase 14 · React + three.js + AR.js

Proyecto de realidad aumentada con **React + Vite**, **three.js**, **react-three-fiber**
y **AR.js**, usando los modelos del repositorio
[KhronosGroup/glTF-Sample-Assets](https://github.com/KhronosGroup/glTF-Sample-Assets).

## Qué incluye

- **Realidad aumentada (AR.js)**: marcador **Hiro** + modelo glTF cargado con `GLTFLoader`.
- **Visor 3D (R3F)**: escena de react-three-fiber con `OrbitControls`, sombras y animaciones glTF.
- Selector de modelo (Fox animado, Damaged Helmet, Avocado, Boom Box).
- `glTF-Sample-Assets` clonado completo dentro del proyecto.

## Requisitos

- Node.js 20+ (probado con Node 24)
- Git
- Una webcam (para la parte de AR)

## Puesta en marcha

```bash
npm install        # ya ejecutado
npm run dev        # https://localhost:5173
```

El servidor arranca con **HTTPS autofirmado** (plugin `@vitejs/plugin-basic-ssl`)
porque los navegadores sólo permiten usar la cámara en `https` o `localhost`.
La primera vez el navegador va a mostrar una advertencia de certificado:
elegí *Avanzado → Continuar*.

### Probar AR desde el celular

1. `npm run dev` y mirá la IP que imprime Vite (por ejemplo `https://192.168.0.10:5173`).
2. Abrí esa URL en el celular, aceptá el certificado y permití la cámara.
3. Apuntá la cámara al marcador **Hiro**:
   - [Imagen del marcador](https://ar-js-org.github.io/AR.js/data/images/HIRO.jpg)
   - Archivo local: `public/ar/data/patt.hiro`
4. Tocá **Iniciar AR**.

## Repo de modelos (glTF-Sample-Assets)

Se clonó completo en `./glTF-Sample-Assets` (con `--depth 1` para no bajar todo el
historial). Si lo borraste, se recupera con:

```bash
npm run clone-assets
```

Los modelos se referencian por ruta, por ejemplo:

```js
'/glTF-Sample-Assets/Models/Fox/glTF-Binary/Fox.glb'
```

> **Importante:** el servidor de desarrollo de Vite sirve cualquier archivo que esté
> dentro del proyecto, así que en `npm run dev` las rutas funcionan. En un `npm run build`
> esos archivos **no** se copian a `dist/`. Si necesitás publicarlo, copiá a `public/`
> sólo los modelos que uses (o importalos con `import url from '...?url'`).
>
> El repo está en `.gitignore` porque pesa varios GB.

## Estructura

```
clase 14/
├─ glTF-Sample-Assets/          # repo de Khronos (modelos .gltf/.glb)
├─ public/ar/data/
│  ├─ camera_para.dat           # calibración de cámara para AR.js
│  └─ patt.hiro                 # marcador Hiro
├─ src/
│  ├─ App.jsx                   # tabs AR / visor y selector de modelo
│  ├─ App.css
│  ├─ ar/ARScene.jsx            # AR.js + three.js (cámara, marcador, glTF)
│  └─ components/ModelViewer.jsx# visor con react-three-fiber
└─ vite.config.js               # HTTPS + dedupe de three
```

## Notas técnicas

- **Una sola copia de three**: `@ar-js-org/ar.js` trae su propio `three`; se fuerza el
  dedupe en `vite.config.js` para evitar dos instancias.
- **Sin `StrictMode`**: en desarrollo monta los efectos dos veces y AR.js abriría la
  cámara dos veces.
- **`glTF-Sample-Assets`** se clona con `core.longpaths=true` por las rutas largas de
  algunos modelos en Windows.
- `npm install` reporta vulnerabilidades en dependencias de AR.js (`aframe`, etc.);
  son del paquete de terceros y no afectan el funcionamiento del proyecto.
