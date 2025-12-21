import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Zap, Home, TrendingUp, DollarSign, Calendar, ArrowRight } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [user])

  const loadDashboardData = async () => {
    try {
      // Get user's homes
      const { data: homes } = await supabase
        .from('Homes')
        .select('home_id')
        .eq('user_id', user.id)

      if (homes && homes.length > 0) {
        const homeIds = homes.map(h => h.home_id)

        // Get consumption data
        const { data: consumption } = await supabase
          .from('EnergyConsumption')
          .select('kwh_used, bill_amount, month, year')
          .in('home_id', homeIds)
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(12)

        // Get recent predictions
        const { data: predictions } = await supabase
          .from('Predictions')
          .select('*, Homes(address)')
          .eq('user_id', user.id)
          .order('prediction_date', { ascending: false })
          .limit(5)

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

        setRecentPredictions(predictions || [])
        
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

  const statCards = [
    {
      title: 'Total Homes',
      value: stats.totalHomes,
      icon: Home,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Total Consumption',
      value: `${stats.totalConsumption} kWh`,
      icon: Zap,
      color: 'from-yellow-500 to-orange-600',
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
    },
    {
      title: 'Total Bills',
      value: `$${stats.totalBills}`,
      icon: DollarSign,
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      title: 'Average Bill',
      value: `$${stats.avgBill}`,
      icon: TrendingUp,
      color: 'from-purple-500 to-indigo-600',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
  ]

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
          Welcome back! 👋
        </h1>
        <p className="text-slate-600 text-lg">
          Here's an overview of your energy consumption
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={index}
              className="card hover:scale-105 transition-transform duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-1">{stat.title}</p>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Consumption Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800">Energy Consumption</h3>
            <Calendar className="w-5 h-5 text-slate-400" />
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="kwh"
                  stroke="#0ea5e9"
                  strokeWidth={3}
                  dot={{ fill: '#0ea5e9', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400">
              <p>No consumption data available</p>
            </div>
          )}
        </div>

        {/* Bill Amount Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800">Monthly Bills</h3>
            <DollarSign className="w-5 h-5 text-slate-400" />
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="bill" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400">
              <p>No billing data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Predictions */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800">Recent Predictions</h3>
          <Link to="/predictor" className="text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-1">
            <span>New Prediction</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {recentPredictions.length > 0 ? (
          <div className="space-y-3">
            {recentPredictions.map((prediction, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div>
                  <p className="font-semibold text-slate-800">
                    {prediction.Homes?.address || 'Unknown Address'}
                  </p>
                  <p className="text-sm text-slate-500">
                    {new Date(prediction.prediction_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary-600">
                    ${parseFloat(prediction.predicted_bill).toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-500">
                    {parseFloat(prediction.predicted_kwh).toFixed(2)} kWh
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">No predictions yet</p>
            <Link to="/predictor" className="btn-primary inline-flex items-center space-x-2">
              <span>Make Your First Prediction</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        <Link
          to="/predictor"
          className="card hover:scale-105 transition-transform duration-300 bg-gradient-to-br from-primary-500 to-indigo-600 text-white"
        >
          <Zap className="w-8 h-8 mb-3" />
          <h3 className="text-xl font-bold mb-2">Predict Bill</h3>
          <p className="opacity-90">Get AI-powered predictions for your next bill</p>
        </Link>

        <Link
          to="/homes"
          className="card hover:scale-105 transition-transform duration-300 bg-gradient-to-br from-green-500 to-emerald-600 text-white"
        >
          <Home className="w-8 h-8 mb-3" />
          <h3 className="text-xl font-bold mb-2">Manage Homes</h3>
          <p className="opacity-90">Add or update your property information</p>
        </Link>

        <Link
          to="/history"
          className="card hover:scale-105 transition-transform duration-300 bg-gradient-to-br from-purple-500 to-pink-600 text-white"
        >
          <Calendar className="w-8 h-8 mb-3" />
          <h3 className="text-xl font-bold mb-2">View History</h3>
          <p className="opacity-90">Check your consumption and bill history</p>
        </Link>
      </div>
    </div>
  )
}

export default Dashboard
