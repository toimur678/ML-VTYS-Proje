import { useState, useEffect } from 'react'
import { Zap, Home, Cpu, Calendar, DollarSign, TrendingUp, Loader, AlertCircle } from 'lucide-react'
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
      // DATABASE QUERY: SELECT from Homes table (Entity #2)
      // Uses: RLS Policy homes_select_own, index idx_homes_user
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
      // DATABASE QUERY: SELECT from Appliances table (Entity #5) with aggregation
      // Uses: RLS Policy appliances_select_own, index idx_appliances_home
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
          // DATABASE INSERT: Predictions table (Entity #4)
          // Could use stored procedure: sp_SavePrediction for this operation
          // Enforces: CHECK constraints on predicted_kwh >= 0, predicted_bill >= 0
          // ml_confidence_score BETWEEN 0 AND 1
          // RLS Policy: predictions_insert_own - validates user_id
          const { data: predData, error: predError } = await supabase.from('Predictions').insert([
            {
              home_id: parseInt(formData.home_id),
              user_id: user.id,
              predicted_kwh: parseFloat((result.predicted_bill / 0.12).toFixed(2)),
              predicted_bill: parseFloat(result.predicted_bill.toFixed(2)),
              prediction_date: new Date().toISOString(),
              ml_confidence_score: 0.95 // Mock confidence score
            }
          ])
          
          if (predError) console.error('Error saving prediction:', predError)
        }
      } else {
        setError('Prediction failed. Please try again.')
      }
    } catch (err) {
      console.error('Prediction error:', err)
      setError('Failed to connect to prediction service. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Bill Predictor</h1>
          <p className="text-slate-500 text-sm">AI-powered energy cost estimation</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Input Form */}
        <div className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-white/50 transition-all duration-300 hover:shadow-md">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Select Home</label>
              <div className="relative">
                <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  name="home_id"
                  value={formData.home_id}
                  onChange={handleHomeSelect}
                  className="mac-input pl-10"
                >
                  <option value="">-- Select a Home --</option>
                  {homes.map(home => (
                    <option key={home.home_id} value={home.home_id}>
                      {home.address}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Size (m²)</label>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    name="home_size"
                    value={formData.home_size}
                    onChange={handleChange}
                    required
                    className="mac-input pl-10"
                    placeholder="120"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Appliances</label>
                <div className="relative">
                  <Cpu className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    name="num_appliances"
                    value={formData.num_appliances}
                    onChange={handleChange}
                    required
                    className="mac-input pl-10"
                    placeholder="5"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Month</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  name="month"
                  value={formData.month}
                  onChange={handleChange}
                  className="mac-input pl-10"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mac-btn py-3 text-base flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Calculating...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>Predict Bill</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          {prediction ? (
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-lg border border-white/60 animate-fade-in transition-all duration-300">
              <div className="text-center mb-8">
                <p className="text-slate-500 font-medium mb-2">Estimated Bill for {new Date(0, prediction.month - 1).toLocaleString('default', { month: 'long' })}</p>
                <div className="flex items-center justify-center text-5xl font-bold text-slate-800 tracking-tighter">
                  <span className="text-3xl mr-1 text-slate-400">$</span>
                  {prediction.bill.toFixed(2)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-blue-50 p-4 rounded-xl text-center transition-all duration-200 hover:bg-blue-100">
                  <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Consumption</p>
                  <p className="text-xl font-bold text-slate-800">{prediction.kwh} kWh</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl text-center transition-all duration-200 hover:bg-green-100">
                  <p className="text-xs text-green-600 font-semibold uppercase mb-1">Savings Potential</p>
                  <p className="text-xl font-bold text-slate-800">~15%</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700">Recommendations</h4>
                <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 transition-all duration-200 hover:bg-slate-100">
                  <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p>Consider running high-energy appliances during off-peak hours to reduce costs.</p>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 transition-all duration-200 hover:bg-slate-100">
                  <Zap className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <p>Your predicted usage is slightly higher than average for this home size.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/40 backdrop-blur-sm p-8 rounded-2xl border border-white/30 flex flex-col items-center justify-center min-h-[400px] text-center transition-all duration-300 hover:bg-white/50">
              <div className="w-20 h-20 bg-white/50 rounded-full flex items-center justify-center mb-6 shadow-sm">
                <Zap className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">Ready to Predict</h3>
              <p className="text-slate-500 max-w-xs">
                Fill out the form to get an AI-powered estimate of your next electricity bill.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Predictor
