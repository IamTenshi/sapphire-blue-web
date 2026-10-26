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
- `src/data/business.ts`: operadora, proveedores, conservación prevista y disponibilidad independiente de email/SMS.
- `src/scripts/tracking.ts`: preferencias e instrumentación opcional; `src/scripts/marketing.ts`: eventos locales y conversiones confirmadas, sin datos personales.
- `/privacy` y `/sms-terms`: información en inglés, procesos activos y programas previstos diferenciados.
- `src/styles/global.css`: reglas originales y configuración de Tailwind.
- `public/`: imágenes, fuentes e iconos, con sus URLs públicas preservadas. El icono de redes sociales se importa con `astro:assets` para generar WebP de 110, 220 y 330 px; `srcset` y `sizes` evitan descargar el PNG original en la página.
- `src/pages/robots.txt.ts` y `src/pages/sitemap.xml.ts`: archivos estáticos generados desde `Astro.site`. `indexablePaths` en `src/data/seo.ts` enumera las páginas HTML indexables; al añadir páginas hay que actualizarlo.
- `src/pages/404.astro`: página de error con `noindex`, sin canonical ni Schema de la portada.

## Fidelidad visual

La migración no rediseña la página. Las propiedades arbitrarias de Tailwind conservan los valores CSS originales, sin redondearlos a escalas predefinidas. Los fondos complejos y determinadas prioridades de estilos se mantienen como CSS literal. Preflight está desactivado para no modificar los estilos predeterminados del navegador. Los archivos de imagen se extrajeron de sus data URIs sin cambiar sus bytes.

Las capturas históricas en `tests/visual.spec.ts-snapshots/` proceden del HTML anterior a la migración. El proyecto de privacidad añade intencionalmente avisos/opciones al formulario, enlaces al footer y una interfaz de preferencias; no se deben actualizar las referencias antiguas para ocultar esas diferencias. Se conserva comparación exacta de los planes y calculadora y se verifica por separado el contenido comercial no modificado. Se usa Chromium Linux, Manrope local y movimiento reducido.

La optimización del icono de redes sociales actualizó únicamente sus píxeles en las cuatro referencias de página completa, tras verificar que no había diferencias fuera de su rectángulo de 110 × 96 px. Se conservan sus dimensiones y la composición original.

Antes de ejecutar pruebas por primera vez:

```sh
pnpm exec playwright install --with-deps chromium
pnpm test
```

Las pruebas usan un build nuevo en `http://127.0.0.1:4322`, sin reutilizar servidores existentes. Se puede cambiar el puerto con `PLAYWRIGHT_PORT=4338 pnpm test`. La salida simula las variables de un build Vercel de producción únicamente para pruebas locales; se sirve bajo el origen canónico mediante interceptación y se simulan todos los proveedores. `tests/fixtures.ts` bloquea por defecto solicitudes externas antes de navegar. No se generan contactos, SMS ni conversiones reales.

Las pruebas del formulario interceptan las solicitudes: no envían contactos reales ni conversiones reales de Meta. Se conserva el endpoint de Google Apps Script y el cuerpo `URLSearchParams`, pero se usa CORS para leer su confirmación. El contrato del Apps Script facilitado es texto `ok`, devuelto después de guardar la fila en `Respuestas` y llamar a `MailApp.sendEmail`. Solo una respuesta HTTP correcta con ese texto confirma el envío y registra `Lead`; un HTTP 200 vacío, HTML de error o una respuesta opaca no bastan. El formulario bloquea envíos simultáneos y conserva los datos ante errores o un timeout de 15 segundos.

Validación autorizada del 22 de octubre de 2026: un único envío real, identificado como `SAPPHIRE-INTEGRATION-2026-10-22T20:11:51.156Z`, devolvió HTTP 200 y texto `ok` legible mediante CORS, sin sesión de Google y tras la redirección a `script.googleusercontent.com`. Se usó el build local servido mediante interceptación del navegador bajo el origen `https://www.sapphireblue.studio`, sin desplegar la web; las solicitudes a Meta y Google Analytics estuvieron bloqueadas. No se modificó ni desplegó Apps Script. No se inspeccionaron su configuración administrativa, la hoja ni la bandeja de correo: la confirmación se basa en su contrato, no en una comprobación directa de esos destinos.

