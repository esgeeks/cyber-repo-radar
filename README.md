# CYBER REPO RADAR

Radar web público para descubrir **repositorios recientes de GitHub sobre ciberseguridad**: pentesting, OSINT, threat intelligence, análisis de malware, ingeniería inversa, forense digital, blue team, red team, bug bounty, seguridad cloud, seguridad web y seguridad de IA.

- **Datos reales**: todo sale de la [GitHub REST Search API](https://docs.github.com/rest/search/search#search-repositories). No se inventan repositorios, métricas ni fechas, y no se hace scraping de HTML.
- **Sitio estático**: React + TypeScript + Tailwind CSS. Sin backend, sin base de datos y sin login.
- **Actualización automática** cada ~3 horas con GitHub Actions, y despliegue en GitHub Pages.
- **Bilingüe con URLs propias**: inglés en `/` y español en `/es/`, cada una con su título, descripción y `hreflang`. Quien tiene el navegador en español entra directo a `/es/`.
- **Carga rápida**: primero se descargan solo los últimos 7 días (`recent.json`, ~150 KB comprimido) y el dataset completo llega en segundo plano.
- **Traducción gratuita** de descripciones al español con la API integrada de Chrome (en el dispositivo, sin costo ni claves).
- **Privacidad**: sin cookies propias ni analítica. Los favoritos se guardan en `localStorage`.

> ⚠️ **Cobertura no exhaustiva.** El radar ejecuta un conjunto fijo de búsquedas (`config/queries.json`). GitHub devuelve como máximo 1000 resultados por búsqueda, los resultados varían entre ejecuciones y pueden quedar fuera repositorios sin topics o descripciones relevantes. La clasificación es automática y puede equivocarse.

> 🛡️ **Seguridad.** El pipeline solo lee **metadatos** públicos. **Nunca clona, descarga, instala ni ejecuta** código de los repositorios descubiertos. Listar un repositorio no significa respaldarlo.

---

## Índice

1. [Funcionalidades](#funcionalidades)
2. [Arquitectura](#arquitectura)
3. [Instalación y desarrollo](#instalación-y-desarrollo)
4. [Pruebas](#pruebas)
5. [Datos: búsquedas, clasificación y calidad](#datos-búsquedas-clasificación-y-calidad)
6. [Despliegue en GitHub Pages con `radar.esgeeks.com`](#despliegue-en-github-pages-con-radaresgeekscom)
7. [Despliegue alternativo por FTP (opcional)](#despliegue-alternativo-por-ftp-opcional)
8. [Publicidad (AdSense)](#publicidad-adsense)
9. [Analítica de visitas](#analítica-de-visitas)
10. [Reseñas de EsGeeks](#reseñas-de-esgeeks)
11. [Límites de la API y manejo de errores](#límites-de-la-api-y-manejo-de-errores)
12. [Mantenimiento](#mantenimiento)

---

## Funcionalidades

| Funcionalidad | Detalle |
|---|---|
| Pestañas | **Nuevos 24h**, **Últimos 7 días**, **Últimos 30 días** (por fecha de creación); **Populares** (más estrellas entre los creados en los últimos 90 días, mínimo 5 ★); **Actualizados recientemente** (push en los últimos 7 días, sin importar cuándo se crearon); **Favoritos** |
| Filtros | Categoría, lenguaje, estrellas mínimas, fecha (de creación o de última actividad) y orden |
| Búsqueda | Por nombre, propietario, descripción y topics; ignora acentos y mayúsculas. Atajo: tecla `/` |
| Tarjetas | Nombre, propietario, descripción, lenguaje, ★, forks, topics, categorías, fecha de creación y último push, por separado |
| Detalle | Todos los campos, más licencia, issues abiertos, *metadata updated*, *first seen* y la fecha de las métricas |
| Fechas | **Creado**: cuándo se creó en GitHub. **Último push**: actividad real. **Metadatos actualizados**: cambios de estrellas, descripción, etc. **Detectado**: cuándo lo vio el radar por primera vez |
| Sincronización | Indicador de la última sincronización; avisos de datos desactualizados (>6 h y >24 h) y de sincronización parcial |
| Estados | Carga (skeleton), error con reintento, resultados vacíos con sugerencias |
| Advertencias | Insignia **PoC / exploit** y aviso de seguridad permanente |
| URLs compartibles | Los filtros y la vista de detalle viven en el hash: `#/repo/owner/name?tab=popular&cat=osint` |
| Accesibilidad | Pestañas con teclado, `<dialog>` nativo para el detalle, foco visible, etiquetas ARIA, `prefers-reduced-motion` |
| Modo demo | `#/?demo=1` carga un dataset **ficticio**, con una franja visible y los enlaces desactivados |
| Idiomas | `/` en inglés y `/es/` en español, con `hreflang` y sitemap con alternativas. El selector EN/ES cambia de URL y conserva los filtros |
| Traducción | En la interfaz en español y en Chrome 138+, el botón **Traducir descripciones** traduce en el propio dispositivo (gratis y privado). En otros navegadores se muestra el texto original |

## Arquitectura

```
config/
  queries.json        ← búsquedas de la Search API (edítalas como tus "dorks")
  categories.json     ← reglas de clasificación (topics y palabras clave)
  blocklist.json      ← filtros anti-spam (propietarios, repos, patrones)
  reviews.json        ← reseñas de EsGeeks (insignia + enlace)
scripts/
  fetch-repos.ts      ← pipeline: API → normalizar → deduplicar → filtrar → clasificar → JSON
  lib/github.ts       ← cliente de la Search API con manejo de 403/429/5xx/red
  make-demo.ts        ← genera public/data/demo.json (ficticio)
  seo-files.ts        ← genera robots.txt y sitemap.xml después del build
src/
  lib/                ← lógica pura compartida (normalize, classify, quality, filters, pipeline…)
  components/         ← interfaz (RepoCard, RepoDetail, FilterPanel, Tabs…)
  hooks/              ← estado en la URL, favoritos, carga del dataset
  i18n/               ← textos en inglés (original) y español
es/index.html         ← página en español (título, descripción y canonical propios)
public/data/
  demo.json           ← dataset ficticio (versionado)
  repos.json          ← dataset real completo (lo genera Actions; NO se versiona)
  recent.json         ← últimos 7 días, para la primera carga (lo genera Actions; NO se versiona)
.github/workflows/
  update-and-deploy.yml  ← cada 3 h: test → fetch → build → GitHub Pages (+ FTP opcional)
  ci.yml                 ← tests + build en PRs y ramas
```

**Flujo de datos:**

```
GitHub Actions (cron cada 3 h, GITHUB_TOKEN)
   └─ scripts/fetch-repos.ts
        ├─ ~39 búsquedas de la Search API (≈55 peticiones, con pausas de 2,2 s)
        ├─ normaliza, deduplica por id, filtra spam y clasifica
        ├─ conserva "firstSeen" leyendo el repos.json publicado actualmente
        └─ escribe public/data/repos.json
   └─ vite build → dist/ → GitHub Pages
Navegador → descarga data/repos.json (estático) → filtra y ordena en el cliente
```

El token **solo existe dentro de GitHub Actions**. El navegador nunca habla con la API de GitHub: solo descarga un JSON estático.

## Instalación y desarrollo

Requisitos: **Node.js 22** o superior y npm.

```bash
npm ci
```

```bash
npm run dev
```

Si todavía no generaste datos reales, en desarrollo se carga automáticamente el **dataset ficticio**, con su franja de aviso.

Para generar datos reales en local: sin token, la API permite 10 búsquedas por minuto y la sincronización completa tarda ~6 min.

```bash
npm run fetch-data
```

Con un token personal de solo lectura es más rápido. Nunca lo subas al repositorio:

```bash
GITHUB_TOKEN=tu_token npm run fetch-data
```

Para probar rápido con solo las primeras búsquedas:

```bash
MAX_QUERIES=3 npm run fetch-data
```

Build de producción y vista previa:

```bash
npm run build
```

```bash
npm run preview
```

Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm run typecheck` | Comprobación de tipos con TypeScript |
| `npm run make-demo` | Regenera `public/data/demo.json` |
| `npm run test:watch` | Pruebas en modo watch |

## Pruebas

```bash
npm test
```

Cubren con Vitest:

- **Normalización**: limpieza de texto (caracteres de control y bidi), topics, licencias, URLs construidas solo hacia `github.com` y fechas.
- **Clasificación**: pesos (topic > nombre > descripción), varias categorías por repo, descarte de irrelevantes, detección de PoC y de seguridad de IA.
- **Calidad**: forks, archivados, spam y listas de bloqueo, sin falsos positivos en herramientas legítimas.
- **Filtros y orden**: pestañas, categoría, lenguaje, estrellas, fecha de creación frente a última actividad, búsqueda y todos los órdenes.
- **Pipeline**: deduplicación, conservación de `firstSeen`, retención temporal, reseñas y límite de tamaño.
- **Consultas**: expansión de fechas, validación del archivo y presupuesto de peticiones.
- **Cliente de la API**: `Retry-After`, `X-RateLimit-Reset`, backoff en 403 secundarios, errores 5xx y de red, 422 sin reintento.
- **URL, i18n y demo**: ida y vuelta del estado en la URL, detección de idioma, mismas claves en EN/ES y dataset demo identificable como ficticio.

## Datos: búsquedas, clasificación y calidad

### Búsquedas (`config/queries.json`)

Cada entrada es una búsqueda de la Search API con la [sintaxis de GitHub](https://docs.github.com/search-github/searching-on-github/searching-for-repositories). Equivalencias con búsquedas tipo Google:

| Google | GitHub Search API |
|---|---|
| `site:github.com` | (implícito: solo devuelve repositorios) |
| `after:2026-10-01` | `created:>=2026-10-01` o `pushed:>=2026-10-01` |
| `"autonomous pentest"` | `"autonomous pentest" in:name,description,readme` |
| `A OR B` | `A OR B` (máximo 5 operadores) |
| — | `topic:osint`, `stars:>=20`, `language:go`, `fork:false` |

Marcadores de fecha relativos: `{{created:30}}` → `created:>=<hace 30 días>` y `{{pushed:3}}` → `pushed:>=<hace 3 días>`.

```json
{ "id": "mi-busqueda", "category": "ai-security", "q": "\"computer use\" pentest in:name,description,readme {{created:60}}", "sort": "stars", "pages": 1, "trust": true }
```

- `pages`: entre 1 y 10, con 100 resultados por página. Mantén el total por debajo de ~80 peticiones; una prueba lo verifica.
- `trust: true`: permite que coincidencias solo en el README cuenten para la categoría.

### Clasificación (`config/categories.json`)

| Señal | Peso |
|---|---|
| Topic exacto | 3 |
| Palabra clave en el nombre | 2 |
| Palabra clave en la descripción | 1 |
| Categoría de la búsqueda que lo encontró | 1 (2 si `trust`) |

Un repo entra en cada categoría que sume **≥ 2**. Si no entra en ninguna, se descarta por irrelevante. "Cybersecurity" es la categoría genérica y va al final.

### Calidad (`config/blocklist.json`)

Se descartan forks, archivados, deshabilitados, repos sin descripción ni topics, propietarios o repos bloqueados y patrones típicos de spam (generadores de robux, cheats, *stealers*, cracks…). Para ocultar un repo malicioso, agrega `"owner/repo"` a `repos` o el usuario a `owners`.

## Despliegue en GitHub Pages con `radar.esgeeks.com`

> Nada de esto se hace automáticamente desde este repositorio. Son pasos que haces tú en GitHub y en cPanel.

1. **Pages**: *Settings → Pages → Build and deployment → Source: GitHub Actions* (ya lo activaste).
2. **Fusionar a `main`**: el workflow de despliegue se ejecuta con cada push a `main`, cada 3 horas (`cron`) y manualmente desde *Actions → Update data & deploy → Run workflow*. Los `cron` de GitHub solo corren en la rama por defecto.
3. **DNS en cPanel (BanaHosting)**: tus nameservers apuntan a BanaHosting, así que el DNS se edita en **cPanel → Zone Editor** (no en Namecheap). Agrega un registro:

   | Tipo | Nombre | Destino |
   |---|---|---|
   | `CNAME` | `radar` | `esgeeks.github.io` |

   No afecta a `esgeeks.com`, al correo ni a WordPress: solo crea el subdominio `radar`. Si ya existe un subdominio `radar` creado en cPanel, elimínalo antes para evitar conflictos.
4. **Dominio personalizado**: *Settings → Pages → Custom domain* → `radar.esgeeks.com` → *Save*. Cuando el DNS propague (de minutos a unas horas), activa **Enforce HTTPS**. GitHub emite el certificado automáticamente.
5. **Recomendado, contra el secuestro de subdominios**: verifica el dominio en *GitHub → Settings (de tu cuenta u organización) → Pages → Add a domain*. GitHub te dará un registro `TXT` para agregar en el Zone Editor.
6. **Variable `SITE_URL`**: *Settings → Secrets and variables → Actions → Variables → New variable* → `SITE_URL` = `https://radar.esgeeks.com`. Se usa para la URL canónica, Open Graph, el sitemap y para leer el dataset anterior (historial `firstSeen`).

Con el dominio personalizado activo, `esgeeks.github.io/cyber-repo-radar/` redirige automáticamente a `radar.esgeeks.com`, así que no hay contenido duplicado.

El build usa rutas relativas (`base: './'`) y enrutado por hash, así que el mismo build funciona en la raíz de un dominio, en un subdominio o en una subcarpeta.

## Despliegue alternativo por FTP (opcional)

Si algún día prefieres servirlo desde tu hosting compartido (por ejemplo `esgeeks.com/radar/`), el workflow ya incluye un paso opcional por **FTPS** que solo se activa si existe el secreto `FTP_HOST`:

1. En cPanel, crea una **cuenta FTP limitada** a la carpeta del radar (por ejemplo `public_html/radar`). Así, aunque se filtrara la clave, nadie podría tocar tu WordPress.
2. En *Settings → Secrets and variables → Actions → Secrets*, crea `FTP_HOST`, `FTP_USER` y `FTP_PASSWORD`. Opcionalmente crea la variable `FTP_REMOTE_DIR`, que por defecto es `/`, la raíz de esa cuenta.
3. Ajusta la variable `SITE_URL` a la nueva URL.

El paso usa `mirror --delete`: **borra en el destino lo que no esté en el build**. Por eso es imprescindible que la cuenta FTP esté limitada a su carpeta.

## Publicidad (AdSense)

Los espacios publicitarios están preparados pero **apagados**: no se muestra nada mientras no configures tu ID.

1. Variables de Actions: `ADSENSE_CLIENT` (`ca-pub-…`), `ADSENSE_SLOT_TOP` y `ADSENSE_SLOT_FEED` (IDs de bloque).
2. Con AdSense activo, el build **no** incluye la Content-Security-Policy estricta, porque AdSense carga código de muchos dominios de Google.
3. `ads.txt`: en un subdominio, AdSense lo busca en el dominio raíz (`esgeeks.com/ads.txt`), que ya tienes.
4. Para visitantes del EEE y Reino Unido, Google exige un CMP certificado; actívalo desde AdSense (*Privacidad y mensajes*).
5. Actualiza la política de privacidad (`src/i18n/*.ts → privacy`).

## Analítica de visitas

El sitio trae soporte para **Cloudflare Web Analytics**, que es gratis y **no usa cookies**, así que no necesita banner de consentimiento. Está apagado hasta que pongas tu token.

1. Crea una cuenta gratis en Cloudflare. No hace falta mover el DNS a Cloudflare.
2. Ve a *Analytics & Logs → Web Analytics → Add a site*, escribe `radar.esgeeks.com` y elige la opción **manual (JS snippet)**.
3. Del código que te muestra, copia solo el valor de `"token"`: 32 caracteres hexadecimales.
4. En GitHub: *Settings → Secrets and variables → Actions → Variables → New repository variable* → `CF_ANALYTICS_TOKEN` = ese token.
5. Ejecuta *Actions → Update data & deploy → Run workflow*, o espera la siguiente ejecución.

Al activarlo, el build agrega el script en `/` y `/es/`, ajusta la Content-Security-Policy y suma un párrafo a la política de privacidad.

Complementos recomendados: **Google Search Console** (verifica `radar.esgeeks.com` con un registro `TXT` en el Zone Editor y envía `sitemap.xml`) para ver búsquedas, clics e indexación.

Si prefieres **Google Analytics 4**, ten en cuenta que usa cookies: para visitantes de Europa y Reino Unido necesitas el banner de consentimiento, igual que con AdSense.

## Reseñas de EsGeeks

Cuando publiques una reseña en tu blog, agrégala en `config/reviews.json`:

```json
"reviews": {
  "owner/repo": { "url": "https://www.esgeeks.com/tu-articulo/", "title": "Título del artículo" }
}
```

En la siguiente sincronización, el repo mostrará la insignia **"Reviewed on EsGeeks"** y un botón a tu artículo. Solo se aceptan URLs `https` en los hosts de `allowedHosts`.

## Límites de la API y manejo de errores

| Situación | Comportamiento |
|---|---|
| Ritmo | Una petición cada 2,2 s con token (límite de 30 por minuto) y cada 6,5 s sin token |
| `403` / `429` | Respeta `Retry-After` y `X-RateLimit-Reset`; si no hay cabeceras, backoff de 15 s, 30 s, 60 s… (máx. 4 reintentos, espera máx. 90 s) |
| `5xx` y errores de red | Backoff exponencial, con un máximo de 4 reintentos |
| `422` (consulta inválida) | Se registra y se omite esa búsqueda |
| Más del 50 % de búsquedas fallidas | El job falla **sin publicar**: sigue en línea la última versión buena |
| Algunas búsquedas fallidas | Se publica con `partial: true` y la interfaz muestra un aviso |
| Repos que no aparecen en una ejecución | Se conservan hasta 72 h con sus métricas a fecha de `lastSeen` |
| Datos viejos (fallo del cron) | Aviso amarillo después de 6 h y rojo después de 24 h |
| Tamaño | Máximo 2500 repos en el dataset |

## Mantenimiento

- **Cron inactivo**: GitHub desactiva los workflows programados de repos públicos tras **60 días sin actividad** en el repositorio. Si pasa, reactívalo en *Actions*, o haz cualquier commit (por ejemplo, una reseña nueva).
- **Dependabot** propone actualizaciones semanales de npm y de las acciones.
- **Ajustar el radar**: edita los archivos de `config/`. Las pruebas validan las consultas en CI.
- **Licencia**: todos los derechos reservados (ver `LICENSE`). El código es visible por transparencia.
