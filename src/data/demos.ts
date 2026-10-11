import type { ImageMetadata } from 'astro';
import obra from '../assets/demos/obra.jpg';
import carta from '../assets/demos/carta.jpg';
import agenda from '../assets/demos/agenda.jpg';

export interface Demo {
  slug: string;
  name: string;
  sector: string;
  description: string;
  preview: ImageMetadata;
  alt: string;
}

export const demos: Demo[] = [
  {
    slug: 'obra',
    name: 'Arazá Estudio',
    sector: 'Webs para estudios y constructoras',
    description: 'La casa se construye mientras haces scroll, del terreno a la entrega, con datos de obra y barra de avance.',
    preview: obra,
    alt: 'Captura de la demo Arazá Estudio: la casa terminada con el avance de obra al 100 %',
  },
  {
    slug: 'carta',
    name: 'Tizón',
    sector: 'Carta digital para restaurantes',
    description: 'Se abre con el QR de la mesa: un plato por pantalla con foto, precio y botón para ir armando el pedido.',
    preview: carta,
    alt: 'Captura de la demo Tizón: la provoleta con su foto, precio y botón para sumarla al pedido',
  },
  {
    slug: 'agenda',
    name: 'Navaja Barbería',
    sector: 'Agenda de turnos para barberías, consultorios y estéticas',
    description: 'Reserva en cuatro pasos: servicio, barbero, día y hora, y confirmación con recordatorio por WhatsApp.',
    preview: agenda,
    alt: 'Captura de la demo Navaja Barbería: el primer paso de la reserva con los servicios y sus precios',
  },
];
