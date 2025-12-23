import { useState, useEffect } from 'react'
import { Calendar, TrendingUp, DollarSign, Zap, Filter, Plus, X, Home } from 'lucide-react'
import { supabase } from '../services/supabase'

const History = ({ user }) => {
  const [history, setHistory] = useState([])
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('consumption') // 'consumption' or 'predictions'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  // Add Record State
  const [showAddModal, setShowAddModal] = useState(false)
  const [homes, setHomes] = useState([])
  const [newRecord, setNewRecord] = useState({
    home_id: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    kwh_used: '',
    bill_amount: ''
  })

  useEffect(() => {
    loadHistory()
  }, [user, selectedYear])

  const loadHistory = async () => {
    try {
      // Get user's homes
      // DATABASE QUERY: SELECT from Homes table (Entity #2)
      // Uses: RLS Policy homes_select_own
      const { data: homesData } = await supabase
        .from('Homes')
        .select('home_id, address')
        .eq('user_id', user.id)
      
      setHomes(homesData || [])

      if (homesData && homesData.length > 0) {
        const homeIds = homesData.map(h => h.home_id)

        // Get consumption history
        // DATABASE QUERY: SELECT from EnergyConsumption table (Entity #3)
        // Could use View: vw_MonthlyConsumption for formatted results
        // User-defined function: fn_CalculateSeasonFactor(month) calculates seasonal multipliers
        // Uses: Indexes idx_consumption_home, idx_consumption_date
        // RLS Policy: consumption_select_own
        const { data: consumption } = await supabase
          .from('EnergyConsumption')
          .select('*, home_id')
          .in('home_id', homeIds)
          .eq('year', selectedYear)
          .order('month', { ascending: false })

        // Map home addresses to consumption records
        const consumptionWithHomes = consumption?.map(c => ({
          ...c,
          address: homesData.find(h => h.home_id === c.home_id)?.address || 'Unknown',
        })) || []

        setHistory(consumptionWithHomes)

        // Get predictions
        // DATABASE QUERY: SELECT from Predictions table (Entity #4) with JOIN to Homes
        // Could use View: vw_PredictionAccuracy to compare with actual bills
        // Uses: Index idx_predictions_date
        // RLS Policy: predictions_select_own
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

  const handleAddRecord = async (e) => {
    e.preventDefault()
    try {
      // Add to EnergyConsumption
      // DATABASE INSERT: EnergyConsumption table (Entity #3)
      // Enforces: UNIQUE constraint (home_id, month, year)
      // CHECK constraints: month BETWEEN 1 AND 12, year >= 2020, kwh_used >= 0, bill_amount >= 0
      // RLS Policy: consumption_insert_own
      const { data: consumptionData, error: consumptionError } = await supabase
        .from('EnergyConsumption')
        .insert([{
          home_id: parseInt(newRecord.home_id),
          month: parseInt(newRecord.month),
          year: parseInt(newRecord.year),
          kwh_used: parseFloat(newRecord.kwh_used),
          bill_amount: parseFloat(newRecord.bill_amount)
        }])
        .select()

      if (consumptionError) throw consumptionError
      
      // Add to BillHistory - using correct field names matching database schema
      // DATABASE INSERT: BillHistory table (Entity #6)
      // Stored procedure sp_MonthlyReport can be used to generate reports
      // Enforces: UNIQUE constraint (home_id, month, year)
      // CHECK constraints: month BETWEEN 1 AND 12, year >= 2020, actual_amount >= 0
      // RLS Policy: bill_insert_own
      const dueDate = new Date()
      dueDate.setMonth(dueDate.getMonth() + 1)
      
      const { error: billError } = await supabase
        .from('BillHistory')
        .insert([{
          home_id: parseInt(newRecord.home_id),
          month: parseInt(newRecord.month),
          year: parseInt(newRecord.year),
          actual_amount: parseFloat(newRecord.bill_amount),
          due_date: dueDate.toISOString().split('T')[0],
          paid: true
        }])

      if (billError) console.error('Error adding bill history:', billError)

      setShowAddModal(false)
      setNewRecord({
        home_id: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        kwh_used: '',
        bill_amount: ''
      })
      loadHistory()
    } catch (error) {
      console.error('Error adding record:', error)
      alert('Failed to add record')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">History</h1>
          <p className="text-slate-500 text-sm">Track your past consumption and predictions</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="mac-btn flex items-center space-x-2 transition-all duration-200 hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Add Record</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-lg w-fit backdrop-blur-sm">
        <button
          onClick={() => setActiveTab('consumption')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-300 ${
            activeTab === 'consumption'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Consumption
        </button>
        <button
          onClick={() => setActiveTab('predictions')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-300 ${
            activeTab === 'predictions'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Predictions
        </button>
      </div>

      {/* Content */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 overflow-hidden min-h-[400px] transition-all duration-300">
        {activeTab === 'consumption' ? (
          <div className="p-0">
            <div className="p-4 border-b border-slate-200/50 flex items-center justify-between bg-white/40">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer"
                >
                  {[2025, 2024, 2023, 2022].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <span className="text-xs text-slate-500">{history.length} records found</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200/50">
                  <tr>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Property</th>
                    <th className="px-6 py-3 font-medium">Consumption</th>
                    <th className="px-6 py-3 font-medium">Bill Amount</th>
                    <th className="px-6 py-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.length > 0 ? (
                    history.map((record, index) => (
                      <tr key={index} className="hover:bg-white/70 transition-all duration-200">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {new Date(record.year, record.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{record.address}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <Zap className="w-4 h-4 text-blue-500" />
                            <span className="text-slate-700">{record.kwh_used} kWh</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="w-4 h-4 text-green-500" />
                            <span className="font-semibold text-slate-900">${record.bill_amount}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 transition-all duration-200 hover:bg-green-200">
                            Recorded
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                        No records found for {selectedYear}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200/50">
                  <tr>
                    <th className="px-6 py-3 font-medium">Date Predicted</th>
                    <th className="px-6 py-3 font-medium">Property</th>
                    <th className="px-6 py-3 font-medium">Est. Consumption</th>
                    <th className="px-6 py-3 font-medium">Est. Bill</th>
                    <th className="px-6 py-3 font-medium text-right">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {predictions.length > 0 ? (
                    predictions.map((pred, index) => (
                      <tr key={index} className="hover:bg-white/70 transition-all duration-200">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {new Date(pred.prediction_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {pred.Homes?.address || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          {parseFloat(pred.predicted_kwh).toFixed(2)} kWh
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          ${parseFloat(pred.predicted_bill).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
                                style={{ width: `${(pred.ml_confidence_score || 0.9) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-slate-500">
                              {((pred.ml_confidence_score || 0.9) * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                        No predictions history available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/50 transition-all duration-300">
            <div className="px-6 py-4 border-b border-slate-200/50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Add Consumption Record</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors duration-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddRecord} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Property</label>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    required
                    value={newRecord.home_id}
                    onChange={(e) => setNewRecord({ ...newRecord, home_id: e.target.value })}
                    className="mac-input pl-10"
                  >
                    <option value="">Select Home</option>
                    {homes.map(home => (
                      <option key={home.home_id} value={home.home_id}>{home.address}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Month</label>
                  <select
                    value={newRecord.month}
                    onChange={(e) => setNewRecord({ ...newRecord, month: e.target.value })}
                    className="mac-input"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Year</label>
                  <input
                    type="number"
                    required
                    value={newRecord.year}
                    onChange={(e) => setNewRecord({ ...newRecord, year: e.target.value })}
                    className="mac-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Consumption (kWh)</label>
                <div className="relative">
                  <Zap className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={newRecord.kwh_used}
                    onChange={(e) => setNewRecord({ ...newRecord, kwh_used: e.target.value })}
                    className="mac-input pl-10"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Bill Amount ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={newRecord.bill_amount}
                    onChange={(e) => setNewRecord({ ...newRecord, bill_amount: e.target.value })}
                    className="mac-input pl-10"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 mac-btn"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default History
