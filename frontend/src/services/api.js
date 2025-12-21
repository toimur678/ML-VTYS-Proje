import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const predictionAPI = {
  // Predict energy bill
  predictBill: async (homeSize, numAppliances, month) => {
    try {
      const response = await api.post('/predict', {
        home_size: homeSize,
        num_appliances: numAppliances,
        month: month,
      })
      return response.data
    } catch (error) {
      console.error('Prediction API Error:', error)
      throw error
    }
  },
}

export default api
