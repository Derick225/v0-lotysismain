-- Migration pour les tables de synchronisation cloud Lotysis
-- Créé pour la Phase 3.1 - Système de Synchronisation Cloud Automatique

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des prédictions synchronisées
CREATE TABLE IF NOT EXISTS predictions (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    draw_name TEXT NOT NULL,
    algorithm TEXT NOT NULL,
    algorithm_version TEXT NOT NULL DEFAULT '1.0',
    predictions INTEGER[] NOT NULL,
    confidence NUMERIC(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    reasoning TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    actual_result INTEGER[] DEFAULT NULL,
    verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMPTZ DEFAULT NULL,
    performance JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_draw_name ON predictions(draw_name);
CREATE INDEX IF NOT EXISTS idx_predictions_timestamp ON predictions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_verified ON predictions(verified);
CREATE INDEX IF NOT EXISTS idx_predictions_algorithm ON predictions(algorithm);

-- Table des préférences utilisateur
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    preferences JSONB NOT NULL DEFAULT '{}',
    sync_settings JSONB DEFAULT '{
        "autoSync": true,
        "syncInterval": 5,
        "conflictResolution": "timestamp_priority",
        "syncOnlyOnWifi": false,
        "backgroundSync": true,
        "maxRetries": 3
    }',
    accessibility_settings JSONB DEFAULT '{
        "highContrast": false,
        "largeText": false,
        "reducedMotion": false,
        "screenReaderMode": false,
        "keyboardNavigation": true,
        "focusVisible": true,
        "announcements": true
    }',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les préférences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Table des résultats de tirages (pour synchronisation communautaire)
CREATE TABLE IF NOT EXISTS draw_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draw_name TEXT NOT NULL,
    date DATE NOT NULL,
    gagnants INTEGER[] NOT NULL,
    machine INTEGER[] DEFAULT NULL,
    source TEXT DEFAULT 'user_input',
    verified BOOLEAN DEFAULT FALSE,
    verification_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(draw_name, date)
);

-- Index pour les résultats
CREATE INDEX IF NOT EXISTS idx_draw_results_draw_name ON draw_results(draw_name);
CREATE INDEX IF NOT EXISTS idx_draw_results_date ON draw_results(date DESC);
CREATE INDEX IF NOT EXISTS idx_draw_results_verified ON draw_results(verified);

-- Table des logs de synchronisation
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'partial', 'conflict_resolution')),
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'cancelled')),
    details JSONB DEFAULT '{}',
    error_message TEXT DEFAULT NULL,
    duration_ms INTEGER DEFAULT NULL,
    data_transferred_kb NUMERIC(10,2) DEFAULT NULL,
    conflicts_detected INTEGER DEFAULT 0,
    conflicts_resolved INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les logs
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_id ON sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);

