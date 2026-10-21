# Visibilidad de Sapphire Blue en buscadores de IA

## Alcance acordado

- Mercado principal: pequeños negocios de Estados Unidos; contenido en inglés.
- Sin cambios en el diseño, texto visible, navegación o funcionalidades.
- No se inventan dirección, fundador, premios, reseñas, clientes ni resultados.
- El objetivo inicial es identificar correctamente la marca, no prometer recomendaciones ni posiciones.

## Diagnóstico inicial — 21 de octubre de 2026

- La captura del usuario muestra una respuesta de Google AI Overview para “sapphire blue studio” con negocios de nombres similares, sin identificar esta marca.
- Las solicitudes públicas con User-Agent de Googlebot, OAI-SearchBot, PerplexityBot y Claude-SearchBot devolvieron HTTP 200 y HTML con contenido. Esto no verifica el acceso desde las IP reales de esos rastreadores ni sus visitas en logs.
- `robots.txt` permite el rastreo; el sitemap contiene la portada canónica con `www`.
- Una búsqueda pública `site:sapphireblue.studio` no devolvió resultados en la herramienta utilizada. No demuestra que Google no tenga URLs indexadas: comprobarlo en Search Console.
- La identidad ya figuraba en metadatos y JSON-LD, pero no hay una presentación visible de la empresa ni página About. Se mantiene esa limitación por petición del usuario.

## Mejoras implementadas

- Título y descripciones coherentes: Sapphire Blue Studio, categoría y público objetivo.
- Entidades `WebSite`, `Organization` y `WebPage` relacionadas mediante IDs estables; dominio, contacto y perfiles existentes coherentes.
- `Organization` sustituye al subtipo local `ProfessionalService`: no se ha facilitado una dirección física. `areaServed` indica el mercado objetivo, no una sede.
- `OfferCatalog` con los seis planes recurrentes, precios en USD y unidad mensual, generado desde `src/data/pricing.ts`, la misma fuente que las tarjetas y calculadora.
- Se conserva el FAQ existente. Ni `FAQPage` ni las ofertas garantizan resultados enriquecidos o menciones en IA; esta agencia no debe esperar resultados FAQ reservados por Google a determinados sitios de salud y gobierno.
- `/llms.txt` y `/pricing.md` son referencias opcionales. Los precios y prestaciones de los planes se generan en el build, no se mantienen en un segundo catálogo manual. Los extras y condiciones deben revisarse si cambia la política comercial.
- Los archivos auxiliares no sustituyen la portada ni se añaden al sitemap como páginas comerciales independientes.

## Después de desplegar

1. En Google Search Console, inspeccionar `https://www.sapphireblue.studio/`: comprobar indexación, canonical elegido, HTML rastreado y ausencia de `noindex`. Solicitar indexación tras publicar los cambios y enviar `/sitemap.xml`. No hay acceso a Search Console desde este entorno.
2. Hacer lo mismo en Bing Webmaster Tools: sus resultados también pueden alimentar experiencias de búsqueda de IA. No se ha enviado ninguna URL automáticamente.
3. Comprobar el HTML público y `/llms.txt`, `/pricing.md`, `/robots.txt` y `/sitemap.xml`. Revisar logs/WAF para identificar bloqueos de rastreadores reales; los User-Agent se pueden falsificar.
4. Revisar en Facebook e Instagram que nombre, web y descripción sean consistentes. Confirmar que los perfiles enlazados pertenecen a la empresa antes de ampliar `sameAs`. No se han modificado cuentas externas.
5. Conseguir referencias independientes legítimas: perfiles profesionales, menciones de clientes con permiso y casos reales. No comprar reseñas ni crear premios o directorios supuestamente independientes.

Descripción sugerida para perfiles, sujeta a confirmación del propietario:

> Sapphire Blue Studio is a marketing studio serving small businesses in the United States with website design, social media management and email marketing. Official website: https://www.sapphireblue.studio/.

## Medición

Antes y después de la publicación, registrar fecha, plataforma, idioma/región, respuesta, mención correcta, enlace citado y negocios confundidos. Probar cada consulta 3–5 veces por plataforma, no sacar conclusiones de una sola respuesta. Revisar quincenalmente al principio; las respuestas son variables y no existe un plazo garantizado.

Consultas iniciales:

- `Sapphire Blue Studio`
- `What is Sapphire Blue Studio at sapphireblue.studio?`
- `What services does Sapphire Blue Studio offer?`
- `Sapphire Blue Studio social media pricing`
- `Sapphire Blue Studio email marketing pricing`
- `Does Sapphire Blue Studio include hosting in website design?`
- `Does Sapphire Blue Studio's ads management fee include ad spend?`
- `Social media and email marketing plans for US small businesses`

Medir separadamente ser mencionado, ser citado y ser recomendado. En Google Search Console se observa el tráfico web agregado, no un informe específico de AI Overviews/AI Mode. Una subida de búsquedas de marca tampoco prueba por sí sola atribución a IA.

## Límites y fuentes

Google declara que no hay archivos, marcado ni optimizaciones especiales necesarios para sus funciones de IA: la página debe estar indexada y ser apta para mostrar un snippet. `llms.txt` es experimental y no es un factor de posicionamiento confirmado ni hay garantía de que los asistentes lo consulten.

- Google: https://developers.google.com/search/docs/appearance/ai-features
- Organización: https://developers.google.com/search/docs/appearance/structured-data/organization
- Solicitar rastreo: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
- Propuesta llms.txt: https://llmstxt.org/

La siguiente mejora de contenido recomendada, si se autoriza más adelante, es una presentación visible y verificable de la empresa y su equipo. Los metadatos por sí solos no sustituyen esas señales ni la reputación externa.
