# SEO, visibilidad en IA y conversión

## Alcance

Rama: `feat/seo-geo-growth`. Mercado existente: pequeños negocios de Estados Unidos, contenido en inglés, precios en USD. Se conservan diseño, precios y copy comercial. Las únicas excepciones de texto son estados de envío/error, ayuda sin JavaScript, salto de navegación por teclado y página 404.

En la ampliación original no se desplegaron cambios, enviaron leads de prueba reales, contrataron herramientas, activaron campañas, modificaron cuentas externas ni inventaron credenciales, reseñas, sede, equipo o resultados. La validación posterior de `fix/meta-pixel-lead` incluyó un único envío técnico real autorizado, documentado más abajo. Las capacidades de marketing se aplican donde aportan valor al sitio: no se añaden 30 dependencias ni 30 páginas artificiales.

## Diagnóstico y correcciones

| Prioridad | Evidencia en el repositorio | Cambio |
| --- | --- | --- |
| Alta | El formulario ocultaba los datos y confirmaba éxito antes de que terminara `fetch`; los errores se descartaban. | Espera asíncrona, bloqueo de duplicados simultáneos, timeout de 15 segundos, error recuperable y estado final que distingue envío de recepción verificada. |
| Alta | Las FAQ de `seo.ts` resumían manualmente las respuestas de `FAQ.astro`. | Una fuente de datos para párrafos visibles y respuestas completas en JSON-LD. No hay afirmaciones nuevas. |
| Media | `BaseLayout.astro` fijaba canonical y `og:url` siempre a la portada. | URL canónica por ruta sin parámetros de campaña; metadatos configurables y sin canonical ni Schema de portada en el 404. |
| Media | No existía una página 404 propia. | Página de error con marca, enlaces de recuperación y `noindex`; se comprueba HTTP 404, no un soft 404 con HTTP 200. |
| Media | `robots.txt` y sitemap repetían el dominio manualmente; sitemap tenía una fecha fija. | Generación estática desde `Astro.site`, listado explícito de páginas indexables y sin fechas de modificación inventadas. Las URLs públicas no cambian. |
| Media | Las pestañas tenían roles pero no relaciones tab/panel ni navegación con flechas. | Identificadores, etiquetas, foco itinerante y teclas flecha, Inicio y Fin. |
| Media | La calculadora recreaba todos sus botones en cada actualización. | Controles estables para conservar el foco, `aria-pressed`, grupos etiquetados y total anunciado de forma no intrusiva. Límites de plataformas deshabilitados realmente. |
| Media | El menú móvil podía cerrarse sin restablecer `aria-expanded`. | Estado sincronizado al navegar, pulsar Escape, hacer clic fuera y cambiar de breakpoint. Escape devuelve el foco al botón. |
| Media | Sin JavaScript no se podían ver los planes de email ni la mayoría de respuestas; la calculadora mostraba $0. | Ambos grupos de planes y todas las respuestas disponibles; calculadora sustituida por instrucciones y formulario por alternativa de correo. Menú móvil visible. |
| Media | No había instrumentación de selección de planes y solicitudes. | Eventos locales tipados sin datos de contacto; envío externo opcional y desactivado por defecto. No se contabiliza una respuesta opaca como lead confirmado. |

Los previews de Vercel reciben `noindex` en el HTML. No se cambia la política existente de rastreadores: descubrimiento, recuperación y entrenamiento son decisiones distintas. `llms.txt` sigue siendo una ayuda experimental, no una garantía de inclusión.

## Comprobación pública de partida — 21 de octubre de 2026

- El dominio sin `www` termina en `https://www.sapphireblue.studio/`, con HTTP 200 y el título `Sapphire Blue Studio | Small Business Marketing`.
- La portada, robots, sitemap y `llms.txt` son accesibles mediante solicitudes públicas ordinarias.
- Esto no acredita el estado de Search Console, la indexación real, la titularidad en Vercel, ni el acceso desde IP de rastreadores. No se dispone de sus informes ni logs.
- La portada ya tenía HTML estático, Schema de organización/ofertas, fuentes locales e imágenes pequeñas. No se añaden bibliotecas de renderizado ni se recodifican recursos por aparentar una mejora de rendimiento.

## Embudo e interpretación de eventos

