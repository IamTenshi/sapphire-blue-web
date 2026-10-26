# Privacidad, seguimiento y permisos: entrega técnica

## Alcance y ramas locales

Base inspeccionada: `24bba3d` en `main`, árbol inicialmente limpio, sin instrucciones AGENTS aplicables. No se modificó Apps Script, cuentas, campañas ni configuración global. No hubo contactos, SMS ni conversiones reales. No se hizo push ni despliegue.

| Responsable | Rama | Entrega identificable | Resultado / límites |
| --- | --- | --- | --- |
| Negocio y legales | `feat/privacy-legal` | `27eac57` | Configuración central, legales EN, conservación prevista, proveedores activos/opcionales/previstos; check/build y pruebas de la rama documentados en `business-privacy.md`. |
| Formulario y enlaces | `feat/privacy-form` | `cb29066` | Permisos independientes bloqueados, POST intacto, contrato futuro; cuatro casos puros aprobados, browser/check/build de la rama incompletos por dependencia de integración/entorno. No se cuentan como verificación del conjunto. |
| Seguimiento, coordinación e integración | `feat/privacy-integration` | `4d39da9`, corrección `64e43cd` | Preferencias, aislamiento y minimización, pruebas de red y visuales, revisión e integración. |

Integración en orden: legales (`d251c8c`), formulario (`2db2e8e`), seguimiento (`4d39da9`), correcciones (`64e43cd`). No hubo escritores concurrentes sobre un worktree ni archivos compartidos sin responsable. Las dos ramas auxiliares permanecen locales.

`987b00a` endurece únicamente el harness de pruebas y añade regresiones de referrer/URL sensible. La comprobación final del conjunto se ejecutó sobre ese commit; el código de aplicación sigue siendo el revisado en `64e43cd`.

Se recomienda **una PR atómica** de la rama integrada: publicar legales sin sus controles, o controles sin el formulario adaptado, sería incoherente. Las ramas de responsables sirven como evidencia separada, no como despliegues autónomos.

## Implementado y desactivado

- `/privacy` — **Privacy & Cookies** y `/sms-terms` — **SMS Terms**, en inglés, con identidad real y contacto centralizados, sin dirección inventada.
- Gestor accesible con aceptar/rechazar/configurar, versión 2, 180 días, dos categorías independientes, GPC y comportamiento cerrado ante error. Controles disponibles también en 404; sin JavaScript no hay seguimiento opcional.
- La entrega inicial aislaba Google y enviaba Meta manualmente. La revisión del 26 de octubre restaura los SDK oficiales después del consentimiento y requiere una nueva elección (versión 2). Vercel sigue condicionado a contextos seguros. Ver `tracking-privacy.md`; ya no se afirma aislamiento del formulario ni ausencia de identificadores persistentes.
- Conversiones solo después de HTTP correcto + texto `ok`, con autorización vigente por categoría y sin reproducción posterior. El formulario sigue usando exactamente sus seis campos y endpoint originales.
- Email comercial/quincenal y SMS automatizado: **ambos desactivados**, con bloqueos distintos y explicaciones visibles. No existe confirmación ficticia de suscripción ni persistencia de permisos comerciales implementada.
- Eventos personalizados Vercel: ejemplo de configuración desactivado; habilitación del plan/variable externa no acreditada ni modificada. En pruebas locales se habilita únicamente la simulación para ejercer el control de categoría.

## Revisión independiente y regresiones

Un revisor que no implementó los cambios revisó `24bba3d..4d39da9` en solo lectura y reprodujo en memoria dos fallos: retirada no persistible que podía reactivarse al navegar y bloqueo que impedía guardar al recuperarse el almacenamiento. También detectó referencias visuales ausentes de ese primer commit. `64e43cd` añade protecciones de denegación entre rutas, separa lectura persistida de autorización efectiva, incorpora pruebas de recuperación con/sin almacenamiento alternativo e incluye las referencias nuevas.

**Segunda revisión independiente de `64e43cd`: los tres hallazgos quedan cerrados, sin nuevos bloqueos detectados en el alcance revisado.** El revisor ejecutó en memoria 16 combinaciones de almacenamiento, elecciones y GPC, navegación sin almacenamiento alternativo, recuperación y fallos de limpieza de salvaguardas. No realizó llamadas externas, escrituras ni tests de navegador. El renderizado real de 404 y las pruebas completas se verificaron por separado en la integración; no se atribuyen al revisor.

