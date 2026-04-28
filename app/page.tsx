"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Navbar1 } from "@/components/ui/navbar-1";
import { SplineScene } from "@/components/ui/splite";
import { Card } from "@/components/ui/card";
import { Spotlight } from "@/components/ui/spotlight";
import { Feature108 } from "@/components/ui/shadcnblocks-com-feature108";
import { TestimonialsColumn, type Testimonial } from "@/components/ui/testimonials-columns-1";
import { WorldMap } from "@/components/ui/world-map";
import { EvervaultCard, Icon } from "@/components/ui/evervault-card";
import { FaqsSection } from "@/components/ui/faqs-1";
import { LegalModal } from "@/components/ui/legal-modal";
import {
  Users,
  Star,
  Globe,
  Award,
  MessageCircle,
  ChevronRight,
  GraduationCap,
  Flame,
} from "lucide-react";

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const YoutubeIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
  </svg>
);

// ─── Testimonials ─────────────────────────────────────────────────────────────
const testimonials: Testimonial[] = [
  {
    text: "Después de 3 meses con MEA International, me dieron el trabajo que tanto quería en una empresa multinacional. El inglés ya no es una barrera para mí.",
    image: "https://randomuser.me/api/portraits/women/44.jpg",
    name: "María García",
    role: "Ejecutiva de Ventas, Ciudad de Guatemala",
  },
  {
    text: "Mis clases personalizadas me ayudaron a aprobar el TOEFL con 105 puntos. El maestro fue increíble, muy paciente y profesional. 100% recomendado.",
    image: "https://randomuser.me/api/portraits/men/32.jpg",
    name: "Carlos Méndez",
    role: "Ingeniero Civil, Guatemala",
  },
  {
    text: "Como doctora necesitaba inglés médico específico. MEA me diseñó un plan perfectamente adaptado a mi especialidad. Ver resultados en semanas fue motivador.",
    image: "https://randomuser.me/api/portraits/women/65.jpg",
    name: "Ana López",
    role: "Médica Pediatra, Quetzaltenango",
  },
  {
    text: "Expandí mi empresa a Estados Unidos gracias al inglés que aprendí con MEA. El retorno de inversión de las clases fue inmediato para mi negocio.",
    image: "https://randomuser.me/api/portraits/men/71.jpg",
    name: "Roberto Hernández",
    role: "Empresario, Antigua Guatemala",
  },
  {
    text: "Empecé sin saber nada de inglés y en 6 meses logré mantener conversaciones fluidas con extranjeros. La metodología de MEA es realmente efectiva.",
    image: "https://randomuser.me/api/portraits/women/29.jpg",
    name: "Sofía Ramírez",
    role: "Estudiante Universitaria, USAC",
  },
  {
    text: "Las clases se adaptan perfectamente a mi horario de trabajo. Puedo estudiar a las 6am o a las 9pm. Esa flexibilidad no la encuentras en ningún otro lugar.",
    image: "https://randomuser.me/api/portraits/men/18.jpg",
    name: "Diego Castro",
    role: "Contador Público, Guatemala",
  },
  {
    text: "MEA me preparó para presentar mi trabajo de investigación en una conferencia internacional. El apoyo de los maestros fue invaluable y el resultado fue excelente.",
    image: "https://randomuser.me/api/portraits/women/82.jpg",
    name: "Valentina Morales",
    role: "Periodista, Prensa Libre",
  },
  {
    text: "Necesitaba inglés legal para casos internacionales. El maestro de MEA tiene experiencia en vocabulario jurídico y eso marcó toda la diferencia en mi carrera.",
    image: "https://randomuser.me/api/portraits/men/55.jpg",
    name: "Andrés Pérez",
    role: "Abogado, Guatemala City",
  },
  {
    text: "Mis alumnos me preguntan cómo mejoré mi inglés tan rápido. MEA no solo me enseñó el idioma, me dio la confianza para usarlo con naturalidad en clase.",
    image: "https://randomuser.me/api/portraits/women/12.jpg",
    name: "Lucía Torres",
    role: "Maestra Bilingüe, Escuintla",
  },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

// ─── Stats ────────────────────────────────────────────────────────────────────
const stats = [
  { icon: Users, value: 200, suffix: "+", label: "Estudiantes", sublabel: "en todo el mundo" },
  { icon: Star, value: 98, suffix: "%", label: "Satisfacción", sublabel: "garantizada" },
  { icon: Globe, value: 10, suffix: "+", label: "Países", sublabel: "con presencia" },
  { icon: Award, value: 0, suffix: "", label: "4.9★ Calificación", sublabel: "promedio", isFixed: true },
];

// ─── Courses ──────────────────────────────────────────────────────────────────
const courses = [
  {
    text: "Pre A",
    title: "Inglés Pre A",
    price: "Q300",
    features: [
      "8 clases al mes (2 x Semana)",
      "Material de estudio digital",
      "Acceso a clases grabadas",
      "Soporte vía WhatsApp",
      "Clases grupales",
      "Certificado de nivel por la academia",
    ],
    highlighted: true,
    badge: "Más popular",
  },
  {
    text: "B1 B2",
    title: "Inglés intermedio-Avanzado Conversacional",
    price: "Q250",
    features: [
      "8 clases al mes (2 x Semana)",
      "Plan de estudio especializado",
      "Acceso a clases grabadas",
      "Soporte vía WhatsApp",
      "Clases grupales conversacionales",
      "Certificado de nivel por la academia",
    ],
    highlighted: false,
    badge: "Para todos los niveles",
  },
  {
    text: "VIP",
    title: "Inglés personalizado",
    price: "Q1,600",
    features: [
      "Clases privadas 1 a 1",
      "Horario 100% flexible",
      "Plan de estudio a tu medida",
      "Material de estudio digital",
      "Acceso a clases grabadas",
      "Certificado de nivel por la academia",
    ],
    highlighted: false,
    badge: "Premium",
  },
];

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ end, duration = 2 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

// ─── Fade-in wrapper ──────────────────────────────────────────────────────────
function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Legal content ────────────────────────────────────────────────────────────
const PRIVACY_CONTENT = `<h2 class="text-2xl font-bold mb-6">Política de Privacidad</h2>
<p class="text-sm text-muted-foreground mb-8">Última actualización: 27 de abril de 2026</p>
<p><strong>MEA International</strong> (en adelante "MEA", "nosotros" o "la Academia"), con domicilio en Ciudad de Guatemala, Guatemala, respeta y protege tu privacidad de conformidad con el artículo 24 de la Constitución Política de la República de Guatemala (Habeas Data) y la Ley de Protección al Consumidor.</p>
<h3 class="font-semibold mt-8 mb-3">Datos que recolectamos</h3>
<p>Nombre completo, correo electrónico, número de teléfono/WhatsApp, nivel de inglés, objetivos de aprendizaje y datos de pago (procesados por terceros seguros).</p>
<h3 class="font-semibold mt-8 mb-3">Finalidad del tratamiento</h3>
<p>Procesar inscripciones, impartir clases, enviar material educativo, mejorar nuestros servicios y cumplir obligaciones legales.</p>
<h3 class="font-semibold mt-8 mb-3">Base legal</h3>
<p>Tu consentimiento expreso (al aceptar esta política o al inscribirte) y la ejecución del contrato de prestación de servicios educativos.</p>
<h3 class="font-semibold mt-8 mb-3">Tus derechos (Habeas Data)</h3>
<p>Puedes ejercer en cualquier momento los derechos de acceso, rectificación, cancelación y oposición enviando un correo a <strong>mea.learnandplay@gmail.com</strong>. Responderemos en un plazo máximo de 10 días hábiles.</p>
<h3 class="font-semibold mt-8 mb-3">Transferencias y seguridad</h3>
<p>No vendemos tus datos. Solo los compartimos con proveedores esenciales (plataformas de pago, herramientas educativas) bajo contratos de confidencialidad. Implementamos medidas de seguridad técnicas y organizativas.</p>
<p>Al continuar usando nuestro sitio aceptas esta Política de Privacidad.</p>`;

const TERMS_CONTENT = `<h2 class="text-2xl font-bold mb-6">Términos y Condiciones de Uso</h2>
<p class="text-sm text-muted-foreground mb-8">Última actualización: 27 de abril de 2026</p>
<p>Al acceder y utilizar este sitio web y los servicios de <strong>MEA International</strong> aceptas estos Términos y Condiciones.</p>
<h3 class="font-semibold mt-6 mb-3">1. Servicios</h3>
<p>Ofrecemos clases de inglés online personalizadas. Los servicios son para personas mayores de 18 años.</p>
<h3 class="font-semibold mt-6 mb-3">2. Pagos y reembolsos</h3>
<p>Los pagos se procesan de forma segura. No se otorgan reembolsos una vez iniciadas las clases, salvo casos excepcionales evaluados por la Academia.</p>
<h3 class="font-semibold mt-6 mb-3">3. Cambios de horario</h3>
<p>Todos los cambios deben solicitarse con al menos 24 horas de anticipación.</p>
<h3 class="font-semibold mt-6 mb-3">4. Propiedad intelectual</h3>
<p>Todo el material educativo (clases grabadas, documentos, etc.) es propiedad exclusiva de MEA International. Queda prohibida su reproducción o distribución sin autorización escrita.</p>
<h3 class="font-semibold mt-6 mb-3">5. Conducta del usuario</h3>
<p>Prohibido cualquier uso fraudulento, ofensivo o ilegal del sitio.</p>
<h3 class="font-semibold mt-6 mb-3">6. Limitación de responsabilidad</h3>
<p>MEA no se hace responsable por daños indirectos, pérdida de datos o interrupciones del servicio por causas ajenas a su control.</p>
<h3 class="font-semibold mt-6 mb-3">7. Ley aplicable y jurisdicción</h3>
<p>Estos términos se rigen exclusivamente por las leyes de la República de Guatemala. Cualquier controversia será resuelta ante los tribunales competentes de la Ciudad de Guatemala.</p>
<p>Podemos modificar estos términos en cualquier momento. El uso continuado del sitio implica aceptación de las modificaciones.</p>`;

const COOKIES_CONTENT = `<h2 class="text-2xl font-bold mb-6">Política de Cookies</h2>
<p class="text-sm text-muted-foreground mb-8">Última actualización: 27 de abril de 2026</p>
<p>Utilizamos cookies para mejorar tu experiencia, analizar el uso del sitio y ofrecerte un servicio personalizado.</p>
<h3 class="font-semibold mt-6 mb-3">Tipos de cookies que usamos</h3>
<ul class="list-disc pl-6 space-y-2 text-sm">
  <li><strong>Cookies esenciales:</strong> Necesarias para el funcionamiento del sitio.</li>
  <li><strong>Cookies de análisis:</strong> Nos ayudan a entender cómo usas el sitio (Google Analytics u otras herramientas).</li>
  <li><strong>Cookies de preferencias:</strong> Recuerdan tus configuraciones.</li>
</ul>
<h3 class="font-semibold mt-6 mb-3">Consentimiento</h3>
<p>Al continuar navegando en nuestro sitio aceptas el uso de cookies. Puedes gestionarlas o bloquearlas desde la configuración de tu navegador. Ten en cuenta que bloquear cookies esenciales puede afectar el correcto funcionamiento del sitio.</p>
<p>Para más información sobre cómo ejercemos tus derechos consulta nuestra <a href="#" class="text-primary hover:underline">Política de Privacidad</a>.</p>`;

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [legalModal, setLegalModal] = useState<string | null>(null);

  const legalLinks = [
    { label: "Privacidad", content: PRIVACY_CONTENT },
    { label: "Términos", content: TERMS_CONTENT },
    { label: "Cookies", content: COOKIES_CONTENT },
  ];

  return (
    <main className="min-h-screen bg-white overflow-x-hidden">

      {/* 1. NAVBAR */}
      <Navbar1 />

      {/* 2. HERO */}
      <section id="inicio" className="relative min-h-screen bg-[#0A2540] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A2540] via-[#0d3060] to-[#0A2540]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#00C4B420,_transparent_60%)]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <Card className="w-full min-h-screen bg-transparent border-0 rounded-none relative overflow-hidden">
          <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="#00C4B4" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center min-h-screen px-6 lg:px-16 pt-28 pb-16 max-w-7xl mx-auto gap-12">
            {/* Left */}
            <div className="flex-1 flex flex-col justify-center text-white max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 bg-[#00C4B4]/10 border border-[#00C4B4]/30 rounded-full px-4 py-2 w-fit mb-6"
              >
                <Flame className="w-4 h-4 text-[#00C4B4]" />
                <span className="text-[#00C4B4] text-sm font-semibold">Academia Premium de Inglés Online</span>
              </motion.div>

              <motion.h1
                className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
              >
                Domina el inglés real con{" "}
                <span className="text-[#00C4B4]">clases personalizadas</span>{" "}
                y resultados rápidos
              </motion.h1>

              <motion.p
                className="text-slate-300 text-lg md:text-xl leading-relaxed mb-8 max-w-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                Más de 200 profesionales en Latinoamérica ya lograron la fluidez que necesitaban
                para crecer en su carrera. Ahora es tu turno.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-4 mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
              >
                <a
                  href="https://wa.me/50256311728?text=Hola!%20Me%20interesa%20aprender%20inglés%20con%20MEA%20International"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#00C4B4] text-white rounded-full font-bold text-base hover:bg-[#00a898] transition-all shadow-lg shadow-[#00C4B4]/30 hover:scale-105"
                >
                  <MessageCircle className="w-5 h-5" />
                  Inscríbete Ahora
                </a>
                <a
                  href="#cursos"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 border border-white/20 text-white rounded-full font-semibold text-base hover:bg-white/20 transition-all"
                >
                  Ver Cursos <ChevronRight className="w-4 h-4" />
                </a>
              </motion.div>

              {/* Social proof */}
              <motion.div
                className="flex items-center gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.5 }}
              >
                <div className="flex -space-x-2">
                  {[44, 32, 65, 71, 29].map((n) => (
                    <img
                      key={n}
                      src={`https://randomuser.me/api/portraits/men/${n}.jpg`}
                      className="w-9 h-9 rounded-full border-2 border-[#0A2540] object-cover"
                      alt="student"
                    />
                  ))}
                </div>
                <div>
                  <div className="flex text-[#00C4B4]">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-sm">★</span>
                    ))}
                  </div>
                  <p className="text-slate-400 text-xs">+200 estudiantes satisfechos</p>
                </div>
              </motion.div>
            </div>

            {/* Right — 3D Scene */}
            <motion.div
              className="flex-1 relative w-full lg:max-w-xl h-[400px] lg:h-[550px]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
            >
              <SplineScene
                scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                className="w-full h-full"
              />
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <span className="text-slate-500 text-xs">Desplázate para explorar</span>
            <motion.div
              className="w-5 h-8 border-2 border-slate-600 rounded-full flex justify-center pt-1.5"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <div className="w-1 h-2 bg-slate-500 rounded-full" />
            </motion.div>
          </motion.div>
        </Card>
      </section>

      {/* 3. STATS */}
      <section className="py-20 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          {/* Urgency banner */}
          <FadeIn>
            <div className="bg-gradient-to-r from-[#0A2540] to-[#0d3060] rounded-2xl p-4 mb-12 flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-[#00C4B4] rounded-full animate-pulse" />
                <span className="text-white font-semibold text-sm">🔥 En este momento:</span>
              </div>
              <span className="text-slate-300 text-sm">
                <span className="text-[#00C4B4] font-bold text-lg">7</span> estudiantes se inscribieron este mes.{" "}
                <span className="text-white font-semibold">¡Los cupos son limitados!</span>
              </span>
              <a
                href="https://wa.me/50256311728?text=Hola!%20Me%20interesa%20aprender%20inglés%20con%20MEA%20International"
                className="bg-[#00C4B4] text-white text-sm font-bold px-5 py-2 rounded-full hover:bg-[#00a898] transition-all shrink-0"
              >
                Reserva tu lugar →
              </a>
            </div>
          </FadeIn>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="text-center p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-[#00C4B4]/30 hover:shadow-lg hover:shadow-[#00C4B4]/5 transition-all group">
                  <div className="w-12 h-12 bg-[#0A2540] rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-[#00C4B4] transition-colors">
                    <stat.icon className="w-6 h-6 text-[#00C4B4] group-hover:text-white transition-colors" />
                  </div>
                  {stat.isFixed ? (
                    <div className="text-3xl md:text-4xl font-bold text-[#0A2540] mb-1">{stat.label}</div>
                  ) : (
                    <>
                      <div className="text-3xl md:text-4xl font-bold text-[#0A2540] mb-1">
                        <AnimatedCounter end={stat.value} />
                        {stat.suffix}
                      </div>
                      <div className="font-semibold text-[#0A2540] text-sm">{stat.label}</div>
                    </>
                  )}
                  <div className="text-slate-400 text-xs mt-0.5">{stat.sublabel}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 4. FEATURES */}
      <section id="nosotros">
        <Feature108
          badge="¿Por qué MEA International?"
          heading="El método que sí funciona"
          description="Descubre por qué somos la academia de inglés más recomendada en Guatemala y Latinoamérica."
        />
      </section>

      {/* 5. TESTIMONIALS */}
      <section id="testimonios" className="bg-slate-50 py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#00C4B405,_transparent_70%)]" />
        <div className="container z-10 mx-auto px-4 relative">
          <FadeIn>
            <div className="flex flex-col items-center justify-center max-w-[540px] mx-auto mb-12">
              <div className="border border-[#00C4B4]/30 bg-[#00C4B4]/5 py-1 px-4 rounded-full mb-4">
                <span className="text-[#00C4B4] text-sm font-semibold">Testimonios reales</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-[#0A2540] text-center mb-4">
                Ellos ya cambiaron su vida con el inglés
              </h2>
              <p className="text-center text-slate-500">
                Más de 200 profesionales y estudiantes en Guatemala y Latinoamérica confían en MEA International.
              </p>
            </div>
          </FadeIn>

          <div className="flex justify-center gap-6 [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_85%,transparent)] max-h-[760px] overflow-hidden">
            <TestimonialsColumn testimonials={firstColumn} duration={18} />
            <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={22} />
            <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={20} />
          </div>

          <FadeIn delay={0.2}>
            <div className="text-center mt-12">
              <a
                href="https://wa.me/50256311728?text=Hola!%20Me%20interesa%20aprender%20inglés%20con%20MEA%20International"
                className="inline-flex items-center gap-2 bg-[#00C4B4] text-white px-8 py-4 rounded-full font-bold hover:bg-[#00a898] transition-all hover:scale-105 shadow-lg shadow-[#00C4B4]/30"
              >
                <MessageCircle className="w-5 h-5" />
                Únete a ellos — Inscríbete Ahora
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 6. WORLD MAP */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 border border-[#00C4B4]/30 bg-[#00C4B4]/5 rounded-full px-4 py-1.5 mb-4">
                <Globe className="w-4 h-4 text-[#00C4B4]" />
                <span className="text-[#00C4B4] text-sm font-semibold">Alcance Global</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0A2540] mb-4">
                Estudiantes en Todo el Mundo
              </h2>
              <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                Desde Guatemala conectamos a nuestros estudiantes con oportunidades en más de 10 países.
                El inglés que aprendes aquí te abre puertas en cualquier parte del mundo.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="rounded-3xl overflow-hidden border border-slate-100 shadow-xl shadow-slate-100">
              <WorldMap
                lineColor="#00C4B4"
                dots={[
                  { start: { lat: 15.7835, lng: -90.2308 }, end: { lat: 40.7128, lng: -74.006 } },
                  { start: { lat: 15.7835, lng: -90.2308 }, end: { lat: 25.7617, lng: -80.1918 } },
                  { start: { lat: 15.7835, lng: -90.2308 }, end: { lat: 40.4168, lng: -3.7038 } },
                  { start: { lat: 15.7835, lng: -90.2308 }, end: { lat: 51.5074, lng: -0.1278 } },
                  { start: { lat: 15.7835, lng: -90.2308 }, end: { lat: 43.6532, lng: -79.3832 } },
                  { start: { lat: 15.7835, lng: -90.2308 }, end: { lat: 19.4326, lng: -99.1332 } },
                  { start: { lat: 15.7835, lng: -90.2308 }, end: { lat: 4.711, lng: -74.0721 } },
                ]}
              />
            </div>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              {[
                "🇺🇸 Estados Unidos",
                "🇬🇧 Reino Unido",
                "🇪🇸 España",
                "🇨🇦 Canadá",
                "🇲🇽 México",
                "🇨🇴 Colombia",
                "🇦🇷 Argentina",
                "🇨🇱 Chile",
                "🇵🇪 Perú",
              ].map((country) => (
                <span
                  key={country}
                  className="bg-slate-50 border border-slate-200 text-slate-600 text-sm px-4 py-2 rounded-full font-medium"
                >
                  {country}
                </span>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 7. COURSES */}
      <section id="cursos" className="py-24 bg-[#0A2540] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#00C4B415,_transparent_60%)]" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <FadeIn>
            <div className="text-center mb-4">
              <span className="inline-flex items-center gap-2 bg-[#00C4B4] text-white text-sm font-bold px-6 py-2 rounded-full">
                🎁 Pregunta por nuestra oferta de grupo familiar
              </span>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                Elige tu plan de inglés
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                Clases en vivo, maestros certificados y resultados garantizados.
              </p>
            </div>
          </FadeIn>

          {/* Inscription + platform notice */}
          <FadeIn delay={0.15}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-5 py-2.5">
                <span className="text-[#00C4B4] text-lg font-bold">Q100</span>
                <span className="text-slate-300 text-sm">inscripción</span>
                <span className="bg-white/10 text-slate-400 text-xs px-2 py-0.5 rounded-full">pago único</span>
              </div>
              <span className="text-slate-600 hidden sm:block">+</span>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-5 py-2.5">
                <span className="text-[#00C4B4] text-lg font-bold">Q130</span>
                <span className="text-slate-300 text-sm">plataforma educativa</span>
                <span className="bg-white/10 text-slate-400 text-xs px-2 py-0.5 rounded-full">adicional</span>
              </div>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8 items-start">
            {courses.map((course, i) => (
              <FadeIn key={i} delay={i * 0.15}>
                <div className="relative group h-full">
                  {course.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <span className="bg-[#00C4B4] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-[#00C4B4]/30">
                        ⭐ {course.badge}
                      </span>
                    </div>
                  )}
                  <div
                    className={`border ${course.highlighted ? "border-[#00C4B4] shadow-xl shadow-[#00C4B4]/10" : "border-white/10"} rounded-3xl overflow-hidden bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all h-full flex flex-col`}
                  >
                    {/* Evervault visual */}
                    <div className="h-36 relative">
                      <EvervaultCard text={course.text} />
                      <Icon className="absolute h-6 w-6 -top-3 -left-3 text-white/20" />
                      <Icon className="absolute h-6 w-6 -bottom-3 -left-3 text-white/20" />
                      <Icon className="absolute h-6 w-6 -top-3 -right-3 text-white/20" />
                      <Icon className="absolute h-6 w-6 -bottom-3 -right-3 text-white/20" />
                    </div>

                    <div className="p-6 border-t border-white/10 flex flex-col flex-1">
                      {/* Badge (non-highlighted) */}
                      {!course.highlighted && (
                        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
                          {course.badge}
                        </span>
                      )}

                      <h3 className="text-base font-semibold text-slate-300 mb-4 leading-snug">
                        {course.title}
                      </h3>

                      {/* ── PRECIO MENSUAL — protagonista ── */}
                      <div className={`rounded-2xl p-4 mb-5 text-center ${course.highlighted ? "bg-[#00C4B4]/15 border border-[#00C4B4]/30" : "bg-white/5 border border-white/10"}`}>
                        <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Mensualidad</p>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-white/60 text-xl font-light">Q</span>
                          <span className={`text-5xl font-extrabold tracking-tight ${course.highlighted ? "text-[#00C4B4]" : "text-white"}`}>
                            {course.price.replace("Q", "").replace("/mes", "")}
                          </span>
                          <span className="text-slate-400 text-sm font-medium">/mes</span>
                        </div>
                      </div>

                      {/* Features */}
                      <ul className="space-y-2 mb-6 flex-1">
                        {course.features.map((f, fi) => (
                          <li key={fi} className="flex items-start gap-2 text-slate-300 text-sm">
                            <div className="w-4 h-4 rounded-full bg-[#00C4B4]/20 border border-[#00C4B4]/40 flex items-center justify-center shrink-0 mt-0.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#00C4B4]" />
                            </div>
                            {f}
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      <a
                        href="https://wa.me/50256311728?text=Hola!%20Me%20interesa%20aprender%20inglés%20con%20MEA%20International"
                        className={`w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm transition-all ${
                          course.highlighted
                            ? "bg-[#00C4B4] text-white hover:bg-[#00a898] shadow-lg shadow-[#00C4B4]/30"
                            : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                        }`}
                      >
                        <MessageCircle className="w-4 h-4" />
                        Inscríbete Ahora
                      </a>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* Bottom note */}
          <FadeIn delay={0.5}>
            <p className="text-center text-slate-500 text-sm mt-8">
              * Todos los planes requieren inscripción de{" "}
              <span className="text-white font-semibold">Q100 (pago único)</span> y plataforma educativa de{" "}
              <span className="text-white font-semibold">Q130 adicional</span>.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* 8. FAQ */}
      <section id="faq" className="py-24 bg-white">
        <FadeIn>
          <FaqsSection />
        </FadeIn>
      </section>

      {/* 9. FINAL CTA */}
      <section className="bg-gradient-to-br from-[#0A2540] to-[#0d3060] py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#00C4B420,_transparent_60%)]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <FadeIn>
            <div className="inline-flex items-center gap-2 bg-[#00C4B4]/10 border border-[#00C4B4]/30 rounded-full px-4 py-2 mb-6">
              <GraduationCap className="w-4 h-4 text-[#00C4B4]" />
              <span className="text-[#00C4B4] text-sm font-semibold">Sin excusas. Sin esperas.</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Tu futuro en inglés empieza{" "}
              <span className="text-[#00C4B4]">hoy</span>
            </h2>
            <p className="text-slate-300 text-xl mb-4 max-w-2xl mx-auto">
              Únete a los más de 200 profesionales latinoamericanos que transformaron su carrera con MEA International.
            </p>
            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm mb-10">
              <div className="w-2 h-2 bg-[#00C4B4] rounded-full animate-pulse" />
              <span>
                <span className="text-[#00C4B4] font-bold">7 estudiantes</span> se inscribieron este mes — Cupos limitados
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.a
                href="https://wa.me/50256311728?text=Hola!%20Me%20interesa%20aprender%20inglés%20con%20MEA%20International"
                className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-[#00C4B4] text-white rounded-full font-bold text-lg hover:bg-[#00a898] transition-all shadow-2xl shadow-[#00C4B4]/40"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <MessageCircle className="w-5 h-5" />
                Inscríbete Ahora
              </motion.a>
              <motion.a
                href="tel:+50256311728"
                className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-white/10 border border-white/20 text-white rounded-full font-semibold text-lg hover:bg-white/20 transition-all"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                Llamar ahora
              </motion.a>
            </div>
            <p className="text-slate-500 text-sm mt-6">
              Sin contratos. Sin compromisos. Cancela cuando quieras.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* 10. FOOTER */}
      <footer className="bg-[#060f1c] text-slate-400 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="mb-4">
                <img
                  src="/mea logo.svg"
                  alt="MEA International"
                  className="h-12 w-auto object-contain"
                />
              </div>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                Academia premium de inglés online. Transformamos la vida de profesionales en Guatemala
                y Latinoamérica con clases personalizadas y resultados reales.
              </p>
              <div className="flex gap-3 mt-5">
                {[
                  { SocialIcon: InstagramIcon, href: "https://www.instagram.com/m.e.a_academy/" },
                  { SocialIcon: FacebookIcon, href: "https://www.facebook.com/MEAINTERNATIONAL.GT?locale=es_LA" },
                  { SocialIcon: YoutubeIcon, href: "https://www.youtube.com/@meacademy2871" },
                ].map(({ SocialIcon, href }, i) => (
                  <a
                    key={i}
                    href={href}
                    className="w-9 h-9 bg-white/5 border border-white/10 rounded-full flex items-center justify-center hover:bg-[#00C4B4]/10 hover:border-[#00C4B4]/30 transition-all text-slate-400 hover:text-[#00C4B4]"
                  >
                    <SocialIcon />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Navegación</h4>
              <ul className="space-y-2.5">
                {[
                  { label: "Inicio", href: "#inicio" },
                  { label: "Cursos", href: "#cursos" },
                  { label: "Nosotros", href: "#nosotros" },
                  { label: "Testimonios", href: "#testimonios" },
                  { label: "FAQ", href: "#faq" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <a href={href} className="text-slate-500 hover:text-[#00C4B4] transition-colors text-sm">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Contacto</h4>
              <ul className="space-y-2.5 text-sm text-slate-500">
                <li>📍 2da calle 7-00 zona 11 de Mixco, alta villa el Naranjo D42</li>
                <li>
                  <a href="tel:+50256311728" className="hover:text-[#00C4B4] transition-colors">
                    📞 +502 5631-1728
                  </a>
                </li>
                <li>
                  <a href="mailto:mea.learnandplay@gmail.com" className="hover:text-[#00C4B4] transition-colors">
                    ✉️ mea.learnandplay@gmail.com
                  </a>
                </li>
                <li className="text-slate-600 text-xs">Lunes a Sábado · 8am – 5pm</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-600 text-sm">
              © 2024 MEA International. Todos los derechos reservados.
            </p>
            <div className="flex gap-6">
              {legalLinks.map(({ label, content }) => (
                <button
                  key={label}
                  onClick={() => setLegalModal(content)}
                  className="text-slate-600 hover:text-slate-400 text-xs transition-colors cursor-pointer"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* 11. WHATSAPP FLOATING BUTTON */}
      <motion.a
        href="https://wa.me/50256311728?text=Hola!%20Me%20interesa%20aprender%20inglés%20con%20MEA%20International"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#25D366] text-white pl-4 pr-5 py-3 rounded-full shadow-2xl shadow-[#25D366]/40 hover:shadow-[#25D366]/60 transition-all"
        initial={{ opacity: 0, scale: 0, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 1.5, type: "spring" }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
      >
        <svg viewBox="0 0 32 32" className="w-6 h-6 fill-white shrink-0">
          <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.5 1.13 6.742 3.047 9.367L1.05 31.25l6.07-1.945A15.933 15.933 0 0016.004 32C24.826 32 32 24.823 32 16S24.826 0 16.004 0zm9.38 22.583c-.39 1.097-1.934 2.009-3.17 2.275-.843.18-1.944.323-5.647-1.214-4.74-1.96-7.793-6.772-8.03-7.083-.228-.31-1.916-2.548-1.916-4.862s1.19-3.44 1.636-3.897c.37-.38.982-.553 1.568-.553.19 0 .36.01.513.018.447.019.672.045.966.752.39.9 1.337 3.214 1.452 3.45.117.234.233.55.069.862-.155.32-.29.463-.525.732-.234.27-.456.474-.69.763-.215.254-.457.525-.186.972.27.438 1.202 1.976 2.577 3.2 1.77 1.576 3.21 2.074 3.71 2.286.37.157.807.118 1.086-.176.35-.375.78-.997 1.219-1.61.313-.435.707-.49 1.122-.333.422.148 2.661 1.254 3.117 1.48.456.234.76.346.872.535.108.188.108 1.087-.282 2.184z" />
        </svg>
        <span className="font-semibold text-sm whitespace-nowrap">¿Preguntas? WhatsApp</span>
        <span className="absolute inset-0 rounded-full animate-ping bg-[#25D366]/20 pointer-events-none" />
      </motion.a>

      {/* 12. LEGAL MODAL */}
      <LegalModal
        isOpen={legalModal !== null}
        onClose={() => setLegalModal(null)}
        content={legalModal ?? ""}
      />
    </main>
  );
}
