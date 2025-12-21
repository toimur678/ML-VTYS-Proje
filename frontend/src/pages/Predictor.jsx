import { useState, useEffect } from 'react'
import { Zap, Home, Cpu, Calendar, DollarSign, TrendingUp, Loader } from 'lucide-react'
import { predictionAPI } from '../services/api'
import { supabase } from '../services/supabase'

const Predictor = ({ user }) => {
  const [homes, setHomes] = useState([])
  const [formData, setFormData] = useState({
    home_id: '',
    home_size: '',
    num_appliances: '',
    month: new Date().getMonth() + 1,
  })
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadHomes()
  }, [user])

  const loadHomes = async () => {
    try {
      const { data } = await supabase
        .from('Homes')
        .select('*')
        .eq('user_id', user.id)
      setHomes(data || [])
    } catch (error) {
      console.error('Error loading homes:', error)
    }
  }

  const handleHomeSelect = (e) => {
    const homeId = e.target.value
    const selectedHome = homes.find(h => h.home_id === parseInt(homeId))
    
    if (selectedHome) {
      setFormData({
        ...formData,
        home_id: homeId,
        home_size: selectedHome.size_m2,
      })
      
      // Count appliances for this home
      loadAppliances(homeId)
    }
  }

  const loadAppliances = async (homeId) => {
    try {
      const { data } = await supabase
        .from('Appliances')
        .select('quantity')
        .eq('home_id', homeId)
      
      const totalAppliances = data?.reduce((sum, a) => sum + a.quantity, 0) || 0
      setFormData(prev => ({ ...prev, num_appliances: totalAppliances }))
    } catch (error) {
      console.error('Error loading appliances:', error)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setPrediction(null)

    try {
      // Call Flask ML API
      const result = await predictionAPI.predictBill(
        parseFloat(formData.home_size),
        parseInt(formData.num_appliances),
        parseInt(formData.month)
      )

      if (result.success) {
        setPrediction({
          bill: result.predicted_bill,
          kwh: (result.predicted_bill / 0.12).toFixed(2), // Assuming $0.12 per kWh
          month: formData.month,
        })

        // Save prediction to database
        if (formData.home_id) {
          await supabase.from('Predictions').insert([
            {
              home_id: parseInt(formData.home_id),
              user_id: user.id,
              predicted_kwh: (result.predicted_bill / 0.12).toFixed(2),
              predicted_bill: result.predicted_bill,
              ml_confidence_score: 0.85, // Mock confidence
            },
          ])
        }
      } else {
        setError('Prediction failed. Please try again.')
      }
    } catch (err) {
      console.error('Prediction error:', err)
      setError('Unable to generate prediction. Please check your input.')
    } finally {
      setLoading(false)
    }
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const getSeasonInfo = (month) => {
    if ([12, 1, 2].includes(month)) return { name: 'Winter', factor: 1.4, color: 'text-blue-600' }
    if ([3, 4, 5].includes(month)) return { name: 'Spring', factor: 0.9, color: 'text-green-600' }
    if ([6, 7, 8].includes(month)) return { name: 'Summer', factor: 1.3, color: 'text-orange-600' }
    return { name: 'Fall', factor: 1.0, color: 'text-amber-600' }
  }

  const season = getSeasonInfo(parseInt(formData.month))

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-800 mb-2 font-display">
          Energy Bill Predictor ⚡
        </h1>
        <p className="text-slate-600 text-lg">
          Get AI-powered predictions for your future energy bills
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Prediction Form */}
        <div className="card">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center space-x-2">
            <Cpu className="w-6 h-6 text-primary-600" />
            <span>Prediction Parameters</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Home Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Home (Optional)
              </label>
              <select
                name="home_id"
                value={formData.home_id}
                onChange={handleHomeSelect}
                className="input-field"
              >
                <option value="">Manual Entry</option>
                {homes.map((home) => (
                  <option key={home.home_id} value={home.home_id}>
                    {home.address} - {home.size_m2}m²
                  </option>
                ))}
              </select>
            </div>

            {/* Home Size */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Home Size (m²)
              </label>
              <div className="relative">
                <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="number"
                  name="home_size"
                  value={formData.home_size}
                  onChange={handleChange}
                  required
                  min="10"
                  max="1000"
                  step="0.1"
                  className="input-field pl-11"
                  placeholder="Enter home size"
                />
              </div>
            </div>

            {/* Number of Appliances */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Number of Appliances
              </label>
              <div className="relative">
                <Zap className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="number"
                  name="num_appliances"
                  value={formData.num_appliances}
                  onChange={handleChange}
                  required
                  min="0"
                  max="50"
                  className="input-field pl-11"
                  placeholder="e.g., 8"
                />
              </div>
            </div>

            {/* Month Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Prediction Month
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  name="month"
                  value={formData.month}
                  onChange={handleChange}
                  className="input-field pl-11"
                >
                  {months.map((month, index) => (
                    <option key={index} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Season Info */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Season</p>
                  <p className={`text-lg font-bold ${season.color}`}>{season.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">Impact Factor</p>
                  <p className="text-lg font-bold text-slate-800">{season.factor}x</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Generating Prediction...</span>
                </div>
              ) : (
                'Predict Energy Bill'
              )}
            </button>
          </form>
        </div>

        {/* Prediction Results */}
        <div className="space-y-6">
          {prediction ? (
            <>
              <div className="card bg-gradient-to-br from-primary-500 to-indigo-600 text-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Predicted Bill</h3>
                  <DollarSign className="w-8 h-8" />
                </div>
                <p className="text-5xl font-bold mb-2">${prediction.bill.toFixed(2)}</p>
                <p className="opacity-90">
                  For {months[prediction.month - 1]} {new Date().getFullYear()}
                </p>
              </div>

              <div className="card">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="bg-yellow-100 p-2 rounded-lg">
                        <Zap className="w-5 h-5 text-yellow-600" />
                      </div>
                      <span className="text-slate-700">Estimated Usage</span>
                    </div>
                    <span className="font-bold text-slate-800">{prediction.kwh} kWh</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <Home className="w-5 h-5 text-green-600" />
                      </div>
                      <span className="text-slate-700">Home Size</span>
                    </div>
                    <span className="font-bold text-slate-800">{formData.home_size} m²</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="bg-purple-100 p-2 rounded-lg">
                        <Cpu className="w-5 h-5 text-purple-600" />
                      </div>
                      <span className="text-slate-700">Appliances</span>
                    </div>
                    <span className="font-bold text-slate-800">{formData.num_appliances}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-slate-700">Season Factor</span>
                    </div>
                    <span className="font-bold text-slate-800">{season.factor}x</span>
                  </div>
                </div>
              </div>

              <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <h3 className="text-lg font-bold text-green-800 mb-3">💡 Energy Saving Tips</h3>
                <ul className="space-y-2 text-sm text-green-700">
                  <li>• Use energy-efficient LED bulbs to reduce consumption</li>
                  <li>• Set your thermostat 2-3°F lower in winter, higher in summer</li>
                  <li>• Unplug devices when not in use to prevent phantom energy drain</li>
                  <li>• Run dishwasher and laundry during off-peak hours</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="card h-full flex items-center justify-center text-center py-12">
              <div>
                <Cpu className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-600 mb-2">Ready to Predict</h3>
                <p className="text-slate-500">
                  Fill in the form to generate your AI-powered energy bill prediction
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Predictor
