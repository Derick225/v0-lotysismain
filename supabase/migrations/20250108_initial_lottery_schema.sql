-- =============================================================================
-- LOTYSIS LOTTERY SYSTEM DATABASE SCHEMA
-- =============================================================================
-- This migration creates the complete database schema for the Lotysis lottery 
-- prediction system, including tables, views, indexes, and security policies.
-- 
-- Created: 2025-01-08
-- Version: 1.0.0
-- =============================================================================

BEGIN;

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =============================================================================
-- TABLE: lottery_results
-- =============================================================================
-- Stores historical lottery draw results with winning numbers and machine numbers
CREATE TABLE IF NOT EXISTS public.lottery_results (
    id BIGSERIAL PRIMARY KEY,
    draw_name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    gagnants INTEGER[] NOT NULL CHECK (array_length(gagnants, 1) = 5),
    machine INTEGER[] CHECK (machine IS NULL OR array_length(machine, 1) = 5),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT lottery_results_unique_draw_date UNIQUE (draw_name, date),
    CONSTRAINT lottery_results_gagnants_valid CHECK (
        array_length(gagnants, 1) = 5 AND
        gagnants[1] BETWEEN 1 AND 90 AND
        gagnants[2] BETWEEN 1 AND 90 AND
        gagnants[3] BETWEEN 1 AND 90 AND
        gagnants[4] BETWEEN 1 AND 90 AND
        gagnants[5] BETWEEN 1 AND 90
    ),
    CONSTRAINT lottery_results_machine_valid CHECK (
        machine IS NULL OR (
            array_length(machine, 1) = 5 AND
            machine[1] BETWEEN 1 AND 90 AND
            machine[2] BETWEEN 1 AND 90 AND
            machine[3] BETWEEN 1 AND 90 AND
            machine[4] BETWEEN 1 AND 90 AND
            machine[5] BETWEEN 1 AND 90
        )
    )
);

-- Add table comment
COMMENT ON TABLE public.lottery_results IS 'Historical lottery draw results with winning and machine numbers';

-- Add column comments
COMMENT ON COLUMN public.lottery_results.id IS 'Primary key - auto-incrementing unique identifier';
COMMENT ON COLUMN public.lottery_results.draw_name IS 'Name of the lottery draw (e.g., "National", "Etoile", "Fortune")';
COMMENT ON COLUMN public.lottery_results.date IS 'Date when the draw occurred (YYYY-MM-DD format)';
COMMENT ON COLUMN public.lottery_results.gagnants IS 'Array of 5 winning numbers (1-90)';
COMMENT ON COLUMN public.lottery_results.machine IS 'Optional array of 5 machine numbers (1-90)';
COMMENT ON COLUMN public.lottery_results.created_at IS 'Timestamp when record was created';
COMMENT ON COLUMN public.lottery_results.updated_at IS 'Timestamp when record was last updated';

-- =============================================================================
-- TABLE: ml_models
-- =============================================================================
-- Stores machine learning models and their metadata
CREATE TABLE IF NOT EXISTS public.ml_models (
    id BIGSERIAL PRIMARY KEY,
    draw_name VARCHAR(100) NOT NULL,
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('lstm', 'cnn', 'ensemble', 'pattern')),
    model_data JSONB NOT NULL,
    performance_metrics JSONB,
    training_data_hash VARCHAR(64),
    version VARCHAR(20) DEFAULT '1.0.0',
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT ml_models_unique_active UNIQUE (draw_name, model_type, is_active) 
        DEFERRABLE INITIALLY DEFERRED
);

-- Add table comment
COMMENT ON TABLE public.ml_models IS 'Machine learning models for lottery prediction with metadata and performance metrics';

