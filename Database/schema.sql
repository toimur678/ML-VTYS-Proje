-- ============================================
-- SMART CITY ENERGY CONSUMPTION PREDICTION SYSTEM
-- Home Energy Bill Predictor - Database Schema
-- PostgreSQL Database on Supabase
-- Created by: Sharonne 
-- Date: December 2024
-- ============================================
-- This file contains EXACTLY what was executed on Supabase
-- ============================================

-- ============================================
-- STEP 1: DROP EXISTING TABLES (Clean Start)
-- ============================================

DROP TABLE IF EXISTS BillHistory CASCADE;
DROP TABLE IF EXISTS Predictions CASCADE;
DROP TABLE IF EXISTS Appliances CASCADE;
DROP TABLE IF EXISTS EnergyConsumption CASCADE;
DROP TABLE IF EXISTS Homes CASCADE;
DROP TABLE IF EXISTS Users CASCADE;

-- ============================================
-- STEP 2: CREATE TABLES WITH ALL CONSTRAINTS
-- ============================================

-- TABLE 1: Users
CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- TABLE 2: Homes
CREATE TABLE Homes (
    home_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    address TEXT NOT NULL,
    home_type VARCHAR(50) NOT NULL CHECK (home_type IN ('apartment', 'house')),
    size_m2 DECIMAL(8,2) CHECK (size_m2 > 0),
    num_rooms INT CHECK (num_rooms > 0),
    has_ac BOOLEAN DEFAULT false,
    has_heater BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_homes_user FOREIGN KEY (user_id) 
        REFERENCES Users(user_id) ON DELETE CASCADE
);

-- TABLE 3: EnergyConsumption
CREATE TABLE EnergyConsumption (
    consumption_id SERIAL PRIMARY KEY,
    home_id INT NOT NULL,
    month INT CHECK (month BETWEEN 1 AND 12),
    year INT CHECK (year >= 2020),
    kwh_used DECIMAL(10,2) CHECK (kwh_used >= 0),
    bill_amount DECIMAL(10,2) CHECK (bill_amount >= 0),
    avg_temperature DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_consumption_home FOREIGN KEY (home_id) 
        REFERENCES Homes(home_id) ON DELETE CASCADE,
    CONSTRAINT unique_consumption_period UNIQUE (home_id, month, year)
);

-- TABLE 4: Predictions
CREATE TABLE Predictions (
    prediction_id SERIAL PRIMARY KEY,
    home_id INT NOT NULL,
    user_id INT NOT NULL,
    predicted_kwh DECIMAL(10,2) CHECK (predicted_kwh >= 0),
    predicted_bill DECIMAL(10,2) CHECK (predicted_bill >= 0),
    prediction_date TIMESTAMP DEFAULT NOW(),
    ml_confidence_score DECIMAL(5,4) CHECK (ml_confidence_score BETWEEN 0 AND 1),
    
    CONSTRAINT fk_predictions_home FOREIGN KEY (home_id) 
        REFERENCES Homes(home_id) ON DELETE CASCADE,
    CONSTRAINT fk_predictions_user FOREIGN KEY (user_id) 
        REFERENCES Users(user_id) ON DELETE CASCADE
);

-- TABLE 5: Appliances
CREATE TABLE Appliances (
    appliance_id SERIAL PRIMARY KEY,
    home_id INT NOT NULL,
    appliance_type VARCHAR(50) NOT NULL 
        CHECK (appliance_type IN ('fridge', 'AC', 'heater', 'TV', 'washing_machine', 'dishwasher')),
    quantity INT DEFAULT 1 CHECK (quantity > 0),
    avg_hours_per_day DECIMAL(4,2) CHECK (avg_hours_per_day BETWEEN 0 AND 24),
    wattage INT CHECK (wattage > 0),
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_appliances_home FOREIGN KEY (home_id) 
        REFERENCES Homes(home_id) ON DELETE CASCADE
);

-- TABLE 6: BillHistory
CREATE TABLE BillHistory (
    bill_id SERIAL PRIMARY KEY,
    home_id INT NOT NULL,
    month INT CHECK (month BETWEEN 1 AND 12),
    year INT CHECK (year >= 2020),
    actual_amount DECIMAL(10,2) CHECK (actual_amount >= 0),
    due_date DATE NOT NULL,
    paid BOOLEAN DEFAULT false,
    payment_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_bill_home FOREIGN KEY (home_id) 
        REFERENCES Homes(home_id) ON DELETE CASCADE,
    CONSTRAINT unique_bill_period UNIQUE (home_id, month, year)
);

