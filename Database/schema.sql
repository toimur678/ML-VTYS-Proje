-- ================================================
-- SMART CITY ENERGY CONSUMPTION PREDICTION SYSTEM
-- ================================================

-- ============================================
-- SECTION 1: CLEANUP
-- ============================================

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop tables with quotes to be safe
DROP TABLE IF EXISTS "BillHistory" CASCADE;
DROP TABLE IF EXISTS "Predictions" CASCADE;
DROP TABLE IF EXISTS "Appliances" CASCADE;
DROP TABLE IF EXISTS "EnergyConsumption" CASCADE;
DROP TABLE IF EXISTS "Homes" CASCADE;
DROP TABLE IF EXISTS "Users" CASCADE;

-- Also drop lowercase versions just in case
DROP TABLE IF EXISTS billhistory CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS appliances CASCADE;
DROP TABLE IF EXISTS energyconsumption CASCADE;
DROP TABLE IF EXISTS homes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- SECTION 2: CREATE TABLES
-- ============================================

-- TABLE 1: Users
CREATE TABLE "Users" (
    user_id UUID PRIMARY KEY, 
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE, 
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')), 
    created_at TIMESTAMP DEFAULT NOW()
);

-- TABLE 2: Homes
CREATE TABLE "Homes" (
    home_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    address TEXT NOT NULL,
    home_type VARCHAR(50) NOT NULL CHECK (home_type IN ('apartment', 'house')),
    size_m2 DECIMAL(8,2) CHECK (size_m2 > 0),
    num_rooms INT CHECK (num_rooms > 0),
    has_ac BOOLEAN DEFAULT false,
    has_heater BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_homes_user FOREIGN KEY (user_id) 
        REFERENCES "Users"(user_id) ON DELETE CASCADE
);

-- TABLE 3: EnergyConsumption
CREATE TABLE "EnergyConsumption" (
    consumption_id SERIAL PRIMARY KEY,
    home_id INT NOT NULL,
    month INT CHECK (month BETWEEN 1 AND 12),
    year INT CHECK (year >= 2020),
    kwh_used DECIMAL(10,2) CHECK (kwh_used >= 0),
    bill_amount DECIMAL(10,2) CHECK (bill_amount >= 0),
    avg_temperature DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_consumption_home FOREIGN KEY (home_id) 
        REFERENCES "Homes"(home_id) ON DELETE CASCADE,
    
    CONSTRAINT unique_consumption_period UNIQUE (home_id, month, year)
);

-- TABLE 4: Predictions
CREATE TABLE "Predictions" (
    prediction_id SERIAL PRIMARY KEY,
    home_id INT NOT NULL,
    user_id UUID NOT NULL,
    predicted_kwh DECIMAL(10,2) CHECK (predicted_kwh >= 0),
    predicted_bill DECIMAL(10,2) CHECK (predicted_bill >= 0),
    prediction_date TIMESTAMP DEFAULT NOW(),
    ml_confidence_score DECIMAL(5,4) CHECK (ml_confidence_score BETWEEN 0 AND 1),
    
    CONSTRAINT fk_predictions_home FOREIGN KEY (home_id) 
        REFERENCES "Homes"(home_id) ON DELETE CASCADE,
    CONSTRAINT fk_predictions_user FOREIGN KEY (user_id) 
        REFERENCES "Users"(user_id) ON DELETE CASCADE
);

-- TABLE 5: Appliances
CREATE TABLE "Appliances" (
    appliance_id SERIAL PRIMARY KEY,
    home_id INT NOT NULL,
    appliance_type VARCHAR(50) NOT NULL 
        CHECK (appliance_type IN ('fridge', 'AC', 'heater', 'TV', 'washing_machine', 'dishwasher')),
    quantity INT DEFAULT 1 CHECK (quantity > 0),
    avg_hours_per_day DECIMAL(4,2) CHECK (avg_hours_per_day BETWEEN 0 AND 24),
    wattage INT CHECK (wattage > 0),
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_appliances_home FOREIGN KEY (home_id) 
        REFERENCES "Homes"(home_id) ON DELETE CASCADE
);

-- TABLE 6: BillHistory
CREATE TABLE "BillHistory" (
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
        REFERENCES "Homes"(home_id) ON DELETE CASCADE,
    CONSTRAINT unique_bill_period UNIQUE (home_id, month, year)
);

-- ============================================
-- SECTION 3: CREATE INDEXES
-- ============================================

CREATE INDEX idx_homes_user ON "Homes"(user_id);
CREATE INDEX idx_consumption_home ON "EnergyConsumption"(home_id);
CREATE INDEX idx_consumption_date ON "EnergyConsumption"(year, month);
CREATE INDEX idx_predictions_home ON "Predictions"(home_id);
CREATE INDEX idx_predictions_date ON "Predictions"(prediction_date);
CREATE INDEX idx_appliances_home ON "Appliances"(home_id);
CREATE INDEX idx_bills_home ON "BillHistory"(home_id);
CREATE INDEX idx_users_email ON "Users"(email);

