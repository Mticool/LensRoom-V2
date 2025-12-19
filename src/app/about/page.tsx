import { Metadata } from "next";

export const metadata: Metadata = {
  title: "О нас | LensRoom",
  description: "Информация об организации LensRoom",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--text)] mb-8">О нас</h1>

        <div className="space-y-8">
          {/* Organization Info */}
          <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">Информация об организации</h2>
            <div className="space-y-3 text-[var(--text2)]">
              <p>
                <span className="font-medium text-[var(--text)]">Индивидуальный предприниматель:</span> Шагимов Марат Тагирович
              </p>
              <p>
                <span className="font-medium text-[var(--text)]">ИНН:</span> 024505430894
              </p>
            </div>
          </section>

          {/* Contact Info */}
          <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">Контактные данные</h2>
            <div className="space-y-3 text-[var(--text2)]">
              <p>
                <span className="font-medium text-[var(--text)]">Email:</span>{" "}
                <a href="mailto:mti2324@gmail.com" className="text-[var(--gold)] hover:underline">
                  mti2324@gmail.com
                </a>
              </p>
              <p>
                <span className="font-medium text-[var(--text)]">Телефон:</span>{" "}
                <a href="tel:+79173811123" className="text-[var(--gold)] hover:underline">
                  8-917-38-111-23
                </a>
              </p>
            </div>
          </section>

          {/* Service Description */}
          <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">О сервисе</h2>
            <div className="space-y-4 text-[var(--text2)] leading-relaxed">
              <p>
                LensRoom — это AI платформа для создания профессионального контента. Мы предоставляем услуги по генерации
                изображений и видео с использованием передовых технологий искусственного интеллекта.
              </p>
              <p>
                Наша платформа позволяет создавать высококачественный визуальный контент для бизнеса, маркетинга, социальных
                сетей и личных проектов.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
