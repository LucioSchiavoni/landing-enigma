export type Media =
  | { type: 'image'; src: string; alt: string }
  | { type: 'video'; src: string; poster?: string; alt: string };

export interface Project {
  index: string;
  name: string;
  description: string;
  url?: string;
  media?: Media;
}

export const projects: Project[] = [
  {
    index: '01',
    name: 'LISA',
    description: 'Plataforma educativa · Lectura infantil',
    url: 'https://www.lisabasilisa.com',
    media: {
      type: 'video',
      src: '/proyectos/lisa.mp4',
      poster: '/proyectos/lisa.webp',
      alt: 'Recorrido por LISA: mapa de niveles, un ejercicio de rimas y el simplificador de textos',
    },
  },
  {
    index: '02',
    name: 'Watt Studio',
    description: 'E-commerce · Configurador de lámparas',
    url: 'https://wattstudio.com.uy',
    media: {
      type: 'video',
      src: '/proyectos/wattstudio.mp4',
      poster: '/proyectos/wattstudio.webp',
      alt: 'Recorrido por el configurador de Watt Studio: cambio de pantalla y base de una lámpara y modo noche con temperatura de luz',
    },
  },
  {
    index: '03',
    name: 'Todo en Packaging',
    description: 'Catálogo online · Packaging mayorista',
    url: 'https://todoenpackaging.com.uy',
    media: {
      type: 'video',
      src: '/proyectos/todoenpackaging.mp4',
      poster: '/proyectos/todoenpackaging.webp',
      alt: 'Recorrido por Todo en Packaging: inicio, catálogo de productos, página de nosotros y contacto',
    },
  },
  {
    index: '04',
    name: 'Digital Dental Lab',
    description: 'Web corporativa · Laboratorio dental',
    url: 'https://digitaldentallab-git-main-lucioschiavonis-projects.vercel.app',
    media: {
      type: 'video',
      src: '/proyectos/digitaldentallab.mp4',
      poster: '/proyectos/digitaldentallab.webp',
      alt: 'Recorrido por Digital Dental Lab: página de inicio y página de servicios de diseño dental digital',
    },
  },
];