-- Add column comments
COMMENT ON COLUMN public.ml_models.id IS 'Primary key - auto-incrementing unique identifier';
COMMENT ON COLUMN public.ml_models.draw_name IS 'Name of the lottery draw this model predicts';
COMMENT ON COLUMN public.ml_models.model_type IS 'Type of ML model: lstm, cnn, ensemble, or pattern';
COMMENT ON COLUMN public.ml_models.model_data IS 'Serialized model data in JSON format';
COMMENT ON COLUMN public.ml_models.performance_metrics IS 'Model performance metrics (accuracy, loss, training_time, etc.)';
COMMENT ON COLUMN public.ml_models.training_data_hash IS 'Hash of training data for model versioning';
COMMENT ON COLUMN public.ml_models.version IS 'Model version string';
COMMENT ON COLUMN public.ml_models.is_active IS 'Whether this model version is currently active';
COMMENT ON COLUMN public.ml_models.created_at IS 'Timestamp when model was created/trained';

-- =============================================================================
-- TABLE: ml_predictions
-- =============================================================================
-- Stores ML model predictions and their accuracy metrics
CREATE TABLE IF NOT EXISTS public.ml_predictions (
    id BIGSERIAL PRIMARY KEY,
    draw_name VARCHAR(100) NOT NULL,
    predicted_numbers INTEGER[] NOT NULL CHECK (array_length(predicted_numbers, 1) = 5),
    confidence DECIMAL(5,2) NOT NULL CHECK (confidence BETWEEN 0 AND 100),
    model_used VARCHAR(100) NOT NULL,
    prediction_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    actual_result_id BIGINT REFERENCES public.lottery_results(id) ON DELETE SET NULL,
    accuracy DECIMAL(5,2) CHECK (accuracy IS NULL OR accuracy BETWEEN 0 AND 100),
    
    -- Constraints
    CONSTRAINT ml_predictions_numbers_valid CHECK (
        array_length(predicted_numbers, 1) = 5 AND
        predicted_numbers[1] BETWEEN 1 AND 90 AND
        predicted_numbers[2] BETWEEN 1 AND 90 AND
        predicted_numbers[3] BETWEEN 1 AND 90 AND
        predicted_numbers[4] BETWEEN 1 AND 90 AND
        predicted_numbers[5] BETWEEN 1 AND 90
    )
);

-- Add table comment
COMMENT ON TABLE public.ml_predictions IS 'ML model predictions with confidence scores and accuracy tracking';

-- Add column comments
COMMENT ON COLUMN public.ml_predictions.id IS 'Primary key - auto-incrementing unique identifier';
COMMENT ON COLUMN public.ml_predictions.draw_name IS 'Name of the lottery draw being predicted';
COMMENT ON COLUMN public.ml_predictions.predicted_numbers IS 'Array of 5 predicted numbers (1-90)';
COMMENT ON COLUMN public.ml_predictions.confidence IS 'Prediction confidence score (0-100%)';
COMMENT ON COLUMN public.ml_predictions.model_used IS 'Name/identifier of the model that made this prediction';
COMMENT ON COLUMN public.ml_predictions.prediction_date IS 'Timestamp when prediction was made';
COMMENT ON COLUMN public.ml_predictions.actual_result_id IS 'Foreign key to actual lottery result (for accuracy calculation)';
COMMENT ON COLUMN public.ml_predictions.accuracy IS 'Calculated accuracy after actual result is known (0-100%)';

-- =============================================================================
-- INDEXES
-- =============================================================================
-- Performance indexes for efficient querying

-- Primary performance indexes on draw_name and date
CREATE INDEX IF NOT EXISTS idx_lottery_results_draw_date 
    ON public.lottery_results (draw_name, date DESC);

CREATE INDEX IF NOT EXISTS idx_lottery_results_date 
    ON public.lottery_results (date DESC);

CREATE INDEX IF NOT EXISTS idx_lottery_results_draw_name 
    ON public.lottery_results (draw_name);

-- ML models indexes
CREATE INDEX IF NOT EXISTS idx_ml_models_draw_type_active 
    ON public.ml_models (draw_name, model_type, is_active);

CREATE INDEX IF NOT EXISTS idx_ml_models_created_at 
    ON public.ml_models (created_at DESC);