Antes de publicar, el propietario debe confirmar que la versión desplegada corresponde al código facilitado, con ejecución como propietario y acceso público («Cualquier persona»). El POST no añade cabeceras personalizadas para evitar preflight. Si falla CORS, se muestra el error sin registrar `Lead`: no se degrada a `no-cors` ni se reintenta automáticamente, porque la fila podría haberse guardado aunque no se leyera la respuesta. El Apps Script actual no implementa idempotencia entre reintentos.

## Vercel

`vercel.json` configura Astro, la instalación con el lockfile de pnpm, `pnpm build` y la salida `dist/`. No necesita un adaptador de servidor.

El proyecto es `iamtenshis-projects/sapphire-blue-web`, del equipo `iamtenshi's projects` (plan Hobby). Está conectado al repositorio de GitHub `IamTenshi/sapphire-blue-web` con `main` como rama de producción, así que cada push a `main` genera un despliegue de producción. Los despliegues manuales se hacen con `vercel deploy` y `vercel deploy --prod` desde un directorio enlazado con `vercel link`.

### Observabilidad

- La configuración anterior documentaba Web Analytics y Speed Insights en Vercel; no se ha vuelto a inspeccionar ni modificado la cuenta durante este proyecto.
- Los componentes incondicionales se han retirado. Los SDK instalados solo se cargan después de autorizar analítica, en producción canónica, y con contexto de URL/referrer seguro. Los callbacks vuelven a comprobar el permiso y sanean las URLs.
- Los eventos personalizados siguen desactivados en `.env.example`; requieren confirmar por separado disponibilidad y coste del plan, además del permiso del visitante. No se ha contratado ni activado ningún servicio.

### Dominio

- Comprobación pública del 21 de octubre de 2026: `https://sapphireblue.studio/` termina en `https://www.sapphireblue.studio/` con HTTP 200. La portada devuelve el título actual; `/robots.txt`, `/sitemap.xml` y `/llms.txt` también responden HTTP 200.
- Las notas anteriores registraban DNS en Squarespace y verificaciones TXT pendientes por una asignación en otra cuenta de Vercel. La respuesta pública ya funciona, pero no acredita la titularidad ni el estado administrativo del proyecto: comprobarlo en el panel antes de cambiar DNS o dominios. No se han realizado cambios en esos servicios.

## Visibilidad en buscadores de IA

`src/data/seo.ts` centraliza la identidad y los datos estructurados. Los seis planes de su `OfferCatalog` y `/pricing.md` se generan desde `src/data/pricing.ts`. `/llms.txt` ofrece un índice opcional; no es un requisito de Google ni garantiza citas. Estos cambios no alteran el contenido visible de la portada. El diagnóstico, los límites y los pasos de Search Console y medición están en [`docs/ai-search.md`](docs/ai-search.md).

## SEO, accesibilidad y conversión

La ampliación en `feat/seo-geo-growth` conserva el diseño y el copy comercial. Añade FAQ sin duplicación de datos, navegación por teclado, estados accesibles de selección, alternativas sin JavaScript, una página 404 real y metadatos que no reutilizan el canonical de portada en otras rutas. Solo cambia el texto funcional del formulario para no afirmar una entrega que el navegador no puede verificar. El alcance, los límites y las siguientes oportunidades están en [`docs/seo-growth.md`](docs/seo-growth.md).

### Eventos de marketing

El gestor bloquea analítica y publicidad hasta una elección válida, versionada y con caducidad de 180 días. “Cookie settings” permite cambiarla; GPC veta publicidad sin conceder analítica. Desarrollo y previews no ejecutan seguimiento opcional. No existe respaldo Meta sin JavaScript.