-- ============================================
-- STEP 2.2: CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_homes_user ON Homes(user_id);
CREATE INDEX idx_consumption_home ON EnergyConsumption(home_id);
CREATE INDEX idx_consumption_date ON EnergyConsumption(year, month);
CREATE INDEX idx_predictions_home ON Predictions(home_id);
CREATE INDEX idx_predictions_date ON Predictions(prediction_date);
CREATE INDEX idx_appliances_home ON Appliances(home_id);
CREATE INDEX idx_bills_home ON BillHistory(home_id);
CREATE INDEX idx_bills_date ON BillHistory(year, month);
CREATE INDEX idx_users_email ON Users(email);

COMMENT ON INDEX idx_homes_user IS 'Optimizes home queries by user';
COMMENT ON INDEX idx_consumption_date IS 'Optimizes temporal consumption queries';

-- ============================================
-- STEP 3: CREATE 5 REQUIRED VIEWS
-- ============================================

-- VIEW 1: vw_UserHomeSummary
CREATE OR REPLACE VIEW vw_UserHomeSummary AS
SELECT 
    u.user_id,
    u.name,
    u.email,
    u.phone,
    h.home_id,
    h.address,
    h.home_type,
    h.size_m2,
    h.num_rooms,
    COALESCE(SUM(ec.kwh_used), 0) AS total_kwh_consumed,
    COALESCE(SUM(ec.bill_amount), 0) AS total_bill_amount,
    COUNT(DISTINCT ec.consumption_id) AS total_records
FROM Users u
LEFT JOIN Homes h ON u.user_id = h.user_id
LEFT JOIN EnergyConsumption ec ON h.home_id = ec.home_id
GROUP BY u.user_id, u.name, u.email, u.phone, h.home_id, h.address, h.home_type, h.size_m2, h.num_rooms;

-- VIEW 2: vw_MonthlyConsumption
CREATE OR REPLACE VIEW vw_MonthlyConsumption AS
SELECT 
    h.home_id,
    h.address,
    u.name AS owner_name,
    ec.year,
    ec.month,
    ec.kwh_used,
    ec.bill_amount,
    ec.avg_temperature,
    ROUND(ec.bill_amount / NULLIF(ec.kwh_used, 0), 2) AS cost_per_kwh
FROM EnergyConsumption ec
JOIN Homes h ON ec.home_id = h.home_id
JOIN Users u ON h.user_id = u.user_id
ORDER BY ec.year DESC, ec.month DESC;

-- VIEW 3: vw_PredictionAccuracy
CREATE OR REPLACE VIEW vw_PredictionAccuracy AS
SELECT 
    p.prediction_id,
    h.home_id,
    h.address,
    u.name AS owner_name,
    EXTRACT(MONTH FROM p.prediction_date) AS predicted_month,
    EXTRACT(YEAR FROM p.prediction_date) AS predicted_year,
    p.predicted_kwh,
    p.predicted_bill,
    p.ml_confidence_score,
    bh.actual_amount AS actual_bill,
    ec.kwh_used AS actual_kwh,
    ROUND(ABS(p.predicted_bill - bh.actual_amount), 2) AS bill_difference,
    ROUND(ABS(p.predicted_kwh - ec.kwh_used), 2) AS kwh_difference,
    ROUND((ABS(p.predicted_bill - bh.actual_amount) / NULLIF(bh.actual_amount, 0)) * 100, 2) AS error_percentage
FROM Predictions p
JOIN Homes h ON p.home_id = h.home_id
JOIN Users u ON h.user_id = u.user_id
LEFT JOIN BillHistory bh ON h.home_id = bh.home_id 
    AND EXTRACT(MONTH FROM p.prediction_date) = bh.month
    AND EXTRACT(YEAR FROM p.prediction_date) = bh.year
LEFT JOIN EnergyConsumption ec ON h.home_id = ec.home_id
    AND EXTRACT(MONTH FROM p.prediction_date) = ec.month
    AND EXTRACT(YEAR FROM p.prediction_date) = ec.year;

-- VIEW 4: vw_HighConsumers
CREATE OR REPLACE VIEW vw_HighConsumers AS
SELECT 
    u.user_id,
    u.name,
    u.email,
    h.home_id,
    h.address,
    h.home_type,
    h.size_m2,
    ec.year,
    ec.month,
    ec.kwh_used,
    ec.bill_amount,
    RANK() OVER (PARTITION BY ec.year, ec.month ORDER BY ec.kwh_used DESC) AS consumption_rank
FROM Users u
JOIN Homes h ON u.user_id = h.user_id
JOIN EnergyConsumption ec ON h.home_id = ec.home_id
WHERE ec.kwh_used > 500
ORDER BY ec.year DESC, ec.month DESC, ec.kwh_used DESC;

