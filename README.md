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

`vercel.json` configura Astro, la instalación con el lockfile de pnpm, `pnpm build` y la salida `dist/`. No necesita un adaptador de servidor.

El proyecto es `iamtenshis-projects/sapphire-blue-web`, del equipo `iamtenshi's projects` (plan Hobby). Está conectado al repositorio de GitHub `IamTenshi/sapphire-blue-web` con `main` como rama de producción, así que cada push a `main` genera un despliegue de producción. Los despliegues manuales se hacen con `vercel deploy` y `vercel deploy --prod` desde un directorio enlazado con `vercel link`.

### Observabilidad

- Web Analytics está habilitado en el proyecto y `@vercel/analytics` monta `<Analytics />` en `src/layouts/BaseLayout.astro`. Habilitarlo en el panel añade las rutas `/_vercel/insights/*` en el despliegue siguiente.
- `@vercel/speed-insights` monta `<SpeedInsights />` en la misma plantilla. Speed Insights funciona en el tier gratuito, con Real Experience Score y 10.000 eventos por 30 días compartidos en el equipo. Speed Insights Plus requiere el plan Pro ($20 al mes por equipo) más $10 al mes por proyecto y $0.65 por cada 10.000 eventos; no está contratado.
- Los dos componentes son elementos personalizados inertes: solo cargan el script de recogida de Vercel, sin modificar el HTML visible ni las capturas de las pruebas visuales.

### Dominio

- `sapphireblue.studio` y `www.sapphireblue.studio` están añadidos al proyecto y pendientes de verificación por TXT. Vercel pide dos registros TXT en `_vercel.sapphireblue.studio`, uno por cada nombre, con el valor `vc-domain-verify=<dominio>,<hash>` que devuelve el panel o `vercel project web-analytics`. La verificación se relanza con `vercel domains inspect <dominio>` o con `POST /v9/projects/<id>/domains/<dominio>/verify`.
- Los DNS del dominio están en Squarespace (`nse1`–`nse4.squarespacedns.com`), no en Vercel. El apex resuelve a los IP de Vercel y `www` a un CNAME de `vercel-dns`.
- El dominio estaba registrado en otra cuenta de Vercel, que sigue sirviendo la versión anterior del sitio. Hay que quitarlo de esa cuenta antes de que la asignación nueva tome efecto.

## Compartir enlaces

- Dominio canónico: `https://www.sapphireblue.studio/`. `vercel.json` configura la redirección permanente del dominio sin `www` al dominio con `www`, conservando la ruta. Mantener el sitio sin protección de acceso para los rastreadores.
- En Vercel → proyecto → Settings → Domains, `www.sapphireblue.studio` debe servir Production (sin redirección al dominio sin `www`) y `sapphireblue.studio` debe redirigir permanentemente a `www.sapphireblue.studio`. Si se cambió previamente a la configuración inversa, corregirla antes de desplegar para evitar un bucle. Los dos dominios están añadidos al proyecto y a la espera de la verificación TXT descrita en la sección de Vercel.
- `src/layouts/BaseLayout.astro` entrega Open Graph y tarjetas de X en el HTML, sin JavaScript. `public/social-preview-v2.jpg` es una imagen JPEG de 1200 × 630 y unos 88 KB. Se conserva `/og-image.png` para enlaces antiguos.
- `tests/sharing.spec.ts` comprueba el HTML y la imagen localmente con los agentes de WhatsApp, Facebook, X, LinkedIn, Telegram, Slack y Discord. No sustituye las pruebas reales en esas plataformas ni comprueba sus cachés o el firewall de producción.
- Después de desplegar, verificar que la nueva imagen devuelve HTTP 200 con `Content-Type: image/jpeg`, sin redirecciones, y probar el enlace en cada plataforma. Solicitar una nueva lectura en [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) y [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/). WhatsApp y otras aplicaciones pueden conservar vistas antiguas; los mensajes ya enviados no necesariamente se actualizan.
- Cada plataforma decide si muestra tarjeta, tamaño y recorte. Instagram, SMS y muchos clientes de correo no generan vistas previas Open Graph en todos sus formatos. En publicaciones o correos que necesiten una imagen garantizada, adjuntar el JPEG como imagen y añadir el enlace por separado.
- Al renovar el diseño, usar otro nombre de archivo y actualizar sus referencias para evitar reutilizar una imagen en caché.
