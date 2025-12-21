from flask import Flask, request, jsonify
from flask_cors import CORS  # <--- IMPORT THIS
import joblib
import pandas as pd
import os

app = Flask(__name__)
CORS(app)  # <--- ENABLE THIS

# Get the directory where app.py is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Loading trained model and scaler with absolute paths to avoid errors
try:
    model = joblib.load(os.path.join(BASE_DIR, 'energy_bill_model.pkl'))
    scaler = joblib.load(os.path.join(BASE_DIR, 'scaler.pkl'))
except FileNotFoundError:
    print("Error: Model files not found. Make sure .pkl files are in the BackEnd directory.")

WEATHER_LOOKUP = {
    1: {'temp_degree_days': 5816.356385018535, 'temp_cdd': 1516.2217819250927, 'temp_hdd': 4300.134603093443},
    2: {'temp_degree_days': 5452.325102880658, 'temp_cdd': 1892.1604938271605, 'temp_hdd': 3560.1646090534978},
    3: {'temp_degree_days': 5112.060606060606, 'temp_cdd': 1688.2727272727273, 'temp_hdd': 3423.787878787879},
    4: {'temp_degree_days': 4837.25, 'temp_cdd': 1530.0, 'temp_hdd': 3307.25},
    5: {'temp_degree_days': 5732.673550436854, 'temp_cdd': 1545.897537728356, 'temp_hdd': 4186.7760127084985}
}

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        
        # 1. Get User Inputs
        home_size = data['home_size']
        num_appliances = data['num_appliances']
        month = int(data['month'])
        
        # 2. Auto-fill Weather Data based on Month
        if month in WEATHER_LOOKUP:
            weather_data = WEATHER_LOOKUP[month]
        else:
            # Wrap months > 5 back to the available data (Mock logic)
            max_key = max(WEATHER_LOOKUP.keys())
            mapped_month = ((month - 1) % max_key) + 1
            weather_data = WEATHER_LOOKUP[mapped_month]
            
        # 3. Prepare Features
        input_df = pd.DataFrame([{
            'home_size': home_size,
            'num_appliances': num_appliances,
            'temp_degree_days': weather_data['temp_degree_days'],
            'temp_cdd': weather_data['temp_cdd'],
            'temp_hdd': weather_data['temp_hdd'],
            'month_periods': month
        }])

        # 4. Scale and Predict
        input_scaled = scaler.transform(input_df)
        prediction = model.predict(input_scaled)
        
        return jsonify({
            'success': True,
            'predicted_bill': float(prediction[0])
        })

    except Exception as e:
        print(f"Error: {e}") # Print error to terminal for debugging
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)