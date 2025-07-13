# Lotysis Database Schema Documentation

## Overview

This document describes the complete database schema for the Lotysis lottery prediction system. The schema is designed to efficiently store lottery results, machine learning models, and predictions while ensuring data integrity and security through Row-Level Security (RLS) policies.

## Schema Architecture

### Core Components
- **3 Main Tables**: `lottery_results`, `ml_models`, `ml_predictions`
- **1 Aggregated View**: `draw_statistics`
- **Performance Indexes**: Optimized for (draw_name, date) queries
- **Security**: Row-Level Security with granular access control
- **Validation**: Comprehensive constraints and check functions

## Tables

### 1. lottery_results

Stores historical lottery draw results with winning and machine numbers.

\`\`\`sql
CREATE TABLE public.lottery_results (
    id BIGSERIAL PRIMARY KEY,
    draw_name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    gagnants INTEGER[] NOT NULL CHECK (array_length(gagnants, 1) = 5),
    machine INTEGER[] CHECK (machine IS NULL OR array_length(machine, 1) = 5),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
\`\`\`

#### Columns
- `id`: Auto-incrementing primary key
- `draw_name`: Name of the lottery draw (e.g., "National", "Etoile", "Fortune")
- `date`: Date when the draw occurred (YYYY-MM-DD format)
- `gagnants`: Array of exactly 5 winning numbers (1-90)
- `machine`: Optional array of exactly 5 machine numbers (1-90)
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp (auto-updated via trigger)

#### Constraints
- **Unique**: `(draw_name, date)` - Prevents duplicate draws for same date
- **Check**: All numbers must be between 1-90
- **Check**: Arrays must contain exactly 5 numbers

#### Indexes
\`\`\`sql
-- Primary performance index
CREATE INDEX idx_lottery_results_draw_date 
    ON lottery_results (draw_name, date DESC);

-- Additional indexes
CREATE INDEX idx_lottery_results_date ON lottery_results (date DESC);
CREATE INDEX idx_lottery_results_draw_name ON lottery_results (draw_name);
\`\`\`

### 2. ml_models

Stores machine learning models and their metadata for lottery prediction.

\`\`\`sql
CREATE TABLE public.ml_models (
    id BIGSERIAL PRIMARY KEY,
    draw_name VARCHAR(100) NOT NULL,
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('lstm', 'cnn', 'ensemble', 'pattern')),
    model_data JSONB NOT NULL,
    performance_metrics JSONB,
    training_data_hash VARCHAR(64),
    version VARCHAR(20) DEFAULT '1.0.0',
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
\`\`\`

#### Columns
- `id`: Auto-incrementing primary key
- `draw_name`: Lottery draw this model predicts
- `model_type`: Type of ML model (lstm, cnn, ensemble, pattern)
- `model_data`: Serialized model data in JSON format
- `performance_metrics`: Model accuracy, loss, training time, etc.
- `training_data_hash`: Hash of training data for versioning
- `version`: Model version string
- `is_active`: Whether this model version is currently active
- `created_at`: Model creation/training timestamp

#### Model Types
1. **lstm**: Long Short-Term Memory neural networks for sequence prediction
2. **cnn**: Convolutional Neural Networks for pattern recognition
3. **ensemble**: Combined multiple models for improved accuracy
4. **pattern**: Deep pattern analysis algorithms

#### Indexes
\`\`\`sql
CREATE INDEX idx_ml_models_draw_type_active 
    ON ml_models (draw_name, model_type, is_active);
    
CREATE INDEX idx_ml_models_created_at 
    ON ml_models (created_at DESC);
\`\`\`

### 3. ml_predictions

Stores ML model predictions with confidence scores and accuracy tracking.

\`\`\`sql
CREATE TABLE public.ml_predictions (
    id BIGSERIAL PRIMARY KEY,
    draw_name VARCHAR(100) NOT NULL,
    predicted_numbers INTEGER[] NOT NULL CHECK (array_length(predicted_numbers, 1) = 5),
    confidence DECIMAL(5,2) NOT NULL CHECK (confidence BETWEEN 0 AND 100),
    model_used VARCHAR(100) NOT NULL,
    prediction_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    actual_result_id BIGINT REFERENCES lottery_results(id) ON DELETE SET NULL,
    accuracy DECIMAL(5,2) CHECK (accuracy IS NULL OR accuracy BETWEEN 0 AND 100)
);
\`\`\`

#### Columns
- `id`: Auto-incrementing primary key
- `draw_name`: Lottery draw being predicted
- `predicted_numbers`: Array of 5 predicted numbers (1-90)
- `confidence`: Prediction confidence score (0-100%)
- `model_used`: Name/identifier of the model that made this prediction
- `prediction_date`: Timestamp when prediction was made
- `actual_result_id`: Foreign key to actual lottery result (for accuracy calculation)
- `accuracy`: Calculated accuracy after actual result is known (0-100%)

#### Indexes
\`\`\`sql
CREATE INDEX idx_ml_predictions_draw_date 
    ON ml_predictions (draw_name, prediction_date DESC);
    
CREATE INDEX idx_ml_predictions_model_date 
    ON ml_predictions (model_used, prediction_date DESC);
    
CREATE INDEX idx_ml_predictions_actual_result 
    ON ml_predictions (actual_result_id) WHERE actual_result_id IS NOT NULL;
\`\`\`

## Views

### draw_statistics

Provides aggregated statistics for each draw and number frequency analysis.

\`\`\`sql
CREATE VIEW draw_statistics AS
WITH draw_stats AS (
    SELECT 
        draw_name,
        COUNT(*) as total_draws,
        MIN(date) as first_draw,
        MAX(date) as last_draw
    FROM lottery_results
    GROUP BY draw_name
),
number_frequencies AS (
    SELECT 
        draw_name,
        unnest(gagnants) as number,
        COUNT(*) as frequency
    FROM lottery_results
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
\`\`\`

#### Output Columns
- `draw_name`: Name of the lottery draw
- `total_draws`: Total number of draws for this lottery
- `first_draw`: Date of first recorded draw
- `last_draw`: Date of most recent draw
- `number`: A specific number (1-90)
- `frequency`: How many times this number appeared
- `frequency_percentage`: Percentage frequency of this number

## Row-Level Security (RLS)

### Security Model

The schema implements a three-tier security model:

1. **Anonymous Users (anon)**: Read-only access to lottery results and statistics
2. **Authenticated Users (authenticated)**: Read access to all tables
3. **Service Role (service_role)**: Full CRUD access to all tables

### RLS Policies

#### Anonymous Users
\`\`\`sql
-- Allow anonymous read access to lottery results
CREATE POLICY "anonymous_read_lottery_results" ON lottery_results
    FOR SELECT TO anon USING (true);
\`\`\`

#### Authenticated Users
\`\`\`sql
-- Allow authenticated users to read all data
CREATE POLICY "authenticated_read_lottery_results" ON lottery_results
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_ml_models" ON ml_models
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_ml_predictions" ON ml_predictions
    FOR SELECT TO authenticated USING (true);
\`\`\`

#### Service Role
\`\`\`sql
-- Allow service role full access (INSERT, UPDATE, DELETE)
CREATE POLICY "service_role_full_lottery_results" ON lottery_results
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_ml_models" ON ml_models
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_ml_predictions" ON ml_predictions
    FOR ALL TO service_role USING (true) WITH CHECK (true);
\`\`\`

## Helper Functions

### calculate_prediction_accuracy

Calculates the accuracy of a prediction against actual results.

\`\`\`sql
CREATE FUNCTION calculate_prediction_accuracy(
    predicted_numbers INTEGER[],
    actual_numbers INTEGER[]
) RETURNS DECIMAL;
\`\`\`

**Usage Example:**
\`\`\`sql
SELECT calculate_prediction_accuracy(
    ARRAY[15, 23, 42, 56, 78],  -- predicted
    ARRAY[15, 29, 42, 51, 78]   -- actual
) as accuracy_percentage;
-- Returns: 60.00 (3 out of 5 numbers matched)
\`\`\`

### get_number_frequency

Gets frequency statistics for a specific number in a draw over a time period.

\`\`\`sql
CREATE FUNCTION get_number_frequency(
    p_draw_name VARCHAR,
    p_number INTEGER,
    p_days_back INTEGER DEFAULT 365
) RETURNS TABLE(
    number INTEGER,
    frequency BIGINT,
    total_draws BIGINT,
    percentage DECIMAL
);
\`\`\`

**Usage Example:**
\`\`\`sql
-- Get frequency of number 42 in National draw over last 365 days
SELECT * FROM get_number_frequency('National', 42, 365);
\`\`\`

## Usage Examples

### 1. Insert Lottery Results

\`\`\`sql
-- Insert a new lottery result
INSERT INTO lottery_results (draw_name, date, gagnants, machine) VALUES
    ('National', '2025-01-08', ARRAY[15, 23, 42, 56, 78], ARRAY[8, 19, 33, 47, 81]);
\`\`\`

### 2. Save ML Model

\`\`\`sql
-- Save a trained LSTM model
INSERT INTO ml_models (
    draw_name, 
    model_type, 
    model_data, 
    performance_metrics,
    version
) VALUES (
    'National',
    'lstm',
    '{"weights": [...], "architecture": {...}}',
    '{"accuracy": 0.85, "loss": 0.15, "training_time": 3600}',
    '2.1.0'
);
\`\`\`

### 3. Store Prediction

\`\`\`sql
-- Store a prediction with confidence score
INSERT INTO ml_predictions (
    draw_name,
    predicted_numbers,
    confidence,
    model_used
) VALUES (
    'National',
    ARRAY[12, 25, 38, 51, 84],
    78.5,
    'LSTM Neural Network v2.1.0'
);
\`\`\`

### 4. Query Statistics

\`\`\`sql
-- Get number frequency statistics for a specific draw
SELECT 
    number,
    frequency,
    frequency_percentage
FROM draw_statistics 
WHERE draw_name = 'National'
ORDER BY frequency DESC
LIMIT 10;

-- Get most frequent numbers across all draws
SELECT 
    number,
    SUM(frequency) as total_frequency,
    ROUND(AVG(frequency_percentage), 2) as avg_percentage
FROM draw_statistics
GROUP BY number
ORDER BY total_frequency DESC
LIMIT 20;
\`\`\`

### 5. Analyze Model Performance

\`\`\`sql
-- Get prediction accuracy for a specific model
SELECT 
    model_used,
    AVG(accuracy) as avg_accuracy,
    COUNT(*) as total_predictions,
    COUNT(CASE WHEN accuracy >= 60 THEN 1 END) as good_predictions
FROM ml_predictions 
WHERE accuracy IS NOT NULL
  AND prediction_date >= NOW() - INTERVAL '30 days'
GROUP BY model_used
ORDER BY avg_accuracy DESC;
\`\`\`

## Data Validation

### Constraints Summary

1. **lottery_results**:
   - Unique combination of draw_name and date
   - Exactly 5 winning numbers (1-90)
   - Optional 5 machine numbers (1-90)

2. **ml_models**:
   - Model type must be: lstm, cnn, ensemble, or pattern
   - Only one active model per (draw_name, model_type)
   - Model data required in JSON format

3. **ml_predictions**:
   - Exactly 5 predicted numbers (1-90)
   - Confidence score between 0-100
   - Accuracy score between 0-100 (if provided)

### Data Integrity Features

- **Foreign Keys**: ml_predictions.actual_result_id → lottery_results.id
- **Check Constraints**: Number ranges, array lengths, enum values
- **Unique Constraints**: Prevent duplicate draws, enforce model uniqueness
- **Triggers**: Auto-update timestamps on record changes

## Performance Considerations

### Optimized Queries

The schema is optimized for these common query patterns:

1. **Recent results by draw**: `(draw_name, date DESC)`
2. **Date range queries**: `(date DESC)`
3. **Active model lookup**: `(draw_name, model_type, is_active)`
4. **Recent predictions**: `(draw_name, prediction_date DESC)`

### Recommended Practices

1. **Indexes**: Utilize composite indexes for multi-column queries
2. **Partitioning**: Consider partitioning lottery_results by date for large datasets
3. **Archival**: Implement data archival strategy for old predictions
4. **Caching**: Cache frequently accessed statistics in application layer

## Security Considerations

### Access Control

- **Public Data**: Only lottery results and statistics are publicly accessible
- **Authenticated Access**: Full read access to all tables for logged-in users
- **Admin Operations**: Only service role can modify data

### Data Protection

- **RLS Enforcement**: All tables have RLS enabled
- **Policy Validation**: Policies tested for each user role
- **Audit Trail**: Timestamps track all data modifications

## Migration and Deployment

### Running the Migration

1. Open Supabase SQL Editor
2. Copy and paste the migration file: `supabase/migrations/20250108_initial_lottery_schema.sql`
3. Execute the migration
4. Verify schema validation passes

### Post-Migration Steps

1. **Test RLS Policies**: Verify access controls with different user roles
2. **Load Sample Data**: Use provided sample data for testing
3. **Update Application**: Modify application code to use new schema
4. **Monitor Performance**: Check query performance with real data

### Environment Variables

Ensure these environment variables are configured:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
\`\`\`

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**: Ensure user has correct role assigned
2. **Array Validation**: Check that all number arrays have exactly 5 elements
3. **Number Range**: Verify all numbers are between 1-90
4. **Unique Violations**: Check for duplicate (draw_name, date) combinations

### Debug Queries

\`\`\`sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Verify indexes
SELECT * FROM pg_indexes WHERE schemaname = 'public';

-- Check constraints
SELECT * FROM information_schema.check_constraints 
WHERE constraint_schema = 'public';
\`\`\`

## Support and Maintenance

### Regular Maintenance

1. **Monitor Index Usage**: `pg_stat_user_indexes`
2. **Analyze Query Performance**: `pg_stat_statements`
3. **Update Statistics**: `ANALYZE` tables regularly
4. **Cleanup Old Data**: Implement archival procedures

### Schema Updates

Future schema changes should:
1. Use migration files with timestamps
2. Include rollback procedures
3. Test with production-like data volumes
4. Document breaking changes

---

This schema provides a robust foundation for the Lotysis lottery prediction system with comprehensive security, performance optimization, and data integrity features.
