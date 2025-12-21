-- ============================================
-- SMART CITY ENERGY CONSUMPTION PREDICTION SYSTEM
-- Database Schema
-- Student Project - Requirements Implementation
-- ============================================

-- [REQ: RDBMS] PostgreSQL (Supabase)

-- CLEANUP
DROP TABLE IF EXISTS BillHistory CASCADE;
DROP TABLE IF EXISTS Predictions CASCADE;
DROP TABLE IF EXISTS Appliances CASCADE;
DROP TABLE IF EXISTS EnergyConsumption CASCADE;
DROP TABLE IF EXISTS Homes CASCADE;
DROP TABLE IF EXISTS Users CASCADE;

-- ============================================
-- 1. TABLES (ENTITIES) [REQ: At least 6 entities]
-- ============================================

-- TABLE 1: Users
CREATE TABLE Users (
    -- [REQ: Data Integrity] Using UUID to match Auth System ID exactly
    user_id UUID PRIMARY KEY, 
    name VARCHAR(100) NOT NULL,
    -- [REQ: Constraint - Unique]
    email VARCHAR(150) NOT NULL UNIQUE, 
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    -- [REQ: Constraint - Check]
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')), 
    created_at TIMESTAMP DEFAULT NOW()
);

-- TABLE 2: Homes
CREATE TABLE Homes (
    home_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL, -- UUID to match Users table
    address TEXT NOT NULL,
    -- [REQ: Constraint - Check]
    home_type VARCHAR(50) NOT NULL CHECK (home_type IN ('apartment', 'house')),
    size_m2 DECIMAL(8,2) CHECK (size_m2 > 0),
    num_rooms INT CHECK (num_rooms > 0),
    has_ac BOOLEAN DEFAULT false,
    has_heater BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- [REQ: Constraint - Foreign Key]
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
    
    -- [REQ: Constraint - Unique (Composite)] 
    -- Ensures a home can't have duplicate records for the same month/year
    CONSTRAINT unique_consumption_period UNIQUE (home_id, month, year)
);