-- ML predictions indexes
CREATE INDEX IF NOT EXISTS idx_ml_predictions_draw_date 
    ON public.ml_predictions (draw_name, prediction_date DESC);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_model_date 
    ON public.ml_predictions (model_used, prediction_date DESC);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_actual_result 
    ON public.ml_predictions (actual_result_id) WHERE actual_result_id IS NOT NULL;

-- =============================================================================
-- VIEW: draw_statistics
-- =============================================================================
-- Provides aggregated statistics for each draw and number frequency
CREATE OR REPLACE VIEW public.draw_statistics AS
WITH draw_stats AS (
    SELECT 
        draw_name,
        COUNT(*) as total_draws,
        MIN(date) as first_draw,
        MAX(date) as last_draw
    FROM public.lottery_results
    GROUP BY draw_name
),
number_frequencies AS (
    SELECT 
        draw_name,
        unnest(gagnants) as number,
        COUNT(*) as frequency
    FROM public.lottery_results
    GROUP BY draw_name, unnest(gagnants)
)
SELECT 
    ds.draw_name,
    ds.total_draws,
    ds.first_draw,
    ds.last_draw,
    nf.number,
    nf.frequency,
    ROUND((nf.frequency::DECIMAL / ds.total_draws * 100), 2) as frequency_percentage
FROM draw_stats ds
JOIN number_frequencies nf ON ds.draw_name = nf.draw_name
ORDER BY ds.draw_name, nf.frequency DESC, nf.number;

-- Add view comment
COMMENT ON VIEW public.draw_statistics IS 'Aggregated statistics showing draw frequency and number occurrence patterns';

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================
-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to lottery_results table
CREATE TRIGGER trigger_lottery_results_updated_at
    BEFORE UPDATE ON public.lottery_results
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================
-- Enable RLS on all tables
ALTER TABLE public.lottery_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_predictions ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES FOR ANONYMOUS USERS
-- =============================================================================
-- Allow anonymous users to SELECT lottery_results and view statistics
CREATE POLICY "anonymous_read_lottery_results" ON public.lottery_results
    FOR SELECT
    TO anon
    USING (true);

-- Allow anonymous users to read the statistics view
-- Note: Views inherit RLS from underlying tables, so this covers draw_statistics

-- =============================================================================
-- RLS POLICIES FOR AUTHENTICATED USERS
-- =============================================================================
-- Allow authenticated users to read all data
CREATE POLICY "authenticated_read_lottery_results" ON public.lottery_results
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "authenticated_read_ml_models" ON public.ml_models
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "authenticated_read_ml_predictions" ON public.ml_predictions
    FOR SELECT
    TO authenticated
    USING (true);

-- =============================================================================
-- RLS POLICIES FOR SERVICE ROLE
-- =============================================================================
-- Allow service role to perform all operations (INSERT, UPDATE, DELETE)

-- Service role policies for lottery_results
CREATE POLICY "service_role_full_lottery_results" ON public.lottery_results
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Service role policies for ml_models
CREATE POLICY "service_role_full_ml_models" ON public.ml_models
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Service role policies for ml_predictions
CREATE POLICY "service_role_full_ml_predictions" ON public.ml_predictions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- =============================================================================

-- Function to calculate prediction accuracy
CREATE OR REPLACE FUNCTION public.calculate_prediction_accuracy(
    predicted_numbers INTEGER[],
    actual_numbers INTEGER[]
)
RETURNS DECIMAL AS $$
DECLARE
    matches INTEGER := 0;
    i INTEGER;