| Evento | Significado |
| --- | --- |
| `contact_click` | Clic hacia contacto; origen acotado a plan, calculadora, website o enlace genérico. |
| `email_click` | Clic en `mailto:`; no prueba que se haya enviado un email. |
| `plan_selected` | Selección de una tarjeta de plan y servicio. |
| `plan_built` | Solicitud desde la calculadora, con opciones estructuradas. |
| `form_submit` | Intento de envío que pasa la validación del navegador y la selección de necesidades. |
| `form_success` | HTTP correcto y respuesta legible con texto `ok`, el contrato del Apps Script facilitado. Sustituye a `form_submission_unverified` desde `fix/meta-pixel-lead`. |
| `form_error` | Fallo de red, timeout, CORS o respuesta no confirmada; se mantienen los datos para un reintento deliberado. Un fallo de lectura tampoco demuestra que el servidor no haya recibido nada. |

Sin receptor, estos eventos no se guardan. No usar clics o intentos como equivalentes a leads, ni prometer atribución de tráfico de IA a partir de una subida de búsquedas de marca. El SDK de Vercel solo se activa con consentimiento operativo explícito mediante la variable documentada en el README y un plan compatible.

Actualización en `fix/meta-pixel-lead`: el propietario facilitó el código de Apps Script, que devuelve `ContentService.createTextOutput('ok')` después de guardar la fila y llamar a `MailApp.sendEmail`. El formulario ahora verifica ese contrato mediante un POST simple con CORS y sigue la redirección de ContentService. Solo entonces registra `fbq('track', 'Lead')`, sin datos personales del formulario. No se acepta cualquier HTTP 200 de Google ni se usa una respuesta opaca como confirmación.

El 22 de octubre de 2026 se comprobó la lectura real de `ok` mediante CORS, sin sesión de Google, con un único envío técnico autorizado; no se modificó ni desplegó Apps Script. Queda pendiente que el propietario confirme la versión y configuración administrativa, la fila guardada y la recepción del correo. Si CORS o la lectura de la respuesta fallan, se conserva el formulario y no se registra un lead; no hay reintento automático ni fallback a `no-cors`. La protección antiabuso y la idempotencia entre reintentos siguen pendientes en Apps Script: la fila puede haberse guardado antes de un fallo del correo o de la respuesta. La confirmación no acredita que la notificación haya llegado a la bandeja de entrada.

## Siguientes oportunidades, sin publicar todavía

### Contenido y demanda

Las siguientes son hipótesis para investigar, no keywords con volumen o dificultad medidos:

| Intención | Tema candidato | Datos necesarios antes de crear páginas |
| --- | --- | --- |
| Contratar web | `small business website design` | Ejemplos reales autorizados, alcance, proceso y límites del servicio. |
| Delegar redes | `social media management for small businesses` | Plataformas disponibles, entregables y proceso de aprobación. |
| Comparar planes | `social media management pricing` | Preguntas reales de clientes y demanda medida; los precios ya son públicos. |
| Fidelizar clientes | `email marketing services for small business` | Alcance de automatizaciones, onboarding y requisitos de listas. |
| Evaluar identidad | `Sapphire Blue Studio` | Presentación verificable de empresa/equipo y perfiles oficiales coherentes. |

Primero inspeccionar consultas y páginas en Search Console y Bing Webmaster Tools. Priorizar demanda comercial real y oportunidades existentes, no multiplicar páginas por ciudad sin presencia o contenido propio. Las páginas de servicios y About implican cambios visibles: necesitan una fase de contenido aprobada y datos verificables.

### Confianza y distribución

- Casos reales con permiso y metodología, no testimonios ficticios ni cifras sin respaldo.
- Revisar coherencia de los perfiles oficiales antes de ampliar `sameAs`.
- Contenido útil en los canales donde participa la audiencia, sin spam masivo ni menciones falsas.
- Newsletter, lead magnet, automatizaciones y campañas requieren plataforma, base legal, consentimiento y objetivos de negocio. No se activan desde el código del sitio por iniciativa propia.

### Medición de SEO e IA

- Registrar una línea base de impresiones, clics, consultas comerciales, tráfico de marca y leads confirmados.
- Para consultas de IA, repetir cada prueba y registrar plataforma, fecha, idioma/región, muestra y fuente citada. Medir por separado recuperación, cita, mención y recomendación.
- Google no ofrece un informe específico de AI Overviews/AI Mode en Search Console; no inventar esa segmentación.
- Revisar datos de campo de Core Web Vitals antes de declarar mejoras. Las pruebas locales no acreditan LCP/INP/CLS de usuarios reales.

