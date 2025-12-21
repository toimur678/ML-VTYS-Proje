import { useState, useEffect } from 'react'
import { Calendar, TrendingUp, DollarSign, Zap, Filter } from 'lucide-react'
import { supabase } from '../services/supabase'

const History = ({ user }) => {
  const [history, setHistory] = useState([])
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('consumption') // 'consumption' or 'predictions'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    loadHistory()
  }, [user, selectedYear])

  const loadHistory = async () => {
    try {
      // Get user's homes
      const { data: homes } = await supabase
        .from('Homes')
        .select('home_id, address')
        .eq('user_id', user.id)

      if (homes && homes.length > 0) {
        const homeIds = homes.map(h => h.home_id)

        // Get consumption history
        const { data: consumption } = await supabase
          .from('EnergyConsumption')
          .select('*, home_id')
          .in('home_id', homeIds)
          .eq('year', selectedYear)
          .order('month', { ascending: false })

        // Map home addresses to consumption records
        const consumptionWithHomes = consumption?.map(c => ({
          ...c,
          address: homes.find(h => h.home_id === c.home_id)?.address || 'Unknown',
        })) || []

        setHistory(consumptionWithHomes)

        // Get predictions
        const { data: predictionData } = await supabase
          .from('Predictions')
          .select('*, Homes(address)')
          .eq('user_id', user.id)
          .order('prediction_date', { ascending: false })
          .limit(20)

        setPredictions(predictionData || [])
      }
    } catch (error) {
      console.error('Error loading history:', error)
    } finally {
      setLoading(false)
    }
  }

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-800 mb-2 font-display">
          History & Records 📊
        </h1>
        <p className="text-slate-600 text-lg">
          View your past consumption, bills, and predictions
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setActiveTab('consumption')}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'consumption'
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          Consumption History
        </button>
        <button
          onClick={() => setActiveTab('predictions')}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'predictions'
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          Predictions
        </button>
      </div>

      {/* Consumption History Tab */}
      {activeTab === 'consumption' && (
        <>
          {/* Year Filter */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-700">Filter by Year:</span>
              </div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="input-field w-auto"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Consumption Records */}
          {history.length === 0 ? (
            <div className="card text-center py-16">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-600 mb-2">No Records Found</h3>
              <p className="text-slate-500">No consumption data available for {selectedYear}</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {history.map((record, index) => (
                <div
                  key={index}
                  className="card hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="w-5 h-5 text-primary-600" />
                        <h3 className="text-lg font-bold text-slate-800">
                          {months[record.month - 1]} {record.year}
                        </h3>
                      </div>
                      <p className="text-sm text-slate-600 mb-1">{record.address}</p>
                      {record.avg_temperature && (
                        <p className="text-sm text-slate-500">
                          Avg. Temp: {record.avg_temperature}°C
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <div className="bg-yellow-50 px-4 py-3 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <Zap className="w-4 h-4 text-yellow-600" />
                          <span className="text-xs text-yellow-700 font-medium">Consumption</span>
                        </div>
                        <p className="text-2xl font-bold text-yellow-800">
                          {parseFloat(record.kwh_used).toFixed(2)}
                        </p>
                        <p className="text-xs text-yellow-600">kWh</p>
                      </div>

                      <div className="bg-green-50 px-4 py-3 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="text-xs text-green-700 font-medium">Bill Amount</span>
                        </div>
                        <p className="text-2xl font-bold text-green-800">
                          ${parseFloat(record.bill_amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-green-600">
                          ${(parseFloat(record.bill_amount) / parseFloat(record.kwh_used)).toFixed(3)}/kWh
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary Stats */}
          {history.length > 0 && (
            <div className="grid md:grid-cols-3 gap-6">
              <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <h4 className="text-sm font-medium text-blue-700 mb-2">Total Consumption</h4>
                <p className="text-3xl font-bold text-blue-800">
                  {history.reduce((sum, r) => sum + parseFloat(r.kwh_used), 0).toFixed(2)} kWh
                </p>
              </div>

              <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <h4 className="text-sm font-medium text-green-700 mb-2">Total Bills</h4>
                <p className="text-3xl font-bold text-green-800">
                  ${history.reduce((sum, r) => sum + parseFloat(r.bill_amount), 0).toFixed(2)}
                </p>
              </div>

              <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <h4 className="text-sm font-medium text-purple-700 mb-2">Average Monthly</h4>
                <p className="text-3xl font-bold text-purple-800">
                  ${(history.reduce((sum, r) => sum + parseFloat(r.bill_amount), 0) / history.length).toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Predictions Tab */}
      {activeTab === 'predictions' && (
        <>
          {predictions.length === 0 ? (
            <div className="card text-center py-16">
              <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-600 mb-2">No Predictions Yet</h3>
              <p className="text-slate-500">Start making predictions to see them here</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {predictions.map((prediction, index) => (
                <div
                  key={index}
                  className="card hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-primary-600" />
                        <h3 className="text-lg font-bold text-slate-800">
                          Prediction - {formatDate(prediction.prediction_date)}
                        </h3>
                      </div>
                      <p className="text-sm text-slate-600">
                        {prediction.Homes?.address || 'Unknown Address'}
                      </p>
                      {prediction.ml_confidence_score && (
                        <div className="mt-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-slate-500">Confidence:</span>
                            <div className="flex-1 max-w-xs h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-600"
                                style={{ width: `${prediction.ml_confidence_score * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium text-slate-700">
                              {(prediction.ml_confidence_score * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <div className="bg-yellow-50 px-4 py-3 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <Zap className="w-4 h-4 text-yellow-600" />
                          <span className="text-xs text-yellow-700 font-medium">Predicted Usage</span>
                        </div>
                        <p className="text-2xl font-bold text-yellow-800">
                          {parseFloat(prediction.predicted_kwh).toFixed(2)}
                        </p>
                        <p className="text-xs text-yellow-600">kWh</p>
                      </div>

                      <div className="bg-primary-50 px-4 py-3 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <DollarSign className="w-4 h-4 text-primary-600" />
                          <span className="text-xs text-primary-700 font-medium">Predicted Bill</span>
                        </div>
                        <p className="text-2xl font-bold text-primary-800">
                          ${parseFloat(prediction.predicted_bill).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default History