-- VIEW 5: vw_ApplianceImpact
CREATE OR REPLACE VIEW vw_ApplianceImpact AS
SELECT 
    a.appliance_type,
    COUNT(DISTINCT a.home_id) AS homes_with_appliance,
    SUM(a.quantity) AS total_quantity,
    ROUND(AVG(a.avg_hours_per_day), 2) AS avg_usage_hours,
    ROUND(AVG(a.wattage), 2) AS avg_wattage,
    ROUND(AVG((a.wattage * a.avg_hours_per_day * 30) / 1000), 2) AS estimated_monthly_kwh,
    ROUND(AVG(ec.kwh_used), 2) AS avg_home_consumption
FROM Appliances a
JOIN Homes h ON a.home_id = h.home_id
LEFT JOIN EnergyConsumption ec ON h.home_id = ec.home_id
GROUP BY a.appliance_type
ORDER BY estimated_monthly_kwh DESC;

-- ============================================
-- STEP 4: CREATE 2 USER-DEFINED FUNCTIONS
-- ============================================

-- FUNCTION 1: fn_CalculateSeasonFactor
CREATE OR REPLACE FUNCTION fn_CalculateSeasonFactor(check_month INT)
RETURNS DECIMAL(3,2)
LANGUAGE plpgsql
AS $$
DECLARE
    season_factor DECIMAL(3,2);
BEGIN
    IF check_month < 1 OR check_month > 12 THEN
        RAISE EXCEPTION 'Invalid month: %. Must be between 1 and 12', check_month;
    END IF;
    
    CASE 
        WHEN check_month IN (12, 1, 2) THEN
            season_factor := 1.4;
        WHEN check_month IN (3, 4, 5) THEN
            season_factor := 0.9;
        WHEN check_month IN (6, 7, 8) THEN
            season_factor := 1.3;
        WHEN check_month IN (9, 10, 11) THEN
            season_factor := 1.0;
    END CASE;
    
    RETURN season_factor;
END;
$$;

-- FUNCTION 2: fn_GetAverageBill
CREATE OR REPLACE FUNCTION fn_GetAverageBill(p_home_id INT)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
    avg_bill DECIMAL(10,2);
BEGIN
    SELECT COALESCE(AVG(bill_amount), 0)
    INTO avg_bill
    FROM EnergyConsumption
    WHERE home_id = p_home_id;
    
    IF avg_bill IS NULL THEN
        avg_bill := 0;
    END IF;
    
    RETURN ROUND(avg_bill, 2);
END;
$$;

-- Test functions
SELECT 
    month_num,
    fn_CalculateSeasonFactor(month_num) AS season_factor,
    CASE 
        WHEN month_num IN (12,1,2) THEN 'Winter'
        WHEN month_num IN (3,4,5) THEN 'Spring'
        WHEN month_num IN (6,7,8) THEN 'Summer'
        ELSE 'Fall'
    END AS season
FROM generate_series(1, 12) AS month_num;

-- ============================================
-- STEP 5: CREATE 2 STORED PROCEDURES
-- ============================================

-- STORED PROCEDURE 1: sp_SavePrediction
CREATE OR REPLACE PROCEDURE sp_SavePrediction(
    p_home_id INT,
    p_user_id INT,
    p_predicted_kwh DECIMAL(10,2),
    p_predicted_bill DECIMAL(10,2),
    p_confidence_score DECIMAL(5,4)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_home_exists BOOLEAN;
    v_user_owns_home BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM Homes WHERE home_id = p_home_id)
    INTO v_home_exists;
    
    IF NOT v_home_exists THEN
        RAISE EXCEPTION 'Home with ID % does not exist', p_home_id;
    END IF;
    
    SELECT EXISTS(
        SELECT 1 FROM Homes 
        WHERE home_id = p_home_id AND user_id = p_user_id
    ) INTO v_user_owns_home;
    
    IF NOT v_user_owns_home THEN
        RAISE EXCEPTION 'User % does not own home %', p_user_id, p_home_id;
    END IF;
    
    INSERT INTO Predictions (
        home_id, 
        user_id, 
        predicted_kwh, 
        predicted_bill, 
        ml_confidence_score,
        prediction_date
    ) VALUES (
        p_home_id,
        p_user_id,
        p_predicted_kwh,
        p_predicted_bill,
        p_confidence_score,
        NOW()
    );
    
    RAISE NOTICE 'Prediction saved: % kWh, % EUR, confidence: %', 
        p_predicted_kwh, p_predicted_bill, p_confidence_score;
END;
$$;