Google se ejecuta en un iframe aislado sin acceso al formulario ni al URL principal y sin almacenamiento persistente de cliente. Meta utiliza solicitudes Pixel explícitas sin SDK automático, cookies, coincidencias avanzadas ni Conversion API. Es una decisión de minimización que reduce atribución; las pruebas verifican red simulada, no recepción por las cuentas. Revisar la arquitectura, limitaciones y procedimiento en [`docs/tracking-privacy.md`](docs/tracking-privacy.md).

`recordConfirmedLead(id)` solo se llama tras HTTP correcto y texto `ok`: `Lead` requiere publicidad vigente y `generate_lead` analítica vigente al confirmar. No hay conversiones por intentos, errores ni reproducción posterior al aceptar. Fallos de medición no alteran el formulario.

Por defecto, `document` emite `sapphire:marketing` con `{ name, properties }`, sin cookies, persistencia ni solicitudes adicionales. **Esto es instrumentación, no un panel de conversiones:** sin un receptor autorizado no se almacenan eventos. No se incluyen nombres, correos, teléfonos, mensajes ni parámetros de campaña en sus propiedades.

### Permisos comerciales y publicación

Email quincenal/comercial y SMS automatizados vía Brevo son programas previstos, **desactivados por separado**. Las casillas son opcionales, desmarcadas y bloqueadas con una explicación visible. No se transmite una autorización que el flujo actual no garantiza guardar. Un `ok` confirma la consulta según el contrato existente, no una suscripción.

No se ha modificado Apps Script, su endpoint ni los seis campos del POST. El contrato futuro preparado, las pruebas de persistencia y los requisitos para habilitar cada canal están en [`docs/contact-permissions.md`](docs/contact-permissions.md). La información del negocio y los límites operativos se documentan en [`docs/business-privacy.md`](docs/business-privacy.md).

No publicar sin autorización explícita, revisión del texto y cumplimiento de los requisitos externos pertinentes. No hacer push sin comprobar antes las automatizaciones del repositorio: incluso una rama puede crear un preview automáticamente. Este proyecto solo prepara commits locales y propuestas de PR.

## Compartir enlaces

- Dominio canónico: `https://www.sapphireblue.studio/`. `vercel.json` configura la redirección permanente del dominio sin `www` al dominio con `www`, conservando la ruta. Mantener el sitio sin protección de acceso para los rastreadores.
- En Vercel → proyecto → Settings → Domains, `www.sapphireblue.studio` debe servir Production (sin redirección al dominio sin `www`) y `sapphireblue.studio` debe redirigir permanentemente a `www.sapphireblue.studio`. La comprobación pública descrita arriba ya termina en `www`; revisar el panel antes de alterar esta configuración para evitar un bucle.
- `src/layouts/BaseLayout.astro` entrega Open Graph y tarjetas de X en el HTML, sin JavaScript. `public/social-preview-v2.jpg` es una imagen JPEG de 1200 × 630 y unos 88 KB. Se conserva `/og-image.png` para enlaces antiguos.
- `tests/sharing.spec.ts` comprueba el HTML y la imagen localmente con los agentes de WhatsApp, Facebook, X, LinkedIn, Telegram, Slack y Discord. No sustituye las pruebas reales en esas plataformas ni comprueba sus cachés o el firewall de producción.
- Después de desplegar, verificar que la nueva imagen devuelve HTTP 200 con `Content-Type: image/jpeg`, sin redirecciones, y probar el enlace en cada plataforma. Solicitar una nueva lectura en [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) y [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/). WhatsApp y otras aplicaciones pueden conservar vistas antiguas; los mensajes ya enviados no necesariamente se actualizan.
- Cada plataforma decide si muestra tarjeta, tamaño y recorte. Instagram, SMS y muchos clientes de correo no generan vistas previas Open Graph en todos sus formatos. En publicaciones o correos que necesiten una imagen garantizada, adjuntar el JPEG como imagen y añadir el enlace por separado.
- Al renovar el diseño, usar otro nombre de archivo y actualizar sus referencias para evitar reutilizar una imagen en caché.
