import { Link } from 'react-router-dom'
import { Zap, TrendingDown, BarChart3, Shield, ArrowRight, Lightbulb } from 'lucide-react'

const Landing = () => {
  const features = [
    {
      icon: Zap,
      title: 'AI-Powered Predictions',
      description: 'Advanced machine learning algorithms predict your energy bills with high accuracy',
    },
    {
      icon: TrendingDown,
      title: 'Cost Optimization',
      description: 'Get personalized recommendations to reduce your energy consumption and save money',
    },
    {
      icon: BarChart3,
      title: 'Usage Analytics',
      description: 'Track and analyze your energy consumption patterns over time with detailed reports',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your data is encrypted and protected with enterprise-grade security',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-primary-500 to-indigo-600 p-2 rounded-xl shadow-lg">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text font-display">EnergyAI</h1>
              <p className="text-xs text-slate-600">Smart City Energy Predictor</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/login" className="text-slate-700 hover:text-primary-600 font-medium transition-colors">
              Login
            </Link>
            <Link to="/register" className="btn-primary">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 md:py-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fade-in">
            <div className="inline-block px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
              🌟 AI-Powered Energy Management
            </div>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              Predict Your <span className="gradient-text font-display">Energy Bills</span> Before They Arrive
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed">
              Harness the power of machine learning to forecast your energy consumption, 
              optimize usage, and save money on your monthly bills.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/register" className="btn-primary flex items-center justify-center space-x-2 text-lg py-4">
                <span>Start Predicting</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/login" className="btn-secondary flex items-center justify-center space-x-2 text-lg py-4">
                <span>Sign In</span>
              </Link>
            </div>
            <div className="flex items-center space-x-8 pt-4">
              <div>
                <p className="text-3xl font-bold gradient-text">95%</p>
                <p className="text-sm text-slate-600">Accuracy Rate</p>
              </div>
              <div>
                <p className="text-3xl font-bold gradient-text">1000+</p>
                <p className="text-sm text-slate-600">Active Users</p>
              </div>
              <div>
                <p className="text-3xl font-bold gradient-text">30%</p>
                <p className="text-sm text-slate-600">Avg. Savings</p>
              </div>
            </div>
          </div>

          {/* Hero Image/Illustration */}
          <div className="relative animate-float">
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-slate-500">Monthly Prediction</p>
                  <p className="text-3xl font-bold gradient-text">$124.50</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <TrendingDown className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-600">Base Consumption</span>
                  <span className="font-semibold">$85.00</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-600">Seasonal Factor</span>
                  <span className="font-semibold">$22.50</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-600">Appliances</span>
                  <span className="font-semibold">$17.00</span>
                </div>
              </div>
              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-700 font-medium">Save $23/month with our recommendations</p>
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary-200 rounded-full blur-2xl opacity-50"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-indigo-200 rounded-full blur-2xl opacity-50"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Why Choose <span className="gradient-text font-display">EnergyAI</span>?
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Cutting-edge technology meets sustainable living
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="card hover:scale-105 transition-transform duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="bg-gradient-to-br from-primary-500 to-indigo-600 p-3 rounded-lg w-fit mb-4">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-primary-600 to-indigo-600 rounded-3xl shadow-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Save on Energy Costs?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of users who are already optimizing their energy consumption
          </p>
          <Link to="/register" className="inline-flex items-center space-x-2 bg-white text-primary-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-slate-100 transition-colors shadow-lg">
            <span>Get Started Free</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 border-t border-slate-200 mt-20">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Zap className="w-5 h-5 text-primary-600" />
            <span className="font-semibold">EnergyAI</span>
            <span className="text-slate-500">© 2024 Smart City Energy System</span>
          </div>
          <div className="flex space-x-6 text-slate-600">
            <a href="#" className="hover:text-primary-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-primary-600 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