-- ============================================
-- SECTION 4: CREATE VIEWS
-- ============================================

-- VIEW 1: User Home Summary
CREATE OR REPLACE VIEW "vw_UserHomeSummary" AS
SELECT 
    u.user_id,
    u.name,
    u.email,
    h.home_id,
    h.address,
    h.home_type,
    COALESCE(SUM(ec.kwh_used), 0) AS total_kwh,
    COALESCE(SUM(ec.bill_amount), 0) AS total_bill
FROM "Users" u
LEFT JOIN "Homes" h ON u.user_id = h.user_id
LEFT JOIN "EnergyConsumption" ec ON h.home_id = ec.home_id
GROUP BY u.user_id, u.name, u.email, h.home_id, h.address, h.home_type;

-- VIEW 2: Monthly Consumption
CREATE OR REPLACE VIEW "vw_MonthlyConsumption" AS
SELECT 
    h.home_id,
    h.address,
    ec.year,
    ec.month,
    ec.kwh_used,
    ec.bill_amount,
    ROUND(ec.bill_amount / NULLIF(ec.kwh_used, 0), 2) AS cost_per_kwh
FROM "EnergyConsumption" ec
JOIN "Homes" h ON ec.home_id = h.home_id;

-- VIEW 3: Prediction Accuracy
CREATE OR REPLACE VIEW "vw_PredictionAccuracy" AS
SELECT 
    p.prediction_id,
    h.home_id,
    p.predicted_bill,
    bh.actual_amount,
    ROUND(ABS(p.predicted_bill - bh.actual_amount), 2) AS error_amount
FROM "Predictions" p
JOIN "Homes" h ON p.home_id = h.home_id
JOIN "BillHistory" bh ON h.home_id = bh.home_id 
    AND EXTRACT(MONTH FROM p.prediction_date) = bh.month
    AND EXTRACT(YEAR FROM p.prediction_date) = bh.year;

-- VIEW 4: High Consumers
CREATE OR REPLACE VIEW "vw_HighConsumers" AS
SELECT * FROM "EnergyConsumption"
WHERE kwh_used > 500;

-- VIEW 5: Appliance Impact
CREATE OR REPLACE VIEW "vw_ApplianceImpact" AS
SELECT 
    appliance_type,
    COUNT(*) as total_units,
    ROUND(AVG(wattage), 2) as avg_watts
FROM "Appliances"
GROUP BY appliance_type;

-- ============================================
-- SECTION 5: CREATE FUNCTIONS
-- ============================================

-- Function 1: Calculate Season Factor
CREATE OR REPLACE FUNCTION fn_CalculateSeasonFactor(check_month INT)
RETURNS DECIMAL(3,2)
LANGUAGE plpgsql
AS $$
BEGIN
    IF check_month IN (12, 1, 2) THEN RETURN 1.4; 
    ELSIF check_month IN (6, 7, 8) THEN RETURN 1.3; 
    ELSIF check_month IN (3, 4, 5) THEN RETURN 0.9; 
    ELSE RETURN 1.0; 
    END IF;
END;
$$;

-- Function 2: Get Average Bill
CREATE OR REPLACE FUNCTION fn_GetAverageBill(p_home_id INT)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE avg_bill DECIMAL(10,2);
BEGIN
    SELECT COALESCE(AVG(bill_amount), 0) INTO avg_bill
    FROM "EnergyConsumption" WHERE home_id = p_home_id;
    RETURN avg_bill;
END;
$$;