## Validación y publicación

Validación original de `feat/seo-geo-growth`: `pnpm check` sin errores ni advertencias, build estático correcto y **42 pruebas superadas**, incluidas las seis comparaciones visuales sin actualizar referencias. También se construyeron variantes locales de preview y producción en `/tmp/opencode` para comprobar `noindex` y la activación explícita de eventos. No fueron despliegues ni cambios de configuración en Vercel.

En este entorno faltaban bibliotecas del sistema para Chromium. Se descargaron y extrajeron únicamente en `/tmp/opencode/playwright-libs`; las pruebas se ejecutaron con `LD_LIBRARY_PATH=/tmp/opencode/playwright-libs/extracted/usr/lib/x86_64-linux-gnu pnpm test`. No se instalaron paquetes globales ni se añadieron dependencias al proyecto. Para una instalación normal, seguir la preparación de Playwright del README.

### Validación de `fix/meta-pixel-lead` — 22 de octubre de 2026

- `pnpm check`: cero errores, advertencias e indicaciones.
- Build estático nuevo y **58 pruebas superadas**, incluidas las seis comparaciones visuales sin modificar snapshots. Se reutilizaron las bibliotecas aisladas de Chromium con `LD_LIBRARY_PATH=/tmp/opencode/playwright-libs/extracted/usr/lib/x86_64-linux-gnu:/tmp/opencode/sapphire-browser-libs/usr/lib/x86_64-linux-gnu pnpm test`.
- Un único POST real autorizado, con datos sintéticos y referencia `SAPPHIRE-INTEGRATION-2026-10-22T20:11:51.156Z`, confirmó HTTP 200, respuesta de tipo `cors`, redirección a `script.googleusercontent.com` y cuerpo `ok`. El navegador mostró éxito y registró `form_success` y una sola llamada a `Lead` en la cola local.
- Se sirvió el build local mediante interceptación del navegador bajo el origen de producción, sin publicar archivos ni cambiar el hosting. Meta y Google Analytics estuvieron bloqueados: no se transmitieron conversiones de esta prueba. No se reintentó el envío.
- En una comprobación separada con el SDK real de Meta y respuesta del formulario simulada, se interceptaron en el navegador `PageView` y un único `Lead` dirigidos al píxel `1053877131029984`. Las solicitudes de seguimiento se respondieron localmente, sin llegar a Meta; esto verifica su construcción, no su recepción en el Administrador de eventos. Se usó un agente de usuario de escritorio porque el SDK descarta `HeadlessChrome` como bot.
- No se accedió a la hoja, al correo, a la configuración privada de Apps Script ni al Administrador de eventos de Meta. El propietario debe verificar esos destinos y revisar privacidad/consentimiento antes de producción. El sitio sigue sin gestor de consentimiento y el píxel también se carga en desarrollo y previews.

### Lista de publicación

1. Ejecutar `pnpm check`, `pnpm build` y `pnpm test`. Las pruebas de formulario interceptan el endpoint real.
2. Mantener los snapshots originales: seis comparaciones con tolerancia cero verifican que no se rediseña la portada ni los planes.
3. Los tests adicionales comprueban FAQ/Schema, enlaces, IDs/ARIA, canonical, 404, teclado, navegación sin JavaScript y estados de red/timeout/duplicados.
4. Revisar el diff y solicitar autorización de publicación. No hacer push a `main`: el README documenta que despliega producción automáticamente.
5. Después de publicar, comprobar HTML, HTTP 404, robots/sitemap y dominio canónico en el hosting real; validar Schema con una herramienta que renderice y revisar Search Console. Las pruebas locales no verifican firewall, cachés, DNS ni visitas reales de bots.

## Referencias

- Google, funciones de IA y SEO: https://developers.google.com/search/docs/appearance/ai-features
- Google, fechas `lastmod`: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Google, errores soft 404: https://developers.google.com/search/docs/crawling-indexing/soft-404-errors
- Vercel, eventos personalizados (Pro/Enterprise; consultado el 21 de octubre de 2026): https://vercel.com/docs/analytics/custom-events
