import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface FaqItem {
  id: string;
  title: string;
  content: string;
}

interface FaqsSectionProps {
  questions?: FaqItem[];
}

export function FaqsSection({ questions = defaultQuestions }: FaqsSectionProps) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-7 px-4 pt-16">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold md:text-4xl text-[#0A2540]">Preguntas Frecuentes</h2>
        <p className="text-slate-500 max-w-2xl">
          Aquí encontrarás respuestas a las preguntas más comunes sobre MEA International. Si no encuentras lo que buscas, contáctanos directamente.
        </p>
      </div>
      <Accordion
        type="single"
        collapsible
        className="w-full -space-y-px rounded-lg"
        defaultValue="item-1"
      >
        {questions.map((item) => (
          <AccordionItem
            value={item.id}
            key={item.id}
            className="relative border-x border-slate-200 bg-white first:rounded-t-lg first:border-t last:rounded-b-lg last:border-b"
          >
            <AccordionTrigger className="px-4 py-4 text-[15px] leading-6 hover:no-underline text-[#0A2540] font-medium">
              {item.title}
            </AccordionTrigger>
            <AccordionContent className="text-slate-600 pb-4 px-4">
              {item.content}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <p className="text-slate-500">
        ¿No encuentras tu respuesta?{' '}
        <a href="https://wa.me/50256311728?text=Hola!%20Me%20interesa%20aprender%20inglés%20con%20MEA%20International" className="text-[#00C4B4] hover:underline font-medium">
          Contáctanos por WhatsApp
        </a>
      </p>
    </div>
  );
}

const defaultQuestions: FaqItem[] = [
  {
    id: 'item-1',
    title: '¿Cómo funcionan las clases en línea?',
    content:
      'Las clases se realizan por videollamada (Zoom o Google Meet) con un maestro certificado asignado exclusivamente para ti. Recibirás un enlace antes de cada clase y podrás acceder desde cualquier dispositivo con conexión a internet.',
  },
  {
    id: 'item-2',
    title: '¿En cuánto tiempo veré resultados?',
    content:
      'La mayoría de nuestros estudiantes notan mejoras significativas en las primeras 2-4 semanas. En 3 meses de clases regulares, es posible subir un nivel completo de inglés. Los resultados dependen de la frecuencia de estudio y práctica fuera de clase.',
  },
  {
    id: 'item-3',
    title: '¿Los maestros están certificados?',
    content:
      'Todos nuestros maestros son hablantes nativos de Estados Unidos, certificados y tienen más de 5 años de experiencia enseñando inglés. Su enfoque es práctico, conversacional y totalmente adaptado a las necesidades de cada estudiante.',
  },
  {
    id: 'item-4',
    title: '¿Puedo cambiar el horario de mi clase?',
    content:
      'Por supuesto. Entendemos que tu agenda puede variar. Todos los cambios de horario deben solicitarse con al menos 24 horas de anticipación para reprogramar tu clase sin ningún costo. Nuestros horarios de atención son de lunes a viernes de 8:00 am a 5:00 pm (hora de Guatemala).',
  },
  {
    id: 'item-5',
    title: '¿Qué nivel de inglés necesito para comenzar?',
    content:
      'No necesitas ningún nivel previo. Recibimos estudiantes desde principiantes absolutos hasta nivel avanzado. Antes de comenzar, realizamos una evaluación gratuita para determinar tu nivel actual y diseñar el plan de estudio ideal para ti.',
  },
  {
    id: 'item-6',
    title: '¿Tienen certificados reconocidos internacionalmente?',
    content:
      'Sí, al completar cada nivel recibirás tu certificado oficial de MEA International.',
  },
  {
    id: 'item-7',
    title: '¿Cuánto cuestan las clases?',
    content:
      'Tenemos planes desde Q350/mes para clases grupales hasta Q1,200/mes para clases privadas intensivas. La primera clase siempre es GRATIS para que compruebes la calidad de nuestro método sin compromiso. Contáctanos para conocer todos nuestros planes.',
  },
];
