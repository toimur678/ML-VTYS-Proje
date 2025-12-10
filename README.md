# 🏠 Home Energy Bill Predictor

A machine learning web application that predicts monthly electricity bills based on home characteristics and consumption patterns. Built for university coursework combining Database Management and Machine Learning.

## 📋 About

This project helps homeowners estimate their electricity bills by analyzing home size, appliances, seasonal patterns, and historical consumption data. The system uses machine learning models trained on real household energy consumption data.

## ✨ Features

- **ML-Powered Predictions**: Predicts electricity bills using Random Forest/Linear Regression.
- **Interactive Dashboard**: User-friendly interface to input home details.
- **Real-time Insights**: Compare predicted vs actual bills.

## 🛠️ Tech Stack

- **Frontend**: React + Vite
- **Backend & ML Service**: Python Flask
- **ML Libraries**: Scikit-learn, Pandas, NumPy, Joblib

## 📁 Project Structure

```
├── FrontEnd/          # React + Vite application (User Interface)
├── BackEnd/           # Python Flask API & ML Models
│   ├── app.py         # Main Flask Application
│   ├── *.pkl          # Trained ML Models
│   ├── *.ipynb        # Jupyter Notebooks for EDA and Training
│   └── *.csv          # Data files
└── README.md          # Project Documentation
```

## 🚀 Getting Started & Installation

### 1. Prerequisites

- Node.js (v16+)
- Python (v3.8+)

### 2. Setup Guide

#### 🟢 Step 1: Backend (Python Flask API)

The backend serves the Machine Learning model and handles API requests.

1. Navigate to the `BackEnd` directory:
   ```bash
   cd BackEnd
   ```

2. Create and activate a virtual environment (recommended):
   ```bash
   # Mac/Linux:
   python3 -m venv venv
   source venv/bin/activate

   # Windows:
   python -m venv venv
   venv\Scripts\activate
   ```

3. Install the required Python libraries:
   ```bash
   pip install flask pandas scikit-learn joblib numpy matplotlib seaborn
   ```

4. Run the application:
   ```bash
   python app.py
   ```
   *The server will start on http://127.0.0.1:5001*

#### 🟡 Step 2: Frontend (React UI)

1. Navigate to the `FrontEnd` directory:
   ```bash
   cd FrontEnd
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```
   *The frontend will typically run on http://localhost:5173*

## ⚡ How to Run the App

You will need **2 separate terminal windows** open.

### Terminal 1: Backend 🧠
```bash
cd BackEnd
# Ensure venv is active
python app.py
```

### Terminal 2: Frontend 💻
```bash
cd FrontEnd
npm run dev
```

## 🧪 How to Test the ML Model (Without Frontend)

You can test the API directly using `curl`:

```bash
curl -X POST http://127.0.0.1:5001/predict \
     -H "Content-Type: application/json" \
     -d '{"home_size": 120, "num_appliances": 5, "month": 7}'
```

**Success Response:**
```json
{
    "predicted_bill": 845.7639, 
    "success": true
}
```

## 🎯 ML Model Details

- **Input Features**:
  1. `home_size` (m²)
  2. `num_appliances` (Count)
  3. `month` (1-12) -> *Automatically maps to weather data*
- **Target**: `bill_amount` (TL)
- **Model**: Saved as `energy_bill_model.pkl`

## 📝 License

This project is created for educational purposes.

