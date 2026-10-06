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
- En el hero solo se mueve el titular (efecto de descifrado, una sola vez al cargar).

## Layout y componentes

- Mobile first.
- **Logo**: icono `</>` más el nombre en dos líneas (enigma / Builders), en `src/components/Logo.astro`. El icono también se usa como favicon (`public/favicon.svg`).
- **Navbar**: flotante y rectangular (esquinas rectas), barra oscura separada de los bordes de la pantalla, en la línea de sui.io. Logo a la izquierda; enlaces ancla (Servicios, Proyectos, Nosotros), cada uno con una pequeña caja cuadrada con una cruz; botón destacado Contacto en `brand` a la derecha. En móvil: logo, botón Contacto y botón hamburguesa en caja cuadrada con `aria-expanded` y `aria-controls`, que abre un `aside` lateral con el menú. El menú se cierra con Escape, al tocar un enlace, con el botón de cierre o tocando fuera.
- **Hero**: `position: sticky; top: 0; height: 100svh`. La sección siguiente sube y lo tapa con fondo sólido y borde superior de 1px en `brand`. Mejora progresiva opcional: el hero se oscurece al taparse mediante scroll-driven animations (`@supports (animation-timeline: view())`).

## Contenido

- Copy en castellano de España.
- No inventar contenido. Los textos de secciones aún no definidas se marcan como `[PENDIENTE]`.

## Accesibilidad

- HTML semántico, un solo `h1`.
- Foco visible con el acento.
- Contraste suficiente sobre `ink`.
- Controles interactivos con nombres accesibles.
