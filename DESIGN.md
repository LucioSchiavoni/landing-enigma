# DESIGN.md — Enigma Builders

Reglas de diseño y desarrollo del sitio de Enigma Builders, estudio full stack de dos personas especializado en agentes de IA y automatización, que también hace software a medida. Este documento es la fuente de verdad: cualquier cambio de estilo o de stack se refleja aquí antes de tocar el código.

## Stack

- Astro + TypeScript + Tailwind CSS v4.
- Sin React ni librerías de UI.
- Fuentes autohospedadas con Fontsource:
  - **Lexend** para títulos y texto.
  - **JetBrains Mono** solo para etiquetas pequeñas.
- Todo el JavaScript en archivos propios (`src/scripts/*.ts`). Sin scripts inline, sin atributos `on*`, sin `style` inline generado por JS salvo transform y opacity vía propiedades CSS.
- Cero peticiones a dominios externos: nada de CDNs, Google Fonts, analíticas ni iconos remotos.
- Compatible con una CSP estricta (`default-src 'self'`, sin `unsafe-inline` en `script-src`).
- Sin comentarios en el código.

## Tokens

Variables CSS definidas una sola vez en `src/styles/global.css` (bloque `@theme` de Tailwind v4). Prohibido introducir colores nuevos: las variaciones se obtienen con opacidad o `color-mix()` a partir de estos tokens.

| Token | Valor | Uso |
| --- | --- | --- |
| `--color-ink` | `#08061A` | Fondo casi negro con tinte índigo |
| `--color-brand` | `#4310E3` | Color de marca: botón principal, bandas laterales, borde de cubierta |
| `--color-accent` | `#DCD9D0` | Blanco cálido: acento en zonas oscuras (etiquetas, foco, detalles) y fondo de las secciones claras |
| `--color-graphite` | `#2A2926` | Texto sobre fondo `accent` |
| `--color-white` | `#FFFFFF` | Texto sobre fondo oscuro |

Derivados permitidos (siempre desde los tokens): texto secundario y bordes con blanco, acento o grafito a baja opacidad, superficies con `ink` mezclado con `brand` en porcentajes bajos.

### Zonas

- **Oscura**: hero y navbar. Fondo `ink`, texto `white`, acento `accent`. El hero no cambia.
- **Cierre oscuro**: Contacto y pie de página vuelven a `ink`, con la grilla de puntos y las bandas laterales del hero, para cerrar la página igual que empieza.
- **Clara**: todas las secciones debajo del hero. Fondo `accent`, texto `graphite`, borde superior de 1px en `brand`. Se aplica con la clase `surface-light`, que también ajusta etiquetas y foco.

## Estilo

Dark mode premium tipo web3, inspirado en el hero de sui.io.

- Fondo `ink` con grilla de puntos muy tenue.
- Bandas verticales laterales con degradado índigo **estático** y grano.
- El grano usa `public/noise.svg` local, a baja opacidad y **solo en las bandas laterales**.
- Titular enorme en blanco, tracking apretado.
- Subtítulo pequeño y centrado.
- Bordes finos semitransparentes (1px).
- Esquinas rectas en barras, botones y cajas: estética web3 técnica, presente en todo el sitio.
- Mucho espacio vacío.
- Detalles cypherpunk puntuales: etiquetas tipo `[ 01 ]` en JetBrains Mono.

### Prohibido

- Neobrutalismo.
- Sombras duras.
- Fondos beige o crema distintos de `accent`.
- `filter: blur` grande.
- Animar degradados.
- Emojis.

## Movimiento

- Animar solo `transform` y `opacity` siempre que se pueda.
- Respetar `prefers-reduced-motion`: mostrar directamente el estado final.
- Las animaciones nunca alteran el contenido semántico: el texto final está en el HTML desde el principio.
- En el hero solo se mueve el titular. Hace una sola vuelta por cuatro frases con el efecto de descifrado (la actual se vuelve a cifrar y se descifra la siguiente, unos 4 s cada una) y se queda fija en la principal, "Lleva tu negocio a otro nivel". Todas las frases tienen dos líneas cortas (la segunda en acento) y están apiladas en la misma celda, de modo que el bloque reserva el alto de la más larga y nada se desplaza. El `h1` accesible es siempre la frase principal. Con `prefers-reduced-motion` o sin JavaScript solo se ve la principal.

## Layout y componentes

- Mobile first.
- **Logo**: icono `</>` más el nombre en dos líneas (enigma / Builders), en `src/components/Logo.astro`. El icono también se usa como favicon (`public/favicon.svg`).
- **Navbar**: flotante y rectangular (esquinas rectas), barra oscura separada de los bordes de la pantalla, en la línea de sui.io. Logo a la izquierda; enlaces ancla (Servicios, Proyectos, Nosotros), cada uno con una pequeña caja cuadrada con una cruz; botón destacado Contacto en `brand` a la derecha. En móvil: logo, botón Contacto y botón hamburguesa en caja cuadrada con `aria-expanded` y `aria-controls`, que abre un `aside` lateral con el menú. El menú se cierra con Escape, al tocar un enlace, con el botón de cierre o tocando fuera.
- **Hero**: `position: sticky; top: 0; height: 100svh`. La sección siguiente sube y lo tapa con fondo sólido y borde superior de 1px en `brand`. Mejora progresiva opcional: el hero se oscurece al taparse mediante scroll-driven animations (`@supports (animation-timeline: view())`).