-- Table des conflits de synchronisation
CREATE TABLE IF NOT EXISTS sync_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    conflict_type TEXT NOT NULL CHECK (conflict_type IN ('prediction', 'preference', 'draw_result')),
    entity_id TEXT NOT NULL,
    local_data JSONB NOT NULL,
    remote_data JSONB NOT NULL,
    resolution TEXT DEFAULT NULL CHECK (resolution IS NULL OR resolution IN ('local', 'remote', 'merge', 'manual')),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ DEFAULT NULL,
    resolved_by TEXT DEFAULT NULL, -- 'auto' ou 'user'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les conflits
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_user_id ON sync_conflicts(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_resolved ON sync_conflicts(resolved);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_type ON sync_conflicts(conflict_type);

-- Table des métriques de synchronisation
CREATE TABLE IF NOT EXISTS sync_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_syncs INTEGER DEFAULT 0,
    successful_syncs INTEGER DEFAULT 0,
    failed_syncs INTEGER DEFAULT 0,
    average_duration_ms NUMERIC(10,2) DEFAULT NULL,
    total_data_transferred_kb NUMERIC(15,2) DEFAULT 0,
    conflicts_detected INTEGER DEFAULT 0,
    conflicts_resolved INTEGER DEFAULT 0,
    last_sync_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Index pour les métriques
CREATE INDEX IF NOT EXISTS idx_sync_metrics_user_id ON sync_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_metrics_date ON sync_metrics(date DESC);

-- Fonctions pour mettre à jour les timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour les timestamps
CREATE TRIGGER update_predictions_updated_at 
    BEFORE UPDATE ON predictions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_draw_results_updated_at 
    BEFORE UPDATE ON draw_results 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_metrics_updated_at 
    BEFORE UPDATE ON sync_metrics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour mettre à jour les métriques de synchronisation
CREATE OR REPLACE FUNCTION update_sync_metrics(
    p_user_id UUID,
    p_sync_success BOOLEAN,
    p_duration_ms INTEGER,
    p_data_transferred_kb NUMERIC,
    p_conflicts_detected INTEGER DEFAULT 0,
    p_conflicts_resolved INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO sync_metrics (
        user_id, 
        date, 
        total_syncs, 
        successful_syncs, 
        failed_syncs,
        average_duration_ms,
        total_data_transferred_kb,
        conflicts_detected,
        conflicts_resolved,
        last_sync_at
    ) VALUES (
        p_user_id,
        CURRENT_DATE,
        1,
        CASE WHEN p_sync_success THEN 1 ELSE 0 END,
        CASE WHEN p_sync_success THEN 0 ELSE 1 END,
        p_duration_ms,
        p_data_transferred_kb,
        p_conflicts_detected,
        p_conflicts_resolved,
        NOW()
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
        total_syncs = sync_metrics.total_syncs + 1,
        successful_syncs = sync_metrics.successful_syncs + CASE WHEN p_sync_success THEN 1 ELSE 0 END,
        failed_syncs = sync_metrics.failed_syncs + CASE WHEN p_sync_success THEN 0 ELSE 1 END,
        average_duration_ms = (
            (sync_metrics.average_duration_ms * sync_metrics.total_syncs + p_duration_ms) / 
            (sync_metrics.total_syncs + 1)
        ),
        total_data_transferred_kb = sync_metrics.total_data_transferred_kb + p_data_transferred_kb,
        conflicts_detected = sync_metrics.conflicts_detected + p_conflicts_detected,
        conflicts_resolved = sync_metrics.conflicts_resolved + p_conflicts_resolved,
        last_sync_at = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Politiques RLS (Row Level Security)
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_metrics ENABLE ROW LEVEL SECURITY;

-- Politiques pour les prédictions
CREATE POLICY "Users can view their own predictions" ON predictions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own predictions" ON predictions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own predictions" ON predictions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own predictions" ON predictions
    FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour les préférences utilisateur
CREATE POLICY "Users can view their own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Politiques pour les résultats de tirages (lecture publique, écriture authentifiée)
CREATE POLICY "Anyone can view draw results" ON draw_results
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert draw results" ON draw_results
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own draw results" ON draw_results
    FOR UPDATE USING (auth.uid() = created_by);

-- Politiques pour les logs de synchronisation
CREATE POLICY "Users can view their own sync logs" ON sync_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync logs" ON sync_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politiques pour les conflits de synchronisation
CREATE POLICY "Users can view their own sync conflicts" ON sync_conflicts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync conflicts" ON sync_conflicts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync conflicts" ON sync_conflicts
    FOR UPDATE USING (auth.uid() = user_id);

-- Politiques pour les métriques de synchronisation
CREATE POLICY "Users can view their own sync metrics" ON sync_metrics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync metrics" ON sync_metrics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync metrics" ON sync_metrics
    FOR UPDATE USING (auth.uid() = user_id);

-- Vues pour les statistiques globales (anonymisées)
CREATE OR REPLACE VIEW public_sync_stats AS
SELECT 
    COUNT(DISTINCT user_id) as total_users,
    SUM(total_syncs) as total_syncs_all_users,
    AVG(average_duration_ms) as avg_sync_duration,
    SUM(total_data_transferred_kb) as total_data_transferred,
    SUM(conflicts_detected) as total_conflicts_detected,
    SUM(conflicts_resolved) as total_conflicts_resolved,
    (SUM(successful_syncs)::FLOAT / NULLIF(SUM(total_syncs), 0) * 100) as global_success_rate
FROM sync_metrics
WHERE date >= CURRENT_DATE - INTERVAL '30 days';

-- Commentaires pour la documentation
COMMENT ON TABLE predictions IS 'Stockage des prédictions utilisateur avec synchronisation cloud';
COMMENT ON TABLE user_preferences IS 'Préférences utilisateur synchronisées entre appareils';
COMMENT ON TABLE draw_results IS 'Résultats de tirages partagés par la communauté';
COMMENT ON TABLE sync_logs IS 'Logs détaillés des opérations de synchronisation';
COMMENT ON TABLE sync_conflicts IS 'Conflits de synchronisation en attente de résolution';
COMMENT ON TABLE sync_metrics IS 'Métriques agrégées de synchronisation par utilisateur et par jour';

-- Finalisation
SELECT 'Migration 001_cloud_sync_tables.sql appliquée avec succès' as status;