Las capturas históricas `original-*` y `configured-plans-*` permanecen intactas. Las nuevas `privacy-*` muestran intencionalmente formulario/footer/banner/dialog. Los planes configurados conservan comparación exacta contra las referencias anteriores. La inspección comparada de las imágenes anteriores/nuevas verificó las secciones comerciales sin rediseño; se observan pequeñas diferencias de rasterización/sombras móviles además de los cambios previstos del contacto/footer. No se elevó la tolerancia de los tests.

Durante la integración se corrigieron los títulos legales exactos, las instrucciones SMS que podían parecer activas, canonicals con barra final y la superposición del banner sobre el footer en páginas cortas.

## Requisitos del responsable humano

La web puede mantenerse con ambos canales comerciales desactivados. **No hay que habilitar Brevo para publicar las páginas informativas**, pero cualquier activación de un canal requiere un trabajo posterior separado y autorizado:

1. **Persistencia:** implementar/revisar el receptor, comprobar filas duraderas reales en Sheets, timestamp fiable, versión/texto, origen, elección independiente por canal y bajas. Un `ok`, correo de aviso o parámetro recibido no demuestra permiso guardado. Ver procedimiento y propuesta de campos en `contact-permissions.md`.
2. **Email:** dirección postal válida en Brevo y comunicaciones comerciales; identidad/remitente, traslado verificado de preferencias, bajas y supresión probadas. Habilitar solo email no habilita SMS.
3. **SMS:** registro/aprobación del remitente estadounidense para la ruta admitida por Brevo; identificación, número real, ayuda y STOP operativos y verificados; actualización de términos al programa real. Habilitar solo SMS no habilita email.
4. **Asor:** atención manual de solicitudes/bajas, controles de acceso, revisión de conservación, eliminación documentada y tratamiento mínimo separado de supresiones. No existe un borrado programado que sustituya estas tareas.
5. **Proveedores:** comprobar contratos/configuraciones, cuentas de medición y sus límites. Las simulaciones no acreditan recepción de eventos, atribución, funcionamiento de Brevo, almacenamiento en Sheets ni garantías de transferencias.

## Antes de autorizar publicación

- [ ] Revisión humana de identidad, contenido, proveedores reales, accesos y funcionamiento operativo descrito.
- [ ] Revisión legal contextual de obligaciones en República Dominicana/Estados Unidos, conservación fiscal, accesos internacionales, datos de contacto/dirección que deban publicarse, cookies/seguimiento, email y reglas de SMS. No se declara cumplimiento legal universal.
- [ ] Revisar los SDK oficiales autorizados el 26 de octubre, cookies/identificadores y configuración externa automática. Comprobar recepción y atribución por separado: los mocks no las acreditan.
- [ ] Confirmar variables y automatizaciones del repositorio/proyecto Vercel antes de cualquier push. La documentación existente identifica `main` como producción, pero no se inspeccionó administrativamente la integración y puede haber previews automáticos para otras ramas.
- [ ] Revisar y aprobar la PR completa, conservar los dos canales comerciales desactivados y dar autorización explícita para publicar.

`gh` no está instalado; el remoto configurado es `https://github.com/asorgarcia/sapphire-blue-web.git`. No se intentó crear PRs mediante credenciales alternativas ni hacer push para probar permisos.

## PR propuesta

**Título:** `Privacy notices, consent-gated measurement and independent marketing permissions`

**Base:** `main` · **Head local:** `feat/privacy-integration`

**Descripción:**

> Adds English Privacy & Cookies / SMS Terms pages and centralized business facts. Blocks official Google/Meta SDKs until valid independent version-2 preferences, honors GPC, removes Meta noscript and supports withdrawal. Restores browser identifiers and allowlisted attribution parameters after consent; no explicit form fields are sent to measurement. Provider automatic settings require external review. Keeps the inquiry POST and Apps Script unchanged. Email/SMS enrollment stays independently disabled until verified persistence and operational approval. Includes mocked network/form tests, legal/404/keyboard coverage, preserved historic visual references and explicit external launch gates.
>
> No push, deployment, account changes or real contacts/SMS/conversions were performed. Do not deploy the component branches independently. Provider ingestion and external consent persistence are not established by local mocks. See `docs/privacy-release.md`, `docs/tracking-privacy.md`, `docs/contact-permissions.md` and `docs/business-privacy.md` for evidence and release conditions.

Incluir los resultados finales de validación indicados abajo en la PR al crearla, solo tras autorización y verificación del flujo de despliegue.

## Validación anterior del conjunto integrado (arquitectura aislada)

