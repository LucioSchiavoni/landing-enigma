export interface Member {
  name: string;
  initials: string;
  role: string;
  linkedin: string;
  photo?: string;
}

export const team: Member[] = [
  {
    name: 'Lucio Schiavoni',
    initials: 'LS',
    role: 'Desarrollador full stack y ciberseguridad.',
    linkedin: 'https://www.linkedin.com/in/lucioschiavoni/',
  },
  {
    name: 'Maximiliano Dominguez',
    initials: 'MD',
    role: 'Analítica de datos y automatización con IA.',
    linkedin: 'https://www.linkedin.com/in/maximiliano-d-606340182/',
  },
];
