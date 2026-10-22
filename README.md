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
- `src/layouts/BaseLayout.astro`: documento, fuentes, metadatos por página, protección de previews con `noindex` y datos estructurados.
- `src/components/`: secciones y tarjetas de planes.
- `src/data/pricing.ts`: precios, tipos y cálculo compartidos por las tarjetas y la calculadora.
- `src/data/faq.ts`: preguntas y respuestas compartidas por el contenido visible y Schema.
- `src/scripts/site.ts`: navegación, pestañas, FAQ, calculadora, formulario y animaciones.
- `src/scripts/marketing.ts`: eventos del embudo sin datos personales, sin envío externo por defecto.
- `src/styles/global.css`: reglas originales y configuración de Tailwind.
- `public/`: imágenes, fuentes e iconos, con sus URLs públicas preservadas. El icono de redes sociales se importa con `astro:assets` para generar WebP de 110, 220 y 330 px; `srcset` y `sizes` evitan descargar el PNG original en la página.
- `src/pages/robots.txt.ts` y `src/pages/sitemap.xml.ts`: archivos estáticos generados desde `Astro.site`. `indexablePaths` en `src/data/seo.ts` enumera las páginas HTML indexables; al añadir páginas hay que actualizarlo.
- `src/pages/404.astro`: página de error con `noindex`, sin canonical ni Schema de la portada.

## Fidelidad visual

La migración no rediseña la página. Las propiedades arbitrarias de Tailwind conservan los valores CSS originales, sin redondearlos a escalas predefinidas. Los fondos complejos y determinadas prioridades de estilos se mantienen como CSS literal. Preflight está desactivado para no modificar los estilos predeterminados del navegador. Los archivos de imagen se extrajeron de sus data URIs sin cambiar sus bytes.

Las capturas de referencia en `tests/visual.spec.ts-snapshots/` proceden del HTML anterior a la migración. Las pruebas comparan páginas completas a 390, 819, 820 y 1440 px, además de los planes de email y la calculadora configurada a 390 y 1440 px, con tolerancia de **cero píxeles**. Usan Chromium en Linux, la fuente Manrope de Google Fonts (alojada localmente en `public/fonts/`, con su licencia OFL) y movimiento reducido para evitar estados intermedios de animación. Para reproducirlas, utiliza el mismo navegador y sistema; otros sistemas pueden rasterizar fuentes de forma distinta.

La optimización del icono de redes sociales actualizó únicamente sus píxeles en las cuatro referencias de página completa, tras verificar que no había diferencias fuera de su rectángulo de 110 × 96 px. Se conservan sus dimensiones y la composición original.

Antes de ejecutar pruebas por primera vez:

```sh
pnpm exec playwright install --with-deps chromium
pnpm test
```

Las pruebas usan un build nuevo en `http://127.0.0.1:4322`, sin reutilizar servidores existentes. Se puede cambiar el puerto con `PLAYWRIGHT_PORT=4338 pnpm test`. No se deben actualizar las capturas de referencia para ocultar regresiones.

Las pruebas del formulario interceptan las solicitudes: no envían contactos reales. En producción se conserva el endpoint de Google Apps Script y el envío `no-cors`. El formulario espera la respuesta de transporte, bloquea envíos simultáneos y recupera los datos ante errores o un timeout de 15 segundos. Una respuesta opaca **no confirma recepción ni entrega**: el estado final lo indica expresamente y ofrece contacto por email. Confirmar leads exige un backend con respuesta verificable; no se ha cambiado ni probado el Apps Script real.

## Vercel

`vercel.json` configura Astro, la instalación con el lockfile de pnpm, `pnpm build` y la salida `dist/`. No necesita un adaptador de servidor.

El proyecto es `iamtenshis-projects/sapphire-blue-web`, del equipo `iamtenshi's projects` (plan Hobby). Está conectado al repositorio de GitHub `IamTenshi/sapphire-blue-web` con `main` como rama de producción, así que cada push a `main` genera un despliegue de producción. Los despliegues manuales se hacen con `vercel deploy` y `vercel deploy --prod` desde un directorio enlazado con `vercel link`.

### Observabilidad

- Web Analytics está habilitado en el proyecto y `@vercel/analytics` monta `<Analytics />` en `src/layouts/BaseLayout.astro`. Habilitarlo en el panel añade las rutas `/_vercel/insights/*` en el despliegue siguiente.
- `@vercel/speed-insights` monta `<SpeedInsights />` en la misma plantilla. Speed Insights funciona en el tier gratuito, con Real Experience Score y 10.000 eventos por 30 días compartidos en el equipo. Speed Insights Plus requiere el plan Pro ($20 al mes por equipo) más $10 al mes por proyecto y $0.65 por cada 10.000 eventos; no está contratado.
- Los dos componentes son elementos personalizados inertes: solo cargan el script de recogida de Vercel, sin modificar el HTML visible ni las capturas de las pruebas visuales.
- Solo se montan en builds de Vercel (`PROD` y `VERCEL=1`). En desarrollo y builds locales se omiten para no solicitar rutas `/_vercel/*` que no existen en localhost.

### Dominio

