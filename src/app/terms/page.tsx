import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Условия использования | LensRoom",
  description: "Условия использования сервиса LensRoom",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--text)] mb-8">Условия использования</h1>

        <div className="space-y-8">
          {/* General Terms */}
          <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">1. Общие положения</h2>
            <div className="space-y-3 text-[var(--text2)] leading-relaxed">
              <p>
                Настоящие Условия использования (далее — «Условия») регулируют отношения между Индивидуальным предпринимателем
                Шагимовым Маратом Тагировичем (ИНН: 024505430894) (далее — «Исполнитель», «мы», «наш») и пользователями сервиса
                LensRoom (далее — «Пользователь», «вы», «ваш»).
              </p>
              <p>
                Используя сервис LensRoom, расположенный по адресу https://lensroom.ru/, вы соглашаетесь с настоящими Условиями.
              </p>
            </div>
          </section>

          {/* Service Description */}
          <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">2. Описание услуги</h2>
            <div className="space-y-3 text-[var(--text2)] leading-relaxed">
              <p>
                LensRoom предоставляет услуги по генерации изображений и видео с использованием технологий искусственного
                интеллекта. Услуги предоставляются в цифровом виде через веб-платформу.
              </p>
              <p>Услуги включают в себя:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Генерацию изображений по текстовому описанию (text-to-image)</li>
                <li>Генерацию изображений на основе загруженного изображения (image-to-image)</li>
                <li>Генерацию видео по текстовому описанию (text-to-video)</li>
                <li>Генерацию видео на основе загруженного изображения (image-to-video)</li>
                <li>Создание продуктовых карточек для маркетплейсов</li>
              </ul>
            </div>
          </section>

          {/* Payment Terms */}
          <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">3. Условия оплаты</h2>
            <div className="space-y-3 text-[var(--text2)] leading-relaxed">
              <p>
                <strong className="text-[var(--text)]">3.1. Способы оплаты:</strong> Оплата услуг производится через платежные
                системы Robokassa, Payform, Prodamus. Принимаются банковские карты, электронные кошельки и другие способы оплаты,
                доступные в выбранной платежной системе.
              </p>
              <p>
                <strong className="text-[var(--text)]">3.2. Момент оплаты:</strong> Оплата производится до момента начала
                генерации контента. После подтверждения оплаты услуга считается оказанной и начинается процесс генерации.
              </p>
              <p>
                <strong className="text-[var(--text)]">3.3. Цены:</strong> Стоимость услуг указана на странице{" "}
                <a href="/pricing" className="text-[var(--gold)] hover:underline">
                  Тарифы
                </a>
                . Цены могут быть изменены Исполнителем в одностороннем порядке без предварительного уведомления.
              </p>
              <p>
                <strong className="text-[var(--text)]">3.4. Валюта:</strong> Все цены указаны в российских рублях (₽).
              </p>
            </div>
          </section>

          {/* Delivery Terms */}
          <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">4. Условия оказания услуги</h2>
            <div className="space-y-3 text-[var(--text2)] leading-relaxed">
              <p>
                <strong className="text-[var(--text)]">4.1. Сроки:</strong> Услуга оказывается в течение времени, необходимого
                для генерации контента с использованием AI технологий. Сроки могут варьироваться в зависимости от сложности
                запроса и загрузки сервера.
              </p>
              <p>
                <strong className="text-[var(--text)]">4.2. Доставка результата:</strong> Результат генерации предоставляется в
                цифровом виде через личный кабинет пользователя на платформе LensRoom. Пользователь получает доступ к
                сгенерированному контенту в разделе «Мои результаты» (Библиотека).
              </p>
              <p>
                <strong className="text-[var(--text)]">4.3. Качество:</strong> Исполнитель прилагает все усилия для обеспечения
                высокого качества генерируемого контента, однако не гарантирует соответствие результата ожиданиям Пользователя.
              </p>
            </div>
          </section>

          {/* Refund Terms */}
          <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">5. Возврат денежных средств</h2>
            <div className="space-y-3 text-[var(--text2)] leading-relaxed">
              <p>
                <strong className="text-[var(--text)]">5.1. Общие условия:</strong> В соответствии с законодательством РФ,
                услуги по предоставлению цифрового контента, выполненного по индивидуальному заказу Пользователя, не подлежат
                возврату после начала оказания услуги.
              </p>
              <p>
                <strong className="text-[var(--text)]">5.2. Возврат до начала генерации:</strong> Возврат денежных средств
                возможен только в случае, если генерация не была начата. Для запроса возврата необходимо обратиться в службу
                поддержки по email:{" "}
                <a href="mailto:mti2324@gmail.com" className="text-[var(--gold)] hover:underline">
                  mti2324@gmail.com
                </a>
                .
              </p>
              <p>
                <strong className="text-[var(--text)]">5.3. Технические сбои:</strong> В случае технических сбоев, приведших к
                невозможности получения результата, Исполнитель обязуется либо повторить генерацию, либо вернуть денежные
                средства по запросу Пользователя.
              </p>
              <p>
                <strong className="text-[var(--text)]">5.4. Срок возврата:</strong> Возврат денежных средств производится в
                течение 10 рабочих дней с момента принятия положительного решения о возврате.
              </p>
            </div>
          </section>

          {/* User Rights and Obligations */}
          <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">6. Права и обязанности сторон</h2>
            <div className="space-y-3 text-[var(--text2)] leading-relaxed">
              <p>
                <strong className="text-[var(--text)]">6.1. Пользователь обязуется:</strong>
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Предоставлять достоверную информацию при регистрации</li>
                <li>Не использовать сервис для создания незаконного контента</li>
                <li>Соблюдать авторские права третьих лиц</li>
                <li>Не передавать доступ к аккаунту третьим лицам</li>
              </ul>
              <p className="mt-4">
                <strong className="text-[var(--text)]">6.2. Исполнитель обязуется:</strong>
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Обеспечивать доступность сервиса в рабочее время</li>
                <li>Обеспечивать конфиденциальность персональных данных Пользователя</li>
                <li>Предоставлять техническую поддержку</li>
              </ul>
            </div>
          </section>

          {/* Contact Information */}
          <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">7. Контактная информация</h2>
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
            <h2 className="text-xl font-semibold text-[var(--text)] mb-4">8. Заключительные положения</h2>
            <div className="space-y-3 text-[var(--text2)] leading-relaxed">
              <p>
                Исполнитель оставляет за собой право изменять настоящие Условия в одностороннем порядке. Изменения вступают в
                силу с момента их публикации на сайте.
              </p>
              <p>
                Все споры решаются путем переговоров, а при невозможности достижения соглашения — в соответствии с
                законодательством Российской Федерации.
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
