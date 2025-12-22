-- Создание таблицы для подписок (если нужно хранить в БД)
-- НО: данные тарифов уже есть в src/config/pricing-new.ts
-- Эта миграция нужна только если вы хотите управлять тарифами через БД

-- Таблица тарифов (опционально)
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  stars INTEGER NOT NULL,
  period TEXT DEFAULT 'month',
  limits JSONB NOT NULL,
  features JSONB NOT NULL,
  description TEXT,
  badge TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Вставка новых тарифов
INSERT INTO subscription_tiers (id, name, price, stars, period, limits, features, description, badge) VALUES
  ('free', 'Free', 0, 0, 'day', 
   '{"nanoBanana": 5, "nanoPro": 0, "tools": 5}'::jsonb,
   '{"watermark": true, "commercial": false, "priority": false, "earlyAccess": false}'::jsonb,
   'Попробуйте бесплатно', NULL),
  
  ('lite', 'Lite', 590, 0, 'month',
   '{"nanoBanana": "unlimited", "nanoPro": 0, "tools": 50}'::jsonb,
   '{"watermark": false, "commercial": true, "priority": false, "earlyAccess": false}'::jsonb,
   'Для старта', NULL),
  
  ('creator', 'Creator', 1490, 500, 'month',
   '{"nanoBanana": "unlimited", "nanoPro": 30, "tools": 100}'::jsonb,
   '{"watermark": false, "commercial": true, "priority": false, "earlyAccess": false}'::jsonb,
   'Для блогеров и SMM', 'popular'),
  
  ('creator-pro', 'Creator Pro', 3490, 1500, 'month',
   '{"nanoBanana": "unlimited", "nanoPro": 150, "tools": 300}'::jsonb,
   '{"watermark": false, "commercial": true, "priority": false, "earlyAccess": false}'::jsonb,
   'Для профессиональных креаторов', NULL),
  
  ('studio', 'Studio', 5990, 4000, 'month',
   '{"nanoBanana": "unlimited", "nanoPro": 300, "tools": 500}'::jsonb,
   '{"watermark": false, "commercial": true, "priority": true, "earlyAccess": false}'::jsonb,
   'Для команд', NULL),
  
  ('agency', 'Agency', 9990, 8000, 'month',
   '{"nanoBanana": "unlimited", "nanoPro": 500, "tools": 1000}'::jsonb,
   '{"watermark": false, "commercial": true, "priority": true, "earlyAccess": true}'::jsonb,
   'Для агентств', NULL)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  stars = EXCLUDED.stars,
  period = EXCLUDED.period,
  limits = EXCLUDED.limits,
  features = EXCLUDED.features,
  description = EXCLUDED.description,
  badge = EXCLUDED.badge,
  updated_at = NOW();

-- Таблица пакетов звёзд (опционально)
CREATE TABLE IF NOT EXISTS star_packs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  stars INTEGER NOT NULL,
  discount INTEGER,
  badge TEXT,
  description TEXT,
  examples JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Вставка пакетов
INSERT INTO star_packs (id, name, price, stars, discount, badge, description, examples) VALUES
  ('starter', 'Starter', 590, 800, NULL, NULL, 
   'Попробовать премиум-модели',
   '{"veoFast": 7, "nanoPro": 22}'::jsonb),
  
  ('basic', 'Basic', 1490, 2200, 8, NULL,
   'Для небольшого проекта',
   '{"veoFast": 20, "nanoPro": 62}'::jsonb),
  
  ('pro', 'Pro', 2990, 4800, 15, 'popular',
   'Оптимальный выбор',
   '{"veoFast": 43, "nanoPro": 137}'::jsonb),
  
  ('business', 'Business', 5990, 10000, 20, NULL,
   'Для серьёзных задач',
   '{"veoFast": 90, "nanoPro": 285}'::jsonb),
  
  ('agency', 'Agency', 9990, 18000, 25, NULL,
   'Максимальная выгода',
   '{"veoFast": 163, "nanoPro": 514}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  stars = EXCLUDED.stars,
  discount = EXCLUDED.discount,
  badge = EXCLUDED.badge,
  description = EXCLUDED.description,
  examples = EXCLUDED.examples,
  updated_at = NOW();

-- Комментарий
COMMENT ON TABLE subscription_tiers IS 'Тарифы подписок (опционально, данные также в src/config/pricing-new.ts)';
COMMENT ON TABLE star_packs IS 'Пакеты звёзд (опционально, данные также в src/config/pricing-new.ts)';