-- Function 3: Handle New User (Auto-sync auth.users with Users table)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert into Users table with data from auth.users
  INSERT INTO public."Users" (user_id, name, email, password, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    'hashed', -- placeholder since we use auth
    'user'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- SECTION 6: CREATE STORED PROCEDURES
-- ============================================

-- Procedure 1: Save Prediction
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
    INSERT INTO "Predictions" (home_id, user_id, predicted_kwh, predicted_bill, ml_confidence_score)
    VALUES (p_home_id, p_user_id, p_predicted_kwh, p_predicted_bill, p_confidence_score);
END;
$$;

-- Procedure 2: Monthly Report
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
    FROM "EnergyConsumption" 
    WHERE home_id = p_home_id AND year = p_year AND month = p_month;
    
    RAISE NOTICE 'Total Consumption: %', v_total_kwh;
END;
$$;

-- ============================================
-- SECTION 7: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE "Users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Homes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EnergyConsumption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Predictions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appliances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BillHistory" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECTION 8: CREATE RLS POLICIES
-- ============================================

-- Users Policies
CREATE POLICY user_select_own ON "Users" 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_insert_own ON "Users" 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Homes Policies  
CREATE POLICY homes_select_own ON "Homes" 
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY homes_insert_own ON "Homes" 
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY homes_update_own ON "Homes" 
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY homes_delete_own ON "Homes" 
    FOR DELETE USING (user_id = auth.uid());

-- EnergyConsumption Policies  
CREATE POLICY consumption_select_own ON "EnergyConsumption" 
    FOR SELECT 
    USING (home_id IN (SELECT home_id FROM "Homes" WHERE user_id = auth.uid()));

CREATE POLICY consumption_insert_own ON "EnergyConsumption" 
    FOR INSERT 
    WITH CHECK (home_id IN (SELECT home_id FROM "Homes" WHERE user_id = auth.uid()));

CREATE POLICY consumption_update_own ON "EnergyConsumption" 
    FOR UPDATE 
    USING (home_id IN (SELECT home_id FROM "Homes" WHERE user_id = auth.uid()));

CREATE POLICY consumption_delete_own ON "EnergyConsumption" 
    FOR DELETE 
    USING (home_id IN (SELECT home_id FROM "Homes" WHERE user_id = auth.uid()));

-- Predictions Policies  
CREATE POLICY predictions_select_own ON "Predictions" 
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY predictions_insert_own ON "Predictions" 
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY predictions_update_own ON "Predictions" 
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY predictions_delete_own ON "Predictions" 
    FOR DELETE USING (user_id = auth.uid());

-- Appliances Policies  
CREATE POLICY appliances_select_own ON "Appliances" 
    FOR SELECT 
    USING (home_id IN (SELECT home_id FROM "Homes" WHERE user_id = auth.uid()));

CREATE POLICY appliances_insert_own ON "Appliances" 
    FOR INSERT 
    WITH CHECK (home_id IN (SELECT home_id FROM "Homes" WHERE user_id = auth.uid()));

CREATE POLICY appliances_update_own ON "Appliances" 
    FOR UPDATE 
    USING (home_id IN (SELECT home_id FROM "Homes" WHERE user_id = auth.uid()));

CREATE POLICY appliances_delete_own ON "Appliances" 
    FOR DELETE 
    USING (home_id IN (SELECT home_id FROM "Homes" WHERE user_id = auth.uid()));

-- BillHistory Policies  
CREATE POLICY bill_select_own ON "BillHistory" 
    FOR SELECT 
    USING (home_id IN (SELECT home_id FROM "Homes" WHERE user_id = auth.uid()));

CREATE POLICY bill_insert_own ON "BillHistory" 
    FOR INSERT 
    WITH CHECK (home_id IN (SELECT home_id FROM "Homes" WHERE user_id = auth.uid()));

CREATE POLICY bill_update_own ON "BillHistory" 
    FOR UPDATE 
    USING (home_id IN (SELECT home_id FROM "Homes" WHERE user_id = auth.uid()));

CREATE POLICY bill_delete_own ON "BillHistory" 
    FOR DELETE 
    USING (home_id IN (SELECT home_id FROM "Homes" WHERE user_id = auth.uid()));

-- ============================================
-- SECTION 9: CREATE TRIGGER (Auto-sync Users)
-- ============================================

-- Create trigger that fires when a new user is created in auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- SECTION 10: BACKFILL EXISTING USERS
-- ============================================

-- Sync all existing auth users to the Users table
INSERT INTO public."Users" (user_id, name, email, password, role)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'name', SPLIT_PART(au.email, '@', 1)),
    au.email,
    'hashed',
    'user'
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public."Users" u WHERE u.user_id = au.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- SECTION 11: CREATE MASKING VIEWS
-- ============================================

-- Masked Users View
CREATE OR REPLACE VIEW "vw_Users_Masked" AS
SELECT 
    user_id,
    name,
    CONCAT(LEFT(email, 1), '***@', SPLIT_PART(email, '@', 2)) AS email_masked,
    role
FROM "Users";

-- Masked Bills View
CREATE OR REPLACE VIEW "vw_Bills_Masked" AS
SELECT 
    bill_id,
    home_id,
    CONCAT('$', FLOOR(actual_amount), '.XX') AS amount_masked
FROM "BillHistory";

-- ============================================
-- SECTION 12: VERIFICATION QUERIES
-- ============================================

-- Verify trigger was created
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Verify all tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('Users', 'Homes', 'EnergyConsumption', 'Predictions', 'Appliances', 'BillHistory')
ORDER BY table_name;

-- Verify all RLS policies were created
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd 
FROM pg_policies 
WHERE tablename IN ('Users', 'Homes', 'EnergyConsumption', 'Predictions', 'Appliances', 'BillHistory')
ORDER BY tablename, cmd;

-- Verify user sync
SELECT 
    (SELECT COUNT(*) FROM auth.users) as auth_users_count,
    (SELECT COUNT(*) FROM public."Users") as users_table_count;