Ejecutada el **25 de octubre de 2026**, sobre `987b00a` (después solo se completa documentación):

| Verificación | Resultado real |
| --- | --- |
| `pnpm check` | **0 errores, 0 warnings, 0 hints**, 47 archivos. |
| `LD_LIBRARY_PATH=/tmp/opencode/chromium-libs/usr/lib/x86_64-linux-gnu pnpm test --workers=4` | **114 aprobadas**, sin omitir tests ni comparaciones visuales y sin actualizar referencias durante esta ejecución final. Incluye red, permisos, formulario, redirect CORS local, no-JS, GPC, expiración, almacenamiento, retiradas, ausencia de replay/duplicados, rutas, teclado, responsive y SEO/sharing existentes. |
| `pnpm build` | **Correcto**, cinco páginas HTML incluidas las cuatro rutas de contenido/error y el documento interno inerte de medición. |
| Builds separados `VERCEL=1 VERCEL_ENV=preview pnpm build`, `VERCEL=1 VERCEL_ENV=production pnpm build` y build local | **Correctos**. Inspección de las cuatro páginas: flags falsos en local/preview, verdaderos en producción; preview `noindex`; sin tags iniciales Google/Meta ni imagen noscript. Frame con flag correspondiente. |
| Servidor de desarrollo real en `127.0.0.1:4389`, iniciado con `--ignore-lock` | **Correcto**: HTML principal con seguimiento desactivado y documento de medición inerte. Se cerró únicamente el servidor temporal propio, sin tocar el dev server existente. |
| Segunda revisión independiente | **Sin nuevos bloqueos en `64e43cd`**, con tres hallazgos anteriores cerrados; alcance y límites detallados arriba. |

La primera ejecución de Playwright falló al iniciar Chromium por ausencia de `libnspr4.so` en el loader path. Reutilizar las bibliotecas temporales ya presentes solucionó el entorno, sin instalación global. Ejecuciones intermedias detectaron selectores/títulos de tests inestables y una carrera del mirror de pruebas durante reload: se corrigieron y se repitió la suite completa. Una primera sonda de desarrollo no arrancó por el lock del servidor existente; la comprobación posterior con `--ignore-lock` sí validó ambos flags. Ninguna de esas ejecuciones fallidas se contabiliza como aprobada.

Las nuevas referencias visuales se generaron con `--update-snapshots=missing`, sin reemplazar archivos históricos, se inspeccionaron y después se comprobaron en ejecuciones sin actualización. La validación final no acredita ingestión real por Google/Meta/Vercel ni persistencia en Sheets/Brevo; todos esos destinos se interceptaron. Las solicitudes inesperadas que escapen de los mocks abortan y hacen fallar el harness.

## Revisión de medición — 26 de octubre de 2026

El propietario autorizó recuperar medición convencional con los SDK oficiales,
condicionada al consentimiento. Se retiraron el iframe y el transporte manual de
Meta. Se mantienen categorías independientes, GPC, retirada, bloqueo en previews,
conversiones solo tras `ok` y ausencia de reproducción posterior. La versión 2
invalida elecciones de la arquitectura anterior. Los SDK pueden usar identificadores
persistentes y parámetros aprobados de campaña; no se afirma aislamiento del DOM.
Se actualizaron el aviso público y las instrucciones de revisión externa.

El harness ahora sirve los archivos del build directamente al interceptar el
origen canónico: una recarga por retirada podía sobrevivir al contexto HTTP de
Playwright y producir fallos de teardown. Se verificaron ocho ejecuciones repetidas
de los casos de retirada/GPC sin ese fallo. No se ocultaron errores con
`ignoreErrors`, no se actualizaron capturas y no se habilitaron conexiones reales.

La recepción de eventos, atribución y configuración automática de las cuentas
siguen pendientes de verificación externa. No se han modificado Apps Script,
cuentas, campañas, canales comerciales ni alojamiento; no se ha hecho push ni deploy.

Validación final de esta revisión: `pnpm check` con cero errores, advertencias e
indicaciones (45 archivos), y `LD_LIBRARY_PATH=/tmp/opencode/chromium-libs/usr/lib/x86_64-linux-gnu pnpm test --workers=4 --reporter=dot`
con **118 pruebas aprobadas**, incluido build estático nuevo y todas las comparaciones
visuales sin actualizar referencias. La primera ejecución no pudo iniciar Chromium
por bibliotecas ausentes; se extrajeron tres paquetes únicamente en `/tmp/opencode`
para ejecutar las pruebas, sin instalación global ni dependencias nuevas del proyecto.
