# sapphire blue.

Sitio estático con Astro, TypeScript estricto y Tailwind CSS 4, desplegable en Vercel.

## Desarrollo

Requiere Node.js 22.22+ y pnpm 11.0.8 (indicados en `package.json`).

```sh
pnpm install
pnpm dev
```

| Comando | Función |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo |
| `pnpm check` | Validación de Astro y TypeScript |
| `pnpm build` | Genera el sitio estático en `dist/` |
| `pnpm preview` | Sirve el build de producción |
| `pnpm test` | Pruebas funcionales y comparación visual |

## Organización

- `src/pages/index.astro`: composición de la página.
- `src/layouts/BaseLayout.astro`: documento, fuentes, metadatos y datos estructurados originales.
- `src/components/`: secciones y tarjetas de planes.
- `src/data/pricing.ts`: precios, tipos y cálculo compartidos por las tarjetas y la calculadora.
- `src/scripts/site.ts`: navegación, pestañas, FAQ, calculadora, formulario y animaciones.
- `src/styles/global.css`: reglas originales y configuración de Tailwind.
- `public/`: imágenes, `robots.txt` y `sitemap.xml`, con sus URLs públicas preservadas.

## Fidelidad visual

La migración no rediseña la página. Las propiedades arbitrarias de Tailwind conservan los valores CSS originales, sin redondearlos a escalas predefinidas. Los fondos complejos y determinadas prioridades de estilos se mantienen como CSS literal. Preflight está desactivado para no modificar los estilos predeterminados del navegador. Los archivos de imagen se extrajeron de sus data URIs sin cambiar sus bytes.

Las capturas de referencia en `tests/visual.spec.ts-snapshots/` proceden del HTML anterior a la migración. Las pruebas comparan páginas completas a 390, 819, 820 y 1440 px, además de los planes de email y la calculadora configurada a 390 y 1440 px, con tolerancia de **cero píxeles**. Usan Chromium en Linux, la fuente Manrope de Google Fonts (alojada localmente en `public/fonts/`, con su licencia OFL) y movimiento reducido para evitar estados intermedios de animación. Para reproducirlas, utiliza el mismo navegador y sistema; otros sistemas pueden rasterizar fuentes de forma distinta.

Antes de ejecutar pruebas por primera vez:

```sh
pnpm exec playwright install --with-deps chromium
pnpm test
```

Las pruebas del formulario interceptan las solicitudes: no envían contactos reales. En producción se mantienen el endpoint de Google Apps Script y el comportamiento original de envío `no-cors`, incluida la pantalla de confirmación sin verificación de entrega.

## Vercel

`vercel.json` configura Astro, la instalación con el lockfile de pnpm, `pnpm build` y la salida `dist/`. No necesita un adaptador de servidor. No se ha realizado ningún despliegue desde esta migración.