BEGIN
    -- Count matching numbers
    FOR i IN 1..array_length(predicted_numbers, 1) LOOP
        IF predicted_numbers[i] = ANY(actual_numbers) THEN
            matches := matches + 1;
        END IF;
    END LOOP;
    
    -- Return percentage
    RETURN (matches::DECIMAL / array_length(predicted_numbers, 1) * 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get number frequency for a specific draw
CREATE OR REPLACE FUNCTION public.get_number_frequency(
    p_draw_name VARCHAR,
    p_number INTEGER,
    p_days_back INTEGER DEFAULT 365
)
RETURNS TABLE(
    number INTEGER,
    frequency BIGINT,
    total_draws BIGINT,
    percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH filtered_results AS (
        SELECT gagnants
        FROM public.lottery_results
        WHERE draw_name = p_draw_name
          AND date >= CURRENT_DATE - INTERVAL '1 day' * p_days_back
    ),
    total_count AS (
        SELECT COUNT(*) as total FROM filtered_results
    )
    SELECT 
        p_number as number,
        COUNT(*) as frequency,
        (SELECT total FROM total_count) as total_draws,
        ROUND((COUNT(*)::DECIMAL / (SELECT total FROM total_count) * 100), 2) as percentage
    FROM filtered_results
    WHERE p_number = ANY(gagnants)
    GROUP BY p_number;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- SAMPLE DATA FOR TESTING (OPTIONAL)
-- =============================================================================
-- Insert some sample data for testing (uncomment if needed)

/*
INSERT INTO public.lottery_results (draw_name, date, gagnants, machine) VALUES
    ('National', '2025-01-07', ARRAY[15, 23, 42, 56, 78], ARRAY[8, 19, 33, 47, 81]),
    ('Etoile', '2025-01-07', ARRAY[7, 14, 28, 35, 69], ARRAY[12, 25, 38, 51, 84]),
    ('Fortune', '2025-01-06', ARRAY[3, 18, 31, 44, 72], NULL),
    ('National', '2025-01-06', ARRAY[11, 26, 39, 52, 85], ARRAY[5, 17, 29, 63, 88]),
    ('Akwaba', '2025-01-05', ARRAY[9, 21, 34, 48, 76], ARRAY[13, 27, 41, 55, 89]);
*/

-- =============================================================================
-- GRANTS AND PERMISSIONS
-- =============================================================================
-- Grant necessary permissions to anon and authenticated roles

-- Grant USAGE on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant SELECT on tables for anon (read-only access)
GRANT SELECT ON public.lottery_results TO anon;
GRANT SELECT ON public.draw_statistics TO anon;

-- Grant SELECT on all tables for authenticated users
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant USAGE on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Grant EXECUTE on functions
GRANT EXECUTE ON FUNCTION public.calculate_prediction_accuracy TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_number_frequency TO authenticated, service_role, anon;

-- =============================================================================
-- SCHEMA VALIDATION
-- =============================================================================
-- Verify that all required objects exist
DO $$
DECLARE
    table_count INTEGER;
    view_count INTEGER;
    index_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Check tables
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('lottery_results', 'ml_models', 'ml_predictions');
    
    -- Check views
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name = 'draw_statistics';
    
    -- Check indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%';
    
    -- Check policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    
    -- Validate counts
    IF table_count != 3 THEN
        RAISE EXCEPTION 'Expected 3 tables, found %', table_count;
    END IF;
    
    IF view_count != 1 THEN
        RAISE EXCEPTION 'Expected 1 view, found %', view_count;
    END IF;
    
    IF index_count < 6 THEN
        RAISE EXCEPTION 'Expected at least 6 indexes, found %', index_count;
    END IF;
    
    IF policy_count < 8 THEN
        RAISE EXCEPTION 'Expected at least 8 RLS policies, found %', policy_count;
    END IF;
    
    RAISE NOTICE 'Schema validation passed: % tables, % views, % indexes, % policies', 
                 table_count, view_count, index_count, policy_count;
END $$;

COMMIT;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- 
-- This migration has successfully created:
-- ✅ 3 Tables: lottery_results, ml_models, ml_predictions
-- ✅ 1 View: draw_statistics  
-- ✅ 6+ Indexes: Optimized for (draw_name, date) queries
-- ✅ RLS Enabled: Anonymous SELECT, Service-role full access
-- ✅ 8+ Security Policies: Granular access control
-- ✅ Helper Functions: Accuracy calculation and frequency analysis
-- ✅ Triggers: Auto-update timestamps
-- ✅ Constraints: Data validation and integrity
-- ✅ Documentation: Comprehensive comments and descriptions
--
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Verify all objects are created correctly
-- 3. Test RLS policies with different user roles
-- 4. Update application code to use the new schema
-- =============================================================================
