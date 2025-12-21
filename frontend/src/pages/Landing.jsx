import { Link } from 'react-router-dom'
import { Zap, TrendingDown, BarChart3, Shield, ChevronRight } from 'lucide-react'

const Landing = () => {
  const features = [
    {
      icon: Zap,
      title: 'AI-Powered.',
      subtitle: 'Predictions that learn.',
      description: 'Advanced machine learning algorithms analyze your usage patterns to predict bills with incredible accuracy.',
    },
    {
      icon: TrendingDown,
      title: 'Cost Optimization.',
      subtitle: 'Save more.',
      description: 'Get personalized recommendations to reduce your energy consumption and keep more money in your pocket.',
    },
    {
      icon: BarChart3,
      title: 'Analytics.',
      subtitle: 'Deep insights.',
      description: 'Track and analyze your energy consumption patterns over time with beautiful, detailed reports.',
    },
    {
      icon: Shield,
      title: 'Secure.',
      subtitle: 'Private by design.',
      description: 'Your data is encrypted and protected with enterprise-grade security. Your energy data stays yours.',
    },
  ]

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-200/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-slate-900 fill-current" />
            <span className="font-semibold tracking-tight">EnergyAI</span>
          </div>
          <div className="flex items-center space-x-6 text-xs font-medium">
            <Link to="/login" className="text-slate-600 hover:text-slate-900 transition-colors">
              Sign in
            </Link>
            <Link to="/register" className="bg-slate-900 text-white px-3 py-1.5 rounded-full hover:bg-slate-800 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900">
            Energy intelligence. <br />
            <span className="text-slate-400">Simplified.</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
            Predict your energy bills before they arrive. Optimize usage. Save money. All with the power of AI.
          </p>
          <div className="pt-8 flex items-center justify-center space-x-4">
            <Link to="/register" className="group flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium text-lg transition-colors">
              <span>Try it free</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/login" className="text-slate-500 hover:text-slate-900 font-medium text-lg transition-colors">
              Learn more
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="group p-8 rounded-3xl bg-white hover:shadow-xl transition-all duration-500 border border-slate-100">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-6 h-6 text-slate-900" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-1">{feature.title}</h3>
                  <h4 className="text-xl font-semibold text-slate-400 mb-4">{feature.subtitle}</h4>
                  <p className="text-slate-600 leading-relaxed text-lg">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 text-center bg-white">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
            Ready to take control?
          </h2>
          <p className="text-xl text-slate-500">
            Join thousands of users who are already saving on their energy bills.
          </p>
          <Link to="/register" className="inline-block bg-slate-900 text-white px-8 py-4 rounded-full font-medium text-lg hover:bg-slate-800 transition-all hover:scale-105 shadow-lg hover:shadow-xl">
            Get Started Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 py-12 px-6 border-t border-slate-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-sm text-slate-500">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Zap className="w-4 h-4" />
            <span>© 2025 EnergyAI. All rights reserved.</span>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
