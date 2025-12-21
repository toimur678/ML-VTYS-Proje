import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Zap, Home, TrendingUp, DollarSign, Plus, CreditCard, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { supabase } from '../services/supabase'

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState({
    totalHomes: 0,
    totalConsumption: 0,
    totalBills: 0,
    avgBill: 0,
  })
  const [recentPredictions, setRecentPredictions] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [billHistory, setBillHistory] = useState([])
  const [applianceImpact, setApplianceImpact] = useState([])
  const [homeSummary, setHomeSummary] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadDashboardData()
  }, [user])

  const loadDashboardData = async () => {
    try {
      // Get user's homes
      const { data: homes } = await supabase
        .from('Homes')
        .select('home_id, address, home_type, size_m2')
        .eq('user_id', user.id)

      if (homes && homes.length > 0) {
        const homeIds = homes.map(h => h.home_id)

        // Get consumption data
        const { data: consumption } = await supabase
          .from('EnergyConsumption')
          .select('kwh_used, bill_amount, month, year, home_id')
          .in('home_id', homeIds)
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(12)

        // Get recent predictions
        const { data: predictions, error: predError } = await supabase
          .from('Predictions')
          .select('prediction_id, home_id, predicted_kwh, predicted_bill, prediction_date, ml_confidence_score')
          .eq('user_id', user.id)
          .order('prediction_date', { ascending: false })
          .limit(5)
        
        if (predError) console.error('Error loading predictions:', predError)
        
        // Manually fetch home addresses for predictions
        const predictionsWithHomes = await Promise.all(
          (predictions || []).map(async (pred) => {
            const { data: home } = await supabase
              .from('Homes')
              .select('address')
              .eq('home_id', pred.home_id)
              .single()
            return { ...pred, address: home?.address || 'Unknown' }
          })
        )

        // Get bill history with payment status
        const { data: bills } = await supabase
          .from('BillHistory')
          .select('*')
          .in('home_id', homeIds)
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(10)

        const billsWithHomes = (bills || []).map(bill => ({
          ...bill,
          address: homes.find(h => h.home_id === bill.home_id)?.address || 'Unknown'
        }))

        setBillHistory(billsWithHomes)

        // Get appliance data for impact chart
        const { data: appliances } = await supabase
          .from('Appliances')
          .select('appliance_type, wattage, quantity, avg_hours_per_day')
          .in('home_id', homeIds)

        // Group appliances by type
        const applianceGroups = (appliances || []).reduce((acc, app) => {
          const type = app.appliance_type
          const dailyKwh = (app.wattage * app.avg_hours_per_day * app.quantity) / 1000
          if (!acc[type]) {
            acc[type] = { name: type.replace('_', ' '), value: 0 }
          }
          acc[type].value += dailyKwh
          return acc
        }, {})
        
        setApplianceImpact(Object.values(applianceGroups))

        // Create home summary with consumption
        const homeSummaryData = homes.map(home => {
          const homeConsumption = consumption?.filter(c => c.home_id === home.home_id) || []
          const totalKwh = homeConsumption.reduce((sum, c) => sum + parseFloat(c.kwh_used || 0), 0)
          const totalBill = homeConsumption.reduce((sum, c) => sum + parseFloat(c.bill_amount || 0), 0)
          return {
            ...home,
            totalKwh: totalKwh.toFixed(2),
            totalBill: totalBill.toFixed(2)
          }
        })
        setHomeSummary(homeSummaryData)

        // Calculate stats
        const totalConsumption = consumption?.reduce((sum, c) => sum + parseFloat(c.kwh_used || 0), 0) || 0
        const totalBills = consumption?.reduce((sum, c) => sum + parseFloat(c.bill_amount || 0), 0) || 0
        const avgBill = consumption?.length > 0 ? totalBills / consumption.length : 0

        setStats({
          totalHomes: homes.length,
          totalConsumption: totalConsumption.toFixed(2),
          totalBills: totalBills.toFixed(2),
          avgBill: avgBill.toFixed(2),
        })

        setRecentPredictions(predictionsWithHomes || [])
        
        // Format monthly data for chart
        const chartData = consumption?.map(c => ({
          month: `${c.month}/${c.year}`,
          kwh: parseFloat(c.kwh_used || 0),
          bill: parseFloat(c.bill_amount || 0),
        })).reverse() || []
        
        setMonthlyData(chartData)
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkBillPaid = async (billId) => {
    try {
      const { error } = await supabase
        .from('BillHistory')
        .update({ paid: true, payment_date: new Date().toISOString().split('T')[0] })
        .eq('bill_id', billId)

      if (error) throw error
      loadDashboardData()
    } catch (error) {
      console.error('Error marking bill as paid:', error)
    }
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 text-sm">Overview of your energy metrics</p>
        </div>
        <Link to="/predictor" className="mac-btn flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>New Prediction</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-lg w-fit backdrop-blur-sm">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
            activeTab === 'overview'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('bills')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
            activeTab === 'bills'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Bills
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
            activeTab === 'analytics'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Analytics
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-white/50">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-blue-500 p-2 rounded-xl text-white shadow-md">
                  <Home className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Homes</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{stats.totalHomes}</p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-white/50">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-yellow-500 p-2 rounded-xl text-white shadow-md">
                  <Zap className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Consumption</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{stats.totalConsumption} kWh</p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-white/50">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-green-500 p-2 rounded-xl text-white shadow-md">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Bills</p>
              <p className="text-xl font-bold text-slate-800 mt-1">${stats.totalBills}</p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-white/50">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-purple-500 p-2 rounded-xl text-white shadow-md">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Avg Bill</p>
              <p className="text-xl font-bold text-slate-800 mt-1">${stats.avgBill}</p>
            </div>
          </div>

          {/* Charts and Predictions */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-white/50">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-800">Energy Consumption</h3>
                  <div className="flex space-x-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    <span className="text-xs text-slate-500">kWh</span>
                  </div>
                </div>
                {monthlyData.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            fontSize: '12px'
                          }}
                        />
                        <Line type="monotone" dataKey="kwh" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-slate-400">
                    <p>No consumption data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Predictions */}
            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-white/50">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Predictions</h3>
              {recentPredictions.length > 0 ? (
                <div className="space-y-3">
                  {recentPredictions.map((prediction, index) => (
                    <div key={index} className="p-3 bg-white/50 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-medium text-slate-800 text-sm truncate" title={prediction.address}>
                          {prediction.address}
                        </p>
                        <span className="text-xs text-slate-400">
                          {new Date(prediction.prediction_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-lg font-bold text-slate-800">${parseFloat(prediction.predicted_bill).toFixed(0)}</span>
                        <span className="text-sm text-slate-500">{parseFloat(prediction.predicted_kwh).toFixed(0)} kWh</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Zap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No predictions yet</p>
                  <Link to="/predictor" className="mac-btn text-xs mt-3 inline-block">Start Predicting</Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'bills' && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 overflow-hidden">
          <div className="p-4 border-b border-slate-200/50 bg-white/40">
            <h3 className="text-lg font-semibold text-slate-800">Bill Payment Tracking</h3>
            <p className="text-sm text-slate-500">Manage and track your bill payments</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200/50">
                <tr>
                  <th className="px-6 py-3 font-medium">Period</th>
                  <th className="px-6 py-3 font-medium">Property</th>
                  <th className="px-6 py-3 font-medium">Amount</th>
                  <th className="px-6 py-3 font-medium">Due Date</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {billHistory.length > 0 ? (
                  billHistory.map((bill) => (
                    <tr key={bill.bill_id} className="hover:bg-white/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {bill.month}/{bill.year}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{bill.address}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4 text-green-500" />
                          <span className="font-semibold text-slate-900">${bill.actual_amount}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {bill.due_date ? new Date(bill.due_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {bill.paid ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" /> Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Clock className="w-3 h-3 mr-1" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!bill.paid && (
                          <button
                            onClick={() => handleMarkBillPaid(bill.bill_id)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                      <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p>No bill history found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Appliance Impact */}
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-white/50">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Appliance Energy Impact</h3>
            <p className="text-sm text-slate-500 mb-4">Daily energy consumption by appliance type (kWh)</p>
            {applianceImpact.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={applianceImpact}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}`}
                    >
                      {applianceImpact.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-400">
                <p>No appliance data available</p>
              </div>
            )}
          </div>

          {/* Home Summary */}
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-white/50">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Home Summary</h3>
            <p className="text-sm text-slate-500 mb-4">Energy usage by property</p>
            <div className="space-y-3">
              {homeSummary.length > 0 ? (
                homeSummary.map((home) => (
                  <div key={home.home_id} className="p-4 bg-white/50 rounded-xl border border-slate-100">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-slate-800">{home.address}</p>
                        <p className="text-xs text-slate-500">{home.home_type} • {home.size_m2} m²</p>
                      </div>
                      <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <Home className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex justify-between mt-3 pt-3 border-t border-slate-100">
                      <div>
                        <p className="text-xs text-slate-500">Total Usage</p>
                        <p className="font-semibold text-slate-800">{home.totalKwh} kWh</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Total Bills</p>
                        <p className="font-semibold text-slate-800">${home.totalBill}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Home className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>No homes registered</p>
                  <Link to="/homes" className="mac-btn text-xs mt-3 inline-block">Add Home</Link>
                </div>
              )}
            </div>
          </div>

          {/* Monthly Bills Chart */}
          <div className="lg:col-span-2 bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-white/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Monthly Bills</h3>
              <div className="flex space-x-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-xs text-slate-500">USD</span>
              </div>
            </div>
            {monthlyData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="bill" fill="#10b981" radius={[6, 6, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-400">
                <p>No billing data available</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