-- TABLE 4: Predictions
CREATE TABLE Predictions (
    prediction_id SERIAL PRIMARY KEY,
    home_id INT NOT NULL,
    user_id UUID NOT NULL, -- UUID to match Users table
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
-- 2. INDEXES [REQ: Query Performance Strategy]
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

-- ============================================
-- 3. VIEWS [REQ: At least 5 views]
-- ============================================

-- VIEW 1: Summary of User Homes and Totals
CREATE OR REPLACE VIEW vw_UserHomeSummary AS
SELECT 
    u.user_id,
    u.name,
    u.email,
    h.home_id,
    h.address,
    h.home_type,
    COALESCE(SUM(ec.kwh_used), 0) AS total_kwh,
    COALESCE(SUM(ec.bill_amount), 0) AS total_bill
FROM Users u
LEFT JOIN Homes h ON u.user_id = h.user_id
LEFT JOIN EnergyConsumption ec ON h.home_id = ec.home_id
GROUP BY u.user_id, u.name, u.email, h.home_id, h.address, h.home_type;

-- VIEW 2: Monthly Consumption Analysis
CREATE OR REPLACE VIEW vw_MonthlyConsumption AS
SELECT 
    h.home_id,
    h.address,
    ec.year,
    ec.month,
    ec.kwh_used,
    ec.bill_amount,
    ROUND(ec.bill_amount / NULLIF(ec.kwh_used, 0), 2) AS cost_per_kwh
FROM EnergyConsumption ec
JOIN Homes h ON ec.home_id = h.home_id;

-- VIEW 3: Prediction Accuracy (ML Performance)
CREATE OR REPLACE VIEW vw_PredictionAccuracy AS
SELECT 
    p.prediction_id,
    h.home_id,
    p.predicted_bill,
    bh.actual_amount,
    ROUND(ABS(p.predicted_bill - bh.actual_amount), 2) AS error_amount
FROM Predictions p
JOIN Homes h ON p.home_id = h.home_id
JOIN BillHistory bh ON h.home_id = bh.home_id 
    AND EXTRACT(MONTH FROM p.prediction_date) = bh.month
    AND EXTRACT(YEAR FROM p.prediction_date) = bh.year;

-- VIEW 4: High Consumers (Filter Logic)
CREATE OR REPLACE VIEW vw_HighConsumers AS
SELECT * FROM EnergyConsumption
WHERE kwh_used > 500;

-- VIEW 5: Appliance Impact Analysis
CREATE OR REPLACE VIEW vw_ApplianceImpact AS
SELECT 
    appliance_type,
    COUNT(*) as total_units,
    ROUND(AVG(wattage), 2) as avg_watts
FROM Appliances
GROUP BY appliance_type;

-- ============================================
-- 4. FUNCTIONS [REQ: At least 2 UDFs]
-- ============================================

-- FUNCTION 1: Calculate Season Factor
CREATE OR REPLACE FUNCTION fn_CalculateSeasonFactor(check_month INT)
RETURNS DECIMAL(3,2)
LANGUAGE plpgsql
AS $$
BEGIN
    IF check_month IN (12, 1, 2) THEN RETURN 1.4; -- Winter
    ELSIF check_month IN (6, 7, 8) THEN RETURN 1.3; -- Summer
    ELSIF check_month IN (3, 4, 5) THEN RETURN 0.9; -- Spring
    ELSE RETURN 1.0; -- Fall
    END IF;
END;
$$;

-- FUNCTION 2: Get Average Bill for Home
CREATE OR REPLACE FUNCTION fn_GetAverageBill(p_home_id INT)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE avg_bill DECIMAL(10,2);
BEGIN
    SELECT COALESCE(AVG(bill_amount), 0) INTO avg_bill
    FROM EnergyConsumption WHERE home_id = p_home_id;
    RETURN avg_bill;
END;
$$;

-- ============================================
-- 5. STORED PROCEDURES [REQ: At least 2 SPs]
-- ============================================

-- PROCEDURE 1: Save Prediction (Transaction Logic)
-- [NOTE]: Updated to accept UUID for user_id to prevent Type Error
CREATE OR REPLACE PROCEDURE sp_SavePrediction(
    p_home_id INT,
    p_user_id UUID, 
    p_predicted_kwh DECIMAL,
    p_predicted_bill DECIMAL,
    p_confidence_score DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO Predictions (home_id, user_id, predicted_kwh, predicted_bill, ml_confidence_score)
    VALUES (p_home_id, p_user_id, p_predicted_kwh, p_predicted_bill, p_confidence_score);
END;
$$;

-- PROCEDURE 2: Generate Monthly Report
CREATE OR REPLACE PROCEDURE sp_MonthlyReport(
    p_home_id INT,
    p_year INT,
    p_month INT
)
LANGUAGE plpgsql
AS $$
DECLARE 
    v_total_kwh DECIMAL;
BEGIN
    SELECT kwh_used INTO v_total_kwh 
    FROM EnergyConsumption 
    WHERE home_id = p_home_id AND year = p_year AND month = p_month;
    
    RAISE NOTICE 'Total Consumption: %', v_total_kwh;
END;
$$;

-- ============================================
-- 6. SECURITY & MASKING [REQ: Authorization & Masking]
-- ============================================

-- Enable Row Level Security (Authorization)
ALTER TABLE Users ENABLE ROW LEVEL SECURITY;
ALTER TABLE Homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE EnergyConsumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE Predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE Appliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE BillHistory ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Fixing UUID comparison)
CREATE POLICY user_select_own ON Users FOR SELECT USING (auth.uid() = user_id);
-- [CRITICAL FIX]: Allow users to insert their own profile upon registration
CREATE POLICY user_insert_own ON Users FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY homes_select_own ON Homes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY homes_insert_own ON Homes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY homes_update_own ON Homes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY homes_delete_own ON Homes FOR DELETE USING (user_id = auth.uid());

CREATE POLICY consumption_select_own ON EnergyConsumption FOR SELECT 
USING (home_id IN (SELECT home_id FROM Homes WHERE user_id = auth.uid()));

CREATE POLICY predictions_select_own ON Predictions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY predictions_insert_own ON Predictions FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY appliances_select_own ON Appliances FOR SELECT 
USING (home_id IN (SELECT home_id FROM Homes WHERE user_id = auth.uid()));

CREATE POLICY bill_select_own ON BillHistory FOR SELECT 
USING (home_id IN (SELECT home_id FROM Homes WHERE user_id = auth.uid()));

-- Masking Views [REQ: Masking Operations]
CREATE OR REPLACE VIEW vw_Users_Masked AS
SELECT 
    user_id,
    name,
    CONCAT(LEFT(email, 1), '***@', SPLIT_PART(email, '@', 2)) AS email_masked, -- Masking Email
    role
FROM Users;

CREATE OR REPLACE VIEW vw_Bills_Masked AS
SELECT 
    bill_id,
    home_id,
    CONCAT('$', FLOOR(actual_amount), '.XX') AS amount_masked -- Masking Financial Data
FROM BillHistory;