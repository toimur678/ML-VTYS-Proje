# Database - Home Energy Bill Predictor

PostgreSQL database for the Smart City Energy Consumption Prediction System.

## 📊 Database Schema

### Tables (6)
1. **Users** - System users (admin/user roles)
2. **Homes** - User home information
3. **EnergyConsumption** - Historical energy usage (ML training data)
4. **Predictions** - ML model predictions
5. **Appliances** - Home electrical appliances
6. **BillHistory** - Actual electricity bills

### Views (7)
- `vw_UserHomeSummary` - User home summary with total consumption
- `vw_MonthlyConsumption` - Monthly consumption details
- `vw_PredictionAccuracy` - ML predictions vs actual bills
- `vw_HighConsumers` - Users with >500 kWh/month
- `vw_ApplianceImpact` - Average consumption by appliance type
- `vw_Users_Masked` - Masked user data (privacy)
- `vw_Bills_Masked` - Masked bill amounts (privacy)

### Stored Procedures (2)
- `sp_SavePrediction(home_id, user_id, kwh, bill, confidence)` - Save ML predictions
- `sp_MonthlyReport(home_id, year, month)` - Generate monthly reports

### Functions (2)
- `fn_CalculateSeasonFactor(month)` - Returns seasonal multiplier
- `fn_GetAverageBill(home_id)` - Returns average bill

## 🚀 Setup

### 1. Get Supabase Credentials
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Settings → API
- Copy: Project URL, anon key, service_role key

### 2. Run Schema
```bash
# Option 1: Via Supabase SQL Editor (Recommended)
# Copy schema.sql content and execute in Supabase

# Option 2: Via command line
psql YOUR_DATABASE_URL < schema.sql
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

## 🔌 Usage Examples

### React Frontend
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

// Get user homes
const { data } = await supabase
  .from('vw_UserHomeSummary')
  .select('*')
  .eq('user_id', userId)
```

### Python Flask
```python
from supabase import create_client

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

# Save prediction
supabase.rpc('sp_saveprediction', {
    'p_home_id': home_id,
    'p_predicted_kwh': kwh,
    'p_predicted_bill': bill,
    'p_confidence_score': confidence
}).execute()
```

## 📋 Database Requirements ✅

- ✅ 6 entities (tables)
- ✅ Normalized design (3NF)
- ✅ 5+ constraints of 3+ types
- ✅ Performance optimization (9 indexes)
- ✅ 2 stored procedures
- ✅ 5+ views
- ✅ 2 user-defined functions
- ✅ Security (RLS + Data Masking)


**Database Design:** Sharonne Kabamba