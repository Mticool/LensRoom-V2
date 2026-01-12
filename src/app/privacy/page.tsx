import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Политика конфиденциальности",
  description: "Политика конфиденциальности сервиса LensRoom.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--text)] mb-8">Политика конфиденциальности</h1>

        <div className="space-y-8">
          {/* General Provisions */}
          <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">1. Общие положения</h2>
            <div className="space-y-3 text-[var(--text2)] leading-relaxed">
              <p>
                Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки и защиты персональных
                данных пользователей сервиса LensRoom (далее — «Сервис»), расположенного по адресу https://lensroom.ru/.
              </p>
              <p>
                Оператором персональных данных является Индивидуальный предприниматель Шагимов Марат Тагирович (ИНН:
                024505430894).
              </p>
              <p>
                Используя Сервис, вы соглашаетесь с условиями настоящей Политики конфиденциальности и даете согласие на обработку
                ваших персональных данных в соответствии с условиями, изложенными ниже.
              </p>
            </div>
          </section>

          {/* Personal Data */}
          <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">2. Персональные данные, которые мы собираем</h2>
            <div className="space-y-3 text-[var(--text2)] leading-relaxed">
              <p>Мы собираем следующие категории персональных данных:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong className="text-[var(--text)]">Данные для регистрации:</strong> email, имя пользователя (при
                  регистрации через Google или Telegram)
                </li>
                <li>
                  <strong className="text-[var(--text)]">Данные для оплаты:</strong> информация о платежах (обрабатывается
                  платежными системами Robokassa, Payform, Prodamus)
                </li>
                <li>
                  <strong className="text-[var(--text)]">Технические данные:</strong> IP-адрес, тип браузера, операционная
                  система, данные о посещении сайта
                </li>
                <li>
                  <strong className="text-[var(--text)]">Контент:</strong> промпты, загруженные изображения, сгенерированный
                  контент
                </li>
              </ul>
            </div>
          </section>

          {/* Purpose of Processing */}
          <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">3. Цели обработки персональных данных</h2>
            <div className="space-y-3 text-[var(--text2)] leading-relaxed">
              <p>Персональные данные обрабатываются в следующих целях:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Предоставление доступа к Сервису и его функциональным возможностям</li>
                <li>Обработка платежей и управление подписками</li>
                <li>Связь с пользователем по вопросам использования Сервиса</li>
                <li>Улучшение качества Сервиса и разработка новых функций</li>
                <li>Обеспечение безопасности и предотвращение мошенничества</li>
                <li>Соблюдение требований законодательства</li>
              </ul>
            </div>
          </section>

          {/* Processing Methods */}
          <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">4. Способы обработки персональных данных</h2>
            <div className="space-y-3 text-[var(--text2)] leading-relaxed">
              <p>
                Обработка персональных данных осуществляется с использованием средств автоматизации и без использования таких
                средств, включая:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Сбор, запись, систематизация</li>
                <li>Накопление, хранение</li>
                <li>Уточнение (обновление, изменение)</li>
                <li>Извлечение, использование</li>
                <li>Передача (предоставление, доступ)</li>
                <li>Блокирование, удаление, уничтожение</li>
              </ul>
            </div>
          </section>

          {/* Data Storage */}
          <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">5. Хранение персональных данных</h2>
            <div className="space-y-3 text-[var(--text2)] leading-relaxed">
              <p>
                Персональные данные хранятся на серверах, расположенных на территории Российской Федерации. Мы используем
                следующие сервисы для хранения данных:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Supabase — для хранения данных пользователей и контента</li>
                <li>Собственные серверы — для обработки запросов</li>
              </ul>
              <p>
                Персональные данные хранятся в течение срока, необходимого для достижения целей обработки, или в течение срока,
                установленного законодательством.
              </p>
            </div>
          </section>

          {/* Data Transfer */}
          <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">6. Передача персональных данных третьим лицам</h2>
            <div className="space-y-3 text-[var(--text2)] leading-relaxed">
              <p>Мы можем передавать персональные данные следующим третьим лицам:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong className="text-[var(--text)]">Платежные системы:</strong> Robokassa, Payform, Prodamus — для обработки
                  платежей
                </li>
                <li>
                  <strong className="text-[var(--text)]">Провайдеры AI-сервисов:</strong> для генерации контента (данные
                  передаются в обезличенном виде)
                </li>
                <li>
                  <strong className="text-[var(--text)]">Хостинг-провайдеры:</strong> для хранения данных
                </li>
              </ul>
              <p>
                Мы не продаем и не передаем персональные данные третьим лицам для их собственных целей без вашего согласия, за
                исключением случаев, предусмотренных законодательством.
              </p>
            </div>
          </section>

          {/* User Rights */}
          <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">7. Права пользователей</h2>
            <div className="space-y-3 text-[var(--text2)] leading-relaxed">
              <p>Вы имеете право:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Получать информацию о ваших персональных данных</li>
                <li>Требовать уточнения, блокирования или уничтожения персональных данных</li>
                <li>Отозвать согласие на обработку персональных данных</li>
                <li>Обжаловать действия оператора в уполномоченный орган по защите прав субъектов персональных данных</li>
              </ul>
              <p>
                Для реализации ваших прав обращайтесь по email:{" "}
                <a href="mailto:mti2324@gmail.com" className="text-[var(--gold)] hover:underline">
                  mti2324@gmail.com
                </a>
              </p>
            </div>
          </section>

          {/* Security */}
          <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">8. Меры по защите персональных данных</h2>
            <div className="space-y-3 text-[var(--text2)] leading-relaxed">
              <p>Мы применяем следующие меры для защиты персональных данных:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Использование защищенных протоколов передачи данных (HTTPS)</li>
                <li>Шифрование данных при хранении</li>
                <li>Ограничение доступа к персональным данным</li>
                <li>Регулярное обновление систем безопасности</li>
                <li>Мониторинг и предотвращение несанкционированного доступа</li>
              </ul>
            </div>
          </section>

          {/* Cookies */}
          <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">9. Использование cookies</h2>
            <div className="space-y-3 text-[var(--text2)] leading-relaxed">
              <p>
                Сервис использует cookies для улучшения работы сайта и персонализации опыта пользователя. Вы можете отключить
                cookies в настройках браузера, однако это может повлиять на функциональность Сервиса.
              </p>
            </div>
          </section>

          {/* Contact Information */}
          <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">10. Контактная информация</h2>
            <div className="space-y-3 text-[var(--text2)] leading-relaxed">
              <p>
                <strong className="text-[var(--text)]">ИП Шагимов Марат Тагирович</strong>
              </p>
              <p>ИНН: 024505430894</p>
              <p>
                Email:{" "}
                <a href="mailto:mti2324@gmail.com" className="text-[var(--gold)] hover:underline">
                  mti2324@gmail.com
                </a>
              </p>
              <p>
                Телефон:{" "}
                <a href="tel:+79173811123" className="text-[var(--gold)] hover:underline">
                  8-917-38-111-23
                </a>
              </p>
            </div>
          </section>

          {/* Final Provisions */}
          <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">11. Заключительные положения</h2>
            <div className="space-y-3 text-[var(--text2)] leading-relaxed">
              <p>
                Оператор оставляет за собой право изменять настоящую Политику конфиденциальности. Изменения вступают в силу с
                момента их публикации на сайте.
              </p>
              <p>
                Продолжая использовать Сервис после внесения изменений, вы соглашаетесь с новой редакцией Политики
                конфиденциальности.
              </p>
              <p className="text-sm text-[var(--muted)] mt-4">
                Дата последнего обновления: {new Date().toLocaleDateString("ru-RU")}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

