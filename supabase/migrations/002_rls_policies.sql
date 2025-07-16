-- Politiques RLS (Row Level Security) pour l'application Lotysis

-- =====================================================
-- POLITIQUES POUR LOTTERY_RESULTS
-- =====================================================

-- Lecture publique des résultats de loterie
CREATE POLICY "Public read access for lottery_results" ON lottery_results
    FOR SELECT USING (true);

-- Insertion/modification/suppression réservée aux administrateurs
CREATE POLICY "Admin write access for lottery_results" ON lottery_results
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' = 'admin' OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "Admin update access for lottery_results" ON lottery_results
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'admin' OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "Admin delete access for lottery_results" ON lottery_results
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'admin' OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

-- =====================================================
-- POLITIQUES POUR USER_FAVORITES
-- =====================================================

-- Les utilisateurs peuvent voir et gérer leurs propres favoris
CREATE POLICY "Users can view own favorites" ON user_favorites
    FOR SELECT USING (
        auth.uid() = user_id OR 
        user_id IS NULL
    );

CREATE POLICY "Users can insert own favorites" ON user_favorites
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        (user_id IS NULL AND auth.uid() IS NOT NULL)
    );

CREATE POLICY "Users can update own favorites" ON user_favorites
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        user_id IS NULL
    );

CREATE POLICY "Users can delete own favorites" ON user_favorites
    FOR DELETE USING (
        auth.uid() = user_id OR 
        user_id IS NULL
    );

-- Les administrateurs peuvent voir tous les favoris
CREATE POLICY "Admin read access for user_favorites" ON user_favorites
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- =====================================================
-- POLITIQUES POUR NOTIFICATION_SETTINGS
-- =====================================================

-- Les utilisateurs peuvent gérer leurs propres paramètres de notification
CREATE POLICY "Users can manage own notification settings" ON notification_settings
    FOR ALL USING (
        auth.uid() = user_id OR 
        user_id IS NULL
    );

-- Les administrateurs peuvent voir tous les paramètres
CREATE POLICY "Admin read access for notification_settings" ON notification_settings
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- =====================================================
-- POLITIQUES POUR PREDICTIONS
-- =====================================================

-- Lecture publique des prédictions
CREATE POLICY "Public read access for predictions" ON predictions
    FOR SELECT USING (true);

-- Insertion/modification réservée aux services autorisés
CREATE POLICY "Service write access for predictions" ON predictions
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' = 'service_role' OR
        auth.jwt() ->> 'role' = 'admin'
    );

CREATE POLICY "Service update access for predictions" ON predictions
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        auth.jwt() ->> 'role' = 'admin'
    );

-- Suppression réservée aux administrateurs
CREATE POLICY "Admin delete access for predictions" ON predictions
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- =====================================================
-- POLITIQUES POUR ML_MODELS
-- =====================================================

-- Lecture publique des métadonnées des modèles (sans les données)
CREATE POLICY "Public read metadata for ml_models" ON ml_models
    FOR SELECT USING (true);

-- Gestion complète réservée aux services autorisés
CREATE POLICY "Service write access for ml_models" ON ml_models
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' = 'service_role' OR
        auth.jwt() ->> 'role' = 'admin'
    );

CREATE POLICY "Service update access for ml_models" ON ml_models
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        auth.jwt() ->> 'role' = 'admin'
    );

CREATE POLICY "Service delete access for ml_models" ON ml_models
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        auth.jwt() ->> 'role' = 'admin'
    );

-- =====================================================
-- POLITIQUES POUR AUDIT_LOGS
-- =====================================================

-- Lecture réservée aux administrateurs
CREATE POLICY "Admin read access for audit_logs" ON audit_logs
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Les utilisateurs peuvent voir leurs propres actions
CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT USING (
        auth.uid() = user_id
    );

-- Insertion automatique par les triggers (pas de politique restrictive)
CREATE POLICY "System insert access for audit_logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Pas de modification/suppression des logs d'audit
-- (sauf pour les administrateurs en cas de maintenance)
CREATE POLICY "Admin maintenance access for audit_logs" ON audit_logs
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'admin'
    );

CREATE POLICY "Admin maintenance delete for audit_logs" ON audit_logs
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- =====================================================
-- POLITIQUES POUR SYNC_STATUS
-- =====================================================