- Comprobación pública del 21 de octubre de 2026: `https://sapphireblue.studio/` termina en `https://www.sapphireblue.studio/` con HTTP 200. La portada devuelve el título actual; `/robots.txt`, `/sitemap.xml` y `/llms.txt` también responden HTTP 200.
- Las notas anteriores registraban DNS en Squarespace y verificaciones TXT pendientes por una asignación en otra cuenta de Vercel. La respuesta pública ya funciona, pero no acredita la titularidad ni el estado administrativo del proyecto: comprobarlo en el panel antes de cambiar DNS o dominios. No se han realizado cambios en esos servicios.

## Visibilidad en buscadores de IA

`src/data/seo.ts` centraliza la identidad y los datos estructurados. Los seis planes de su `OfferCatalog` y `/pricing.md` se generan desde `src/data/pricing.ts`. `/llms.txt` ofrece un índice opcional; no es un requisito de Google ni garantiza citas. Estos cambios no alteran el contenido visible de la portada. El diagnóstico, los límites y los pasos de Search Console y medición están en [`docs/ai-search.md`](docs/ai-search.md).

## SEO, accesibilidad y conversión

La ampliación en `feat/seo-geo-growth` conserva el diseño y el copy comercial. Añade FAQ sin duplicación de datos, navegación por teclado, estados accesibles de selección, alternativas sin JavaScript, una página 404 real y metadatos que no reutilizan el canonical de portada en otras rutas. Solo cambia el texto funcional del formulario para no afirmar una entrega que el navegador no puede verificar. El alcance, los límites y las siguientes oportunidades están en [`docs/seo-growth.md`](docs/seo-growth.md).

### Eventos de marketing

El código base de Meta Pixel está en `src/layouts/BaseLayout.astro`: carga `fbevents.js` y registra un `PageView` por carga de página en todas las páginas que usan la plantilla, incluida la 404. El respaldo `<noscript>` está en el cuerpo del documento para mantener HTML válido. También se incluye en desarrollo y previews; no se han añadido eventos de conversión ni coincidencias avanzadas con datos personales. El sitio no dispone de gestor de consentimiento: revisar los requisitos de privacidad y consentimiento antes de desplegar esta integración. Tras publicar, comprobar con Meta Pixel Helper y «Probar eventos» en el Administrador de eventos; las pruebas locales interceptan Meta y no acreditan recepción real.

Por defecto, `document` emite `sapphire:marketing` con `{ name, properties }`, sin cookies, persistencia ni solicitudes adicionales. **Esto es instrumentación, no un panel de conversiones:** sin un receptor autorizado no se almacenan eventos. No se incluyen nombres, correos, teléfonos, mensajes ni parámetros de campaña en sus propiedades.

Vercel reserva los eventos personalizados para Pro y Enterprise. Solo después de confirmar plan, coste y requisitos de privacidad se puede configurar `PUBLIC_ENABLE_CUSTOM_EVENTS=true`. Se enviarán con el SDK ya instalado únicamente en builds de Vercel con `VERCEL_ENV=production`; quedan desactivados en desarrollo, builds locales sin esas variables y previews. No se ha activado la variable en Vercel ni contratado un plan.

## Compartir enlaces

- Dominio canónico: `https://www.sapphireblue.studio/`. `vercel.json` configura la redirección permanente del dominio sin `www` al dominio con `www`, conservando la ruta. Mantener el sitio sin protección de acceso para los rastreadores.
- En Vercel → proyecto → Settings → Domains, `www.sapphireblue.studio` debe servir Production (sin redirección al dominio sin `www`) y `sapphireblue.studio` debe redirigir permanentemente a `www.sapphireblue.studio`. La comprobación pública descrita arriba ya termina en `www`; revisar el panel antes de alterar esta configuración para evitar un bucle.
- `src/layouts/BaseLayout.astro` entrega Open Graph y tarjetas de X en el HTML, sin JavaScript. `public/social-preview-v2.jpg` es una imagen JPEG de 1200 × 630 y unos 88 KB. Se conserva `/og-image.png` para enlaces antiguos.
- `tests/sharing.spec.ts` comprueba el HTML y la imagen localmente con los agentes de WhatsApp, Facebook, X, LinkedIn, Telegram, Slack y Discord. No sustituye las pruebas reales en esas plataformas ni comprueba sus cachés o el firewall de producción.
- Después de desplegar, verificar que la nueva imagen devuelve HTTP 200 con `Content-Type: image/jpeg`, sin redirecciones, y probar el enlace en cada plataforma. Solicitar una nueva lectura en [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) y [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/). WhatsApp y otras aplicaciones pueden conservar vistas antiguas; los mensajes ya enviados no necesariamente se actualizan.
- Cada plataforma decide si muestra tarjeta, tamaño y recorte. Instagram, SMS y muchos clientes de correo no generan vistas previas Open Graph en todos sus formatos. En publicaciones o correos que necesiten una imagen garantizada, adjuntar el JPEG como imagen y añadir el enlace por separado.
- Al renovar el diseño, usar otro nombre de archivo y actualizar sus referencias para evitar reutilizar una imagen en caché.
