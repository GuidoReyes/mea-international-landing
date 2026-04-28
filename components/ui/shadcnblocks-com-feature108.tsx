import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { Layout, Pointer, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import React from "react";

interface TabContent {
  badge: string;
  title: string;
  description: string;
  buttonText: string;
  imageSrc: string;
  imageAlt: string;
}

interface Tab {
  value: string;
  icon: React.ReactNode;
  label: string;
  content: TabContent;
}

interface Feature108Props {
  badge?: string;
  heading?: string;
  description?: string;
  tabs?: Tab[];
}

const Feature108 = ({
  badge = "MEA International",
  heading = "¿Por qué elegirnos?",
  description = "Descubre lo que hace especial a MEA International.",
  tabs = [
    {
      value: "tab-1",
      icon: <Zap className="h-auto w-4 shrink-0" />,
      label: "Clases Personalizadas",
      content: {
        badge: "Método Adaptativo",
        title: "Aprendizaje diseñado para ti.",
        description:
          "Cada estudiante tiene un plan de estudio único adaptado a sus objetivos, ritmo y nivel. Nuestros maestros certificados crean lecciones que se ajustan a tu vida profesional y personal.",
        buttonText: "Inscríbete Ahora",
        imageSrc: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop",
        imageAlt: "Clases personalizadas de inglés",
      },
    },
    {
      value: "tab-2",
      icon: <Pointer className="h-auto w-4 shrink-0" />,
      label: "Progreso Rápido",
      content: {
        badge: "Resultados Comprobados",
        title: "Habla inglés en semanas, no años.",
        description:
          "Nuestro método intensivo y práctico garantiza resultados visibles desde las primeras semanas. El 98% de nuestros estudiantes reportan mejoras significativas en su inglés en los primeros 30 días.",
        buttonText: "Ver Testimonios",
        imageSrc: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop",
        imageAlt: "Progreso rápido en inglés",
      },
    },
    {
      value: "tab-3",
      icon: <Layout className="h-auto w-4 shrink-0" />,
      label: "Nuestros Profesores",
      content: {
        badge: "Experiencia Real",
        title: "Aprende con los mejores.",
        description:
          "Nuestros profesores son hablantes nativos de inglés, altamente certificados y cuentan con más de 5 años de experiencia especializada en la enseñanza. Su enfoque es 100% conversacional y adaptado a tus objetivos.",
        buttonText: "Inscríbete Ahora",
        imageSrc: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop",
        imageAlt: "Profesores nativos de inglés",
      },
    },
  ],
}: Feature108Props) => {
  return (
    <section className="py-32 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <Badge variant="outline" className="border-[#00C4B4] text-[#00C4B4]">{badge}</Badge>
          <h1 className="max-w-2xl text-3xl font-semibold md:text-4xl text-[#0A2540]">
            {heading}
          </h1>
          <p className="text-muted-foreground max-w-xl">{description}</p>
        </div>
        <Tabs defaultValue={tabs[0].value} className="mt-8">
          <TabsList className="container flex flex-col items-center justify-center gap-4 sm:flex-row md:gap-10 bg-transparent">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-muted-foreground data-[state=active]:bg-[#0A2540] data-[state=active]:text-white transition-all cursor-pointer"
              >
                {tab.icon} {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="mx-auto mt-8 max-w-screen-xl rounded-2xl bg-slate-50 p-6 lg:p-16">
            {tabs.map((tab) => (
              <TabsContent
                key={tab.value}
                value={tab.value}
                className="grid place-items-center gap-20 lg:grid-cols-2 lg:gap-10"
              >
                <div className="flex flex-col gap-5">
                  <Badge variant="outline" className="w-fit bg-background border-[#00C4B4] text-[#00C4B4]">
                    {tab.content.badge}
                  </Badge>
                  <h3 className="text-3xl font-semibold lg:text-5xl text-[#0A2540]">
                    {tab.content.title}
                  </h3>
                  <p className="text-muted-foreground lg:text-lg">
                    {tab.content.description}
                  </p>
                  <Button
                    className="mt-2.5 w-fit gap-2 bg-[#00C4B4] hover:bg-[#00a898] text-white"
                    size="lg"
                  >
                    {tab.content.buttonText}
                  </Button>
                </div>
                <img
                  src={tab.content.imageSrc}
                  alt={tab.content.imageAlt}
                  className="rounded-xl w-full object-cover h-64 lg:h-80"
                />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </section>
  );
};

export { Feature108 };
