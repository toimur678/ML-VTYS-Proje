# Home Energy Bill Predictor - README

Here's a simple, clean README for your GitHub repository:

```markdown
# 🏠 Home Energy Bill Predictor

A machine learning web application that predicts monthly electricity bills based on home characteristics and consumption patterns. Built for university coursework combining Database Management and Machine Learning.

## 📋 About

This project helps homeowners estimate their electricity bills by analyzing home size, appliances, seasonal patterns, and historical consumption data. The system uses machine learning models trained on real Turkish household energy consumption data.

## ✨ Features

- **ML-Powered Predictions**: Predicts electricity bills using Random Forest/Linear Regression
- **Interactive Dashboard**: User-friendly interface to input home details
- **Historical Analysis**: View past consumption patterns and prediction accuracy
- **Multi-User Support**: Separate dashboards for users and administrators
- **Real-time Insights**: Compare predicted vs actual bills

## 🛠️ Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **ML Service**: Python Flask
- **Database**: PostgreSQL (Supabase)
- **Web Scraping**: BeautifulSoup, Selenium
- **ML Libraries**: Scikit-learn, Pandas, NumPy

## 📊 Database Structure

- 6+ entities including Users, Homes, EnergyConsumption, Predictions, Appliances, BillHistory
- Stored Procedures, Views, and User-Defined Functions
- Optimized with indexes and constraints

## 🚀 Getting Started

### Prerequisites
```
Node.js (v16+)
Python (v3.8+)
PostgreSQL or Supabase account
```

### Installation

1. Clone the repository

2. Install frontend dependencies
```
cd frontend
npm install
```

3. Install backend dependencies
```
cd backend
npm install
```

4. Install ML service dependencies
```
cd ml-service
pip install -r requirements.txt
```

5. Configure environment variables

6. Run the application
```
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
npm start

# Terminal 3 - ML Service
python app.py
```

## 📁 Project Structure

```
├── frontend/          # React + Vite application
├── backend/           # Node.js API
├── ml-service/        # Python Flask ML model
├── data/              # Scraped and processed datasets
├── notebooks/         # Jupyter notebooks for EDA
└── database/          # SQL scripts and schemas
```

## 🎯 ML Model

- **Data Source**: Scraped from Turkish forums (Ekşi Sözlük, Donanım Haber)
- **Features**: home_size, num_appliances, month, temperature
- **Target**: bill_amount (TL)
- **Models Tested**: Linear Regression, Random Forest, Decision Tree
- **Best Model**: [Your best model] with [accuracy]% accuracy

## 📝 License

This project is created for educational purposes as part of university coursework.