-- Migration pour le système d'authentification Lotysis
-- Création des tables pour les profils utilisateurs, préférences et sessions

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum pour les rôles utilisateurs
CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');

-- Enum pour les statuts de compte
CREATE TYPE account_status AS ENUM ('active', 'inactive', 'suspended', 'pending');

-- Table des profils utilisateurs étendus
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    status account_status DEFAULT 'active',
    phone TEXT,
    date_of_birth DATE,
    country TEXT DEFAULT 'BJ',
    city TEXT,
    bio TEXT,
    website TEXT,
    
    -- Préférences de notification
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    
    -- Statistiques utilisateur
    total_predictions INTEGER DEFAULT 0,
    successful_predictions INTEGER DEFAULT 0,
    favorite_lottery_types TEXT[] DEFAULT '{}',
    
    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    email_verified_at TIMESTAMPTZ,
    
    -- Contraintes
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$')
);

-- Table des préférences utilisateur pour l'application
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Préférences d'affichage
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    language TEXT DEFAULT 'fr' CHECK (language IN ('fr', 'en')),
    timezone TEXT DEFAULT 'Africa/Porto-Novo',
    date_format TEXT DEFAULT 'DD/MM/YYYY',
    currency TEXT DEFAULT 'XOF',
    
    -- Préférences de loterie
    default_lottery_type TEXT DEFAULT 'National',
    auto_save_predictions BOOLEAN DEFAULT true,
    show_prediction_confidence BOOLEAN DEFAULT true,
    max_predictions_history INTEGER DEFAULT 100,
    
    -- Préférences ML/IA
    enable_ai_predictions BOOLEAN DEFAULT true,
    ai_model_preference TEXT DEFAULT 'ensemble' CHECK (ai_model_preference IN ('xgboost', 'lstm', 'montecarlo', 'reinforcement', 'ensemble')),
    prediction_algorithms TEXT[] DEFAULT '{"xgboost", "lstm", "montecarlo", "reinforcement"}',
    
    -- Préférences de sécurité
    two_factor_enabled BOOLEAN DEFAULT false,
    session_timeout INTEGER DEFAULT 3600, -- en secondes
    require_password_change BOOLEAN DEFAULT false,
    
    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contrainte d'unicité
    UNIQUE(user_id)
);

-- Table de suivi des sessions utilisateur
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    session_token TEXT NOT NULL,
    
    -- Informations de session
    ip_address INET,
    user_agent TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    country TEXT,
    city TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Statut de session
    is_active BOOLEAN DEFAULT true,
    logout_reason TEXT,
    
    -- Index pour les requêtes fréquentes
    UNIQUE(session_token)
);

-- Table pour les tentatives de connexion (sécurité)
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address INET NOT NULL,
    success BOOLEAN NOT NULL,
    user_agent TEXT,
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Index pour les requêtes de sécurité
    INDEX idx_login_attempts_email_ip (email, ip_address),
    INDEX idx_login_attempts_created_at (created_at)
);

-- Table pour les tokens de récupération de mot de passe
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Index pour les requêtes
    INDEX idx_password_reset_tokens_token (token),
    INDEX idx_password_reset_tokens_expires (expires_at)
);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour créer automatiquement un profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NOW()
    );
    
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer automatiquement le profil
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fonction pour nettoyer les sessions expirées
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    UPDATE user_sessions 
    SET is_active = false, logout_reason = 'expired'
    WHERE expires_at < NOW() AND is_active = true;
    
    DELETE FROM password_reset_tokens 
    WHERE expires_at < NOW();
    
    DELETE FROM login_attempts 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Politiques RLS (Row Level Security)

-- Activer RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Politiques pour la table profiles
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Politiques pour user_preferences
CREATE POLICY "Users can manage their own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Politiques pour user_sessions
CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON user_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert sessions" ON user_sessions
    FOR INSERT WITH CHECK (true);

-- Politiques pour login_attempts (lecture seule pour les admins)
CREATE POLICY "Admins can view login attempts" ON login_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "System can insert login attempts" ON login_attempts
    FOR INSERT WITH CHECK (true);

-- Politiques pour password_reset_tokens
CREATE POLICY "System can manage password reset tokens" ON password_reset_tokens
    FOR ALL USING (true);

-- Fonction pour vérifier si un utilisateur est admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir le profil utilisateur complet
CREATE OR REPLACE FUNCTION get_user_profile(user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    role user_role,
    status account_status,
    preferences JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.full_name,
        p.avatar_url,
        p.role,
        p.status,
        to_jsonb(up.*) as preferences
    FROM profiles p
    LEFT JOIN user_preferences up ON p.id = up.user_id
    WHERE p.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insertion des données par défaut
INSERT INTO profiles (id, email, full_name, role, status) 
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'admin@lotysis.com',
    'Administrateur Lotysis',
    'admin',
    'active'
) ON CONFLICT (id) DO NOTHING;