-- STORED PROCEDURE 2: sp_MonthlyReport
CREATE OR REPLACE PROCEDURE sp_MonthlyReport(
    p_home_id INT,
    p_year INT,
    p_month INT,
    OUT total_kwh DECIMAL(10,2),
    OUT total_bill DECIMAL(10,2),
    OUT avg_temp DECIMAL(5,2),
    OUT appliance_count INT,
    OUT season_factor DECIMAL(3,2)
)
LANGUAGE plpgsql
AS $$
BEGIN
    SELECT 
        COALESCE(ec.kwh_used, 0),
        COALESCE(ec.bill_amount, 0),
        COALESCE(ec.avg_temperature, 0)
    INTO total_kwh, total_bill, avg_temp
    FROM EnergyConsumption ec
    WHERE ec.home_id = p_home_id 
      AND ec.year = p_year 
      AND ec.month = p_month;
    
    IF total_kwh IS NULL THEN
        total_kwh := 0;
        total_bill := 0;
        avg_temp := 0;
    END IF;
    
    SELECT COUNT(*)
    INTO appliance_count
    FROM Appliances
    WHERE home_id = p_home_id;
    
    season_factor := fn_CalculateSeasonFactor(p_month);
    
    RAISE NOTICE '========== MONTHLY REPORT ==========';
    RAISE NOTICE 'Home: %, Period: %/%', p_home_id, p_month, p_year;
    RAISE NOTICE 'Consumption: % kWh', total_kwh;
    RAISE NOTICE 'Bill: % EUR', total_bill;
    RAISE NOTICE 'Average Temperature: % °C', avg_temp;
    RAISE NOTICE 'Number of Appliances: %', appliance_count;
    RAISE NOTICE 'Season Factor: %', season_factor;
    RAISE NOTICE '====================================';
END;
$$;

-- ============================================
-- STEP 6: SECURITY CONFIGURATION (Row Level Security)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE Users ENABLE ROW LEVEL SECURITY;
ALTER TABLE Homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE EnergyConsumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE Predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE Appliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE BillHistory ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Users
CREATE POLICY user_select_own ON Users
    FOR SELECT
    USING (auth.uid()::text = user_id::text OR role = 'admin');

CREATE POLICY user_update_own ON Users
    FOR UPDATE
    USING (auth.uid()::text = user_id::text);

-- RLS Policies for Homes
CREATE POLICY homes_select_own ON Homes
    FOR SELECT
    USING (user_id IN (SELECT user_id FROM Users WHERE auth.uid()::text = user_id::text));

CREATE POLICY homes_insert_own ON Homes
    FOR INSERT
    WITH CHECK (user_id IN (SELECT user_id FROM Users WHERE auth.uid()::text = user_id::text));

-- RLS Policies for EnergyConsumption
CREATE POLICY consumption_select_own ON EnergyConsumption
    FOR SELECT
    USING (home_id IN (
        SELECT home_id FROM Homes 
        WHERE user_id IN (SELECT user_id FROM Users WHERE auth.uid()::text = user_id::text)
    ));

-- RLS Policies for Predictions
CREATE POLICY predictions_select_own ON Predictions
    FOR SELECT
    USING (user_id IN (SELECT user_id FROM Users WHERE auth.uid()::text = user_id::text));

-- RLS Policies for Appliances
CREATE POLICY appliances_select_own ON Appliances
    FOR SELECT
    USING (home_id IN (
        SELECT home_id FROM Homes 
        WHERE user_id IN (SELECT user_id FROM Users WHERE auth.uid()::text = user_id::text)
    ));

-- RLS Policies for BillHistory
CREATE POLICY bills_select_own ON BillHistory
    FOR SELECT
    USING (home_id IN (
        SELECT home_id FROM Homes 
        WHERE user_id IN (SELECT user_id FROM Users WHERE auth.uid()::text = user_id::text)
    ));

-- ============================================
-- DATA MASKING VIEWS
-- ============================================

-- Masked Users View
CREATE OR REPLACE VIEW vw_Users_Masked AS
SELECT 
    user_id,
    name,
    CONCAT(
        LEFT(email, 1),
        '***@',
        SPLIT_PART(email, '@', 2)
    ) AS email_masked,
    CONCAT(
        LEFT(phone, 6),
        '** ** ** ',
        RIGHT(phone, 2)
    ) AS phone_masked,
    role,
    created_at
FROM Users;

-- Masked Bills View
CREATE OR REPLACE VIEW vw_Bills_Masked AS
SELECT 
    bill_id,
    home_id,
    month,
    year,
    CONCAT(FLOOR(actual_amount), '.XX') AS actual_amount_masked,
    due_date,
    paid
FROM BillHistory;

