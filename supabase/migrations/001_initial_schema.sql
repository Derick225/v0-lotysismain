-- Migration initiale pour l'application PWA Lotysis
-- Création des tables principales et configuration RLS

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des résultats de tirages
CREATE TABLE IF NOT EXISTS lottery_results (
    id BIGSERIAL PRIMARY KEY,
    draw_name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    gagnants INTEGER[] NOT NULL CHECK (array_length(gagnants, 1) = 5),
    machine INTEGER[] CHECK (machine IS NULL OR array_length(machine, 1) = 5),
    source VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contraintes
    CONSTRAINT unique_draw_date UNIQUE (draw_name, date),
    CONSTRAINT valid_gagnants CHECK (
        array_length(gagnants, 1) = 5 AND
        gagnants[1] >= 1 AND gagnants[1] <= 90 AND
        gagnants[2] >= 1 AND gagnants[2] <= 90 AND
        gagnants[3] >= 1 AND gagnants[3] <= 90 AND
        gagnants[4] >= 1 AND gagnants[4] <= 90 AND
        gagnants[5] >= 1 AND gagnants[5] <= 90
    ),
    CONSTRAINT valid_machine CHECK (
        machine IS NULL OR (
            array_length(machine, 1) = 5 AND
            machine[1] >= 1 AND machine[1] <= 90 AND
            machine[2] >= 1 AND machine[2] <= 90 AND
            machine[3] >= 1 AND machine[3] <= 90 AND
            machine[4] >= 1 AND machine[4] <= 90 AND
            machine[5] >= 1 AND machine[5] <= 90
        )
    )
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_lottery_results_draw_name ON lottery_results(draw_name);
CREATE INDEX IF NOT EXISTS idx_lottery_results_date ON lottery_results(date DESC);
CREATE INDEX IF NOT EXISTS idx_lottery_results_created_at ON lottery_results(created_at DESC);

-- Table des favoris utilisateur
CREATE TABLE IF NOT EXISTS user_favorites (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    draw_name VARCHAR(100) NOT NULL,
    numbers INTEGER[] NOT NULL CHECK (array_length(numbers, 1) = 5),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contraintes
    CONSTRAINT valid_favorite_numbers CHECK (
        array_length(numbers, 1) = 5 AND
        numbers[1] >= 1 AND numbers[1] <= 90 AND
        numbers[2] >= 1 AND numbers[2] <= 90 AND
        numbers[3] >= 1 AND numbers[3] <= 90 AND
        numbers[4] >= 1 AND numbers[4] <= 90 AND
        numbers[5] >= 1 AND numbers[5] <= 90
    )
);

-- Index pour les favoris
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_draw_name ON user_favorites(draw_name);
CREATE INDEX IF NOT EXISTS idx_user_favorites_active ON user_favorites(is_active) WHERE is_active = true;

-- Table des paramètres de notification
CREATE TABLE IF NOT EXISTS notification_settings (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    draw_names TEXT[] NOT NULL DEFAULT '{}',
    reminder_minutes INTEGER DEFAULT 15 CHECK (reminder_minutes >= 1 AND reminder_minutes <= 1440),
    sound_enabled BOOLEAN DEFAULT true,
    vibration_enabled BOOLEAN DEFAULT true,
    enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Un seul paramètre par utilisateur
    CONSTRAINT unique_user_notification_settings UNIQUE (user_id)
);

-- Index pour les notifications
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_enabled ON notification_settings(enabled) WHERE enabled = true;

-- Table des prédictions
CREATE TABLE IF NOT EXISTS predictions (
    id BIGSERIAL PRIMARY KEY,
    draw_name VARCHAR(100) NOT NULL,
    prediction_date DATE NOT NULL,
    predicted_numbers INTEGER[] NOT NULL CHECK (array_length(predicted_numbers, 1) = 5),
    algorithm VARCHAR(100) NOT NULL,
    confidence DECIMAL(5,2) CHECK (confidence >= 0 AND confidence <= 100),
    actual_numbers INTEGER[] CHECK (actual_numbers IS NULL OR array_length(actual_numbers, 1) = 5),
    accuracy DECIMAL(5,2) CHECK (accuracy IS NULL OR (accuracy >= 0 AND accuracy <= 100)),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contraintes
    CONSTRAINT unique_prediction UNIQUE (draw_name, prediction_date, algorithm),
    CONSTRAINT valid_predicted_numbers CHECK (
        array_length(predicted_numbers, 1) = 5 AND
        predicted_numbers[1] >= 1 AND predicted_numbers[1] <= 90 AND
        predicted_numbers[2] >= 1 AND predicted_numbers[2] <= 90 AND
        predicted_numbers[3] >= 1 AND predicted_numbers[3] <= 90 AND
        predicted_numbers[4] >= 1 AND predicted_numbers[4] <= 90 AND
        predicted_numbers[5] >= 1 AND predicted_numbers[5] <= 90
    )
);

-- Index pour les prédictions
CREATE INDEX IF NOT EXISTS idx_predictions_draw_name ON predictions(draw_name);
CREATE INDEX IF NOT EXISTS idx_predictions_date ON predictions(prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_algorithm ON predictions(algorithm);
CREATE INDEX IF NOT EXISTS idx_predictions_accuracy ON predictions(accuracy DESC) WHERE accuracy IS NOT NULL;

-- Table des modèles ML
CREATE TABLE IF NOT EXISTS ml_models (
    id BIGSERIAL PRIMARY KEY,
    draw_name VARCHAR(100) NOT NULL,
    model_type VARCHAR(100) NOT NULL,
    model_data BYTEA, -- Données du modèle compressées
    model_metadata JSONB DEFAULT '{}',
    version VARCHAR(50) NOT NULL,
    performance_metrics JSONB DEFAULT '{}',
    file_size BIGINT,
    compression_ratio DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contraintes
    CONSTRAINT unique_model_version UNIQUE (draw_name, model_type, version)
);

-- Index pour les modèles ML
CREATE INDEX IF NOT EXISTS idx_ml_models_draw_name ON ml_models(draw_name);
CREATE INDEX IF NOT EXISTS idx_ml_models_type ON ml_models(model_type);
CREATE INDEX IF NOT EXISTS idx_ml_models_active ON ml_models(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ml_models_created_at ON ml_models(created_at DESC);

-- Table des logs d'audit
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id BIGINT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les logs d'audit
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Table de statut de synchronisation
CREATE TABLE IF NOT EXISTS sync_status (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    last_sync TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sync_direction VARCHAR(20) CHECK (sync_direction IN ('up', 'down', 'bidirectional')),
    status VARCHAR(20) CHECK (status IN ('success', 'error', 'pending')) DEFAULT 'pending',
    error_message TEXT,
    records_synced INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Un seul statut par table
    CONSTRAINT unique_table_sync_status UNIQUE (table_name)
);

-- Index pour le statut de sync
CREATE INDEX IF NOT EXISTS idx_sync_status_table_name ON sync_status(table_name);
CREATE INDEX IF NOT EXISTS idx_sync_status_last_sync ON sync_status(last_sync DESC);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_lottery_results_updated_at BEFORE UPDATE ON lottery_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_favorites_updated_at BEFORE UPDATE ON user_favorites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ml_models_updated_at BEFORE UPDATE ON ml_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction d'audit automatique
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (action, table_name, record_id, new_values, user_id)
        VALUES ('INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (action, table_name, record_id, old_values, new_values, user_id)
        VALUES ('UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (action, table_name, record_id, old_values, user_id)
        VALUES ('DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD), auth.uid());
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Triggers d'audit pour les tables importantes
CREATE TRIGGER audit_lottery_results AFTER INSERT OR UPDATE OR DELETE ON lottery_results FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_predictions AFTER INSERT OR UPDATE OR DELETE ON predictions FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_ml_models AFTER INSERT OR UPDATE OR DELETE ON ml_models FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Configuration RLS (Row Level Security)
ALTER TABLE lottery_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;
