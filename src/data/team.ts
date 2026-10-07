import type { ImageMetadata } from 'astro';
import lucio from '../assets/team/lucio.jpg';
import maxi from '../assets/team/maxi.jpg';

export interface Member {
  name: string;
  initials: string;
  role: string;
  linkedin: string;
  photo?: ImageMetadata;
}

export const team: Member[] = [
  {
    name: 'Lucio Schiavoni',
    initials: 'LS',
    role: 'Desarrollador full stack y ciberseguridad.',
    linkedin: 'https://www.linkedin.com/in/lucioschiavoni/',
    photo: lucio,
  },
  {
    name: 'Maximiliano Dominguez',
    initials: 'MD',
    role: 'Analítica de datos y automatización con IA.',
    linkedin: 'https://www.linkedin.com/in/maximiliano-d-606340182/',
    photo: maxi,
  },
];