- **Servicios** (`src/components/Services.astro` + `src/scripts/reveal.ts`): rejilla bento sobre la zona clara, pensada para el cliente final y sin tecnicismos. Agentes de IA y automatización en tarjeta oscura destacada (dos tercios) con un diagrama de flujo: entradas (WhatsApp, email, formulario web, documentos) → agente que entiende y decide → acciones (agenda, CRM, factura, aviso al equipo), compacto y a tamaño natural, sobre la grilla de puntos del hero. El agente central lleva un robot en línea fina (SVG propio, esquinas rectas) con el texto al lado, nodos en las conexiones, paquetes de datos que viajan de las entradas al agente y del agente a las acciones (`src/scripts/flow.ts` recalcula las líneas en píxeles reales; SVG con SMIL), un pulso sincronizado con la llegada de los paquetes y un parpadeo ocasional de ojos (solo con `prefers-reduced-motion: no-preference`); en móvil se apila en vertical. Software a medida y Seguridad y Web3 son tarjetas claras con texto y, en la esquina superior derecha, el logo de TypeScript o Solidity (`simple-icons`, incrustado al compilar) en índigo de marca al 12 % de opacidad. La rejilla debe caber en una pantalla de escritorio. Debajo, "Cómo trabajamos" en cuatro pasos. Copy del README, con tuteo.
- **Animaciones de entrada**: solo CSS más `IntersectionObserver` (`reveal.ts`), sin librerías. `data-reveal` (fundido y subida), `data-reveal-delay="1|2"` (retardo), `data-reveal-stagger` (hijos en cascada) y `data-reveal-flow` (secuencia del diagrama). Solo opacidad y transformaciones, y solo con `scripting: enabled` y `prefers-reduced-motion: no-preference`; en otro caso todo se ve directamente.
- **Nosotros** (`src/components/About.astro` + `src/data/team.ts`): dos columnas en escritorio, cabe en una pantalla. Izquierda: párrafo de "Quiénes somos" y las tarjetas oscuras del equipo (foto cuadrada, nombre, rol y enlace a LinkedIn). Sin `photo` en los datos, el marco muestra el monograma sobre la grilla de puntos y `[ Foto · PENDIENTE ]`. Derecha: "Por qué trabajar con nosotros" en cinco motivos numerados. Copy del README, con tuteo.
- **Contacto** (`src/components/Contact.astro` + `src/scripts/whatsapp.ts`): "Hablemos." en grande con el texto del README. Botón principal "Escríbenos por WhatsApp" que despliega un menú para elegir con quién hablar (Lucio o Maxi); los números no se muestran y el enlace `wa.me` se compone por script a partir de fragmentos invertidos en `data-wa`, con un mensaje inicial. Botón secundario a Instagram. Sin formulario: la web es estática y no hace peticiones externas.
- **Pie** (`src/components/Footer.astro`): logo, enlaces a las secciones e Instagram, lema "Descifrar, construir, entregar." y ©.
- **Proyectos** (`src/components/Projects.astro` + `src/scripts/projects.ts`): acordeón de 4 paneles oscuros (`ink`) sobre la zona clara, con esquinas rectas. La sección ocupa toda la pantalla en escritorio (`100svh`, mínimo 42rem) con los mismos márgenes laterales que la navbar: título compacto arriba a la izquierda y el acordeón llenando el resto.
  - Escritorio (≥ 64rem): horizontal. Las tiras cerradas muestran `[ 0N ]`, la palabra PROYECTO en vertical y una caja cuadrada con flecha. El panel activo se expande con transición de `grid-template-columns` (proporción 10:1:1:1) y muestra servicio, nombre, descripción, enlace y captura. Se abre con clic, foco y hover; siempre hay uno abierto.
  - Móvil: vertical, con transición de `grid-template-rows`. Un clic abre o cierra.
  - Cada tira es un `button` con `aria-expanded` y `aria-controls`; los paneles cerrados son `inert`.
  - Medios: cada proyecto acepta `media` de tipo `image` o `video` (MP4 silenciado en bucle, solo se reproduce el del panel activo y nunca con `prefers-reduced-motion`). Formato 16:10. En escritorio el medio ocupa todo el panel y la información va superpuesta abajo sobre un degradado `ink`; en móvil el medio va arriba y el texto debajo. Los archivos van en `public/proyectos/`. Sin medio, se muestra un marco con `[ Captura · PENDIENTE ]`.
  - Grabación: `tools/record.mjs <slug>` reproduce el recorrido de `tools/tours/<slug>.mjs` con Playwright, captura a 1440 × 900 y genera `public/proyectos/<slug>.mp4` y `<slug>.webp` con ffmpeg. `--encode` vuelve a montar desde la última captura sin grabar. Para webs con login, `tools/login.mjs <slug> <url>` guarda la sesión en `tools/.auth/` (excluida de git).

## Contenido

- Copy en castellano de España.
- No inventar contenido. Los textos de secciones aún no definidas se marcan como `[PENDIENTE]`.

## Accesibilidad

- HTML semántico, un solo `h1`.
- Foco visible con el acento.
- Contraste suficiente sobre `ink`.
- Controles interactivos con nombres accesibles.