-- Lecture publique du statut de synchronisation
CREATE POLICY "Public read access for sync_status" ON sync_status
    FOR SELECT USING (true);

-- Gestion réservée aux services autorisés
CREATE POLICY "Service write access for sync_status" ON sync_status
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' = 'service_role' OR
        auth.jwt() ->> 'role' = 'admin'
    );

CREATE POLICY "Service update access for sync_status" ON sync_status
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        auth.jwt() ->> 'role' = 'admin'
    );

-- =====================================================
-- FONCTIONS UTILITAIRES POUR LA SÉCURITÉ
-- =====================================================

-- Fonction pour vérifier si l'utilisateur est administrateur
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.jwt() ->> 'role' = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier si l'utilisateur est un service autorisé
CREATE OR REPLACE FUNCTION is_service_role()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.jwt() ->> 'role' IN ('service_role', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir l'ID utilisateur actuel
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VUES SÉCURISÉES
-- =====================================================

-- Vue pour les statistiques publiques (sans données sensibles)
CREATE OR REPLACE VIEW public_statistics AS
SELECT 
    draw_name,
    COUNT(*) as total_draws,
    MIN(date) as first_draw,
    MAX(date) as last_draw,
    AVG(array_length(gagnants, 1)) as avg_numbers
FROM lottery_results
GROUP BY draw_name
ORDER BY draw_name;

-- Vue pour les prédictions récentes avec précision
CREATE OR REPLACE VIEW recent_predictions_with_accuracy AS
SELECT 
    p.draw_name,
    p.prediction_date,
    p.algorithm,
    p.confidence,
    p.accuracy,
    p.created_at,
    CASE 
        WHEN p.accuracy IS NOT NULL THEN 'verified'
        WHEN p.prediction_date > CURRENT_DATE THEN 'pending'
        ELSE 'unverified'
    END as status
FROM predictions p
WHERE p.created_at >= NOW() - INTERVAL '30 days'
ORDER BY p.created_at DESC;

-- Vue pour les modèles ML actifs (sans les données binaires)
CREATE OR REPLACE VIEW active_ml_models AS
SELECT 
    id,
    draw_name,
    model_type,
    version,
    performance_metrics,
    file_size,
    compression_ratio,
    created_at,
    updated_at
FROM ml_models
WHERE is_active = true
ORDER BY draw_name, model_type, created_at DESC;

-- =====================================================
-- GRANTS POUR LES VUES
-- =====================================================

GRANT SELECT ON public_statistics TO anon, authenticated;
GRANT SELECT ON recent_predictions_with_accuracy TO anon, authenticated;
GRANT SELECT ON active_ml_models TO anon, authenticated;

-- =====================================================
-- POLITIQUES POUR LES OPÉRATIONS EN BATCH
-- =====================================================

-- Fonction pour les opérations en batch (utilisée par l'API)
CREATE OR REPLACE FUNCTION batch_insert_lottery_results(results JSONB)
RETURNS INTEGER AS $$
DECLARE
    result_count INTEGER := 0;
    result_item JSONB;
BEGIN
    -- Vérifier les permissions
    IF NOT is_service_role() THEN
        RAISE EXCEPTION 'Insufficient permissions for batch operations';
    END IF;
    
    -- Insérer chaque résultat
    FOR result_item IN SELECT * FROM jsonb_array_elements(results)
    LOOP
        INSERT INTO lottery_results (draw_name, date, gagnants, machine, source)
        VALUES (
            result_item->>'draw_name',
            (result_item->>'date')::DATE,
            ARRAY(SELECT jsonb_array_elements_text(result_item->'gagnants'))::INTEGER[],
            CASE 
                WHEN result_item->'machine' IS NOT NULL 
                THEN ARRAY(SELECT jsonb_array_elements_text(result_item->'machine'))::INTEGER[]
                ELSE NULL 
            END,
            COALESCE(result_item->>'source', 'api')
        )
        ON CONFLICT (draw_name, date) DO UPDATE SET
            gagnants = EXCLUDED.gagnants,
            machine = EXCLUDED.machine,
            source = EXCLUDED.source,
            updated_at = NOW();
        
        result_count := result_count + 1;
    END LOOP;
    
    RETURN result_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant pour la fonction batch
GRANT EXECUTE ON FUNCTION batch_insert_lottery_results(JSONB) TO service_role;
