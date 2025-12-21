import { useState, useEffect } from 'react'
import { Home, Plus, Edit, Trash2, MapPin, Square, Bed } from 'lucide-react'
import { supabase } from '../services/supabase'

const Homes = ({ user }) => {
  const [homes, setHomes] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingHome, setEditingHome] = useState(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    address: '',
    home_type: 'apartment',
    size_m2: '',
    num_rooms: '',
    has_ac: false,
    has_heater: false,
  })

  useEffect(() => {
    loadHomes()
  }, [user])

  const loadHomes = async () => {
    try {
      const { data, error } = await supabase
        .from('Homes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setHomes(data || [])
    } catch (error) {
      console.error('Error loading homes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      if (editingHome) {
        // Update existing home
        const { error } = await supabase
          .from('Homes')
          .update({
            ...formData,
            size_m2: parseFloat(formData.size_m2),
            num_rooms: parseInt(formData.num_rooms),
          })
          .eq('home_id', editingHome.home_id)

        if (error) throw error
      } else {
        // Create new home
        const { error } = await supabase
          .from('Homes')
          .insert([{
            ...formData,
            user_id: user.id,
            size_m2: parseFloat(formData.size_m2),
            num_rooms: parseInt(formData.num_rooms),
          }])

        if (error) throw error
      }

      resetForm()
      loadHomes()
    } catch (error) {
      console.error('Error saving home:', error)
      alert('Failed to save home. Please try again.')
    }
  }

  const handleEdit = (home) => {
    setEditingHome(home)
    setFormData({
      address: home.address,
      home_type: home.home_type,
      size_m2: home.size_m2,
      num_rooms: home.num_rooms,
      has_ac: home.has_ac,
      has_heater: home.has_heater,
    })
    setShowModal(true)
  }

  const handleDelete = async (homeId) => {
    if (!confirm('Are you sure you want to delete this home?')) return

    try {
      const { error } = await supabase
        .from('Homes')
        .delete()
        .eq('home_id', homeId)

      if (error) throw error
      loadHomes()
    } catch (error) {
      console.error('Error deleting home:', error)
      alert('Failed to delete home. Please try again.')
    }
  }

  const resetForm = () => {
    setFormData({
      address: '',
      home_type: 'apartment',
      size_m2: '',
      num_rooms: '',
      has_ac: false,
      has_heater: false,
    })
    setEditingHome(null)
    setShowModal(false)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-800 mb-2 font-display">My Homes</h1>
          <p className="text-slate-600 text-lg">Manage your properties and their details</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add Home</span>
        </button>
      </div>

      {/* Homes Grid */}
      {homes.length === 0 ? (
        <div className="card text-center py-16">
          <Home className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-600 mb-2">No Homes Yet</h3>
          <p className="text-slate-500 mb-6">Add your first home to start tracking energy consumption</p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary inline-flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Your First Home</span>
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {homes.map((home, index) => (
            <div
              key={home.home_id}
              className="card hover:scale-105 transition-transform duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${
                  home.home_type === 'house' 
                    ? 'bg-blue-100' 
                    : 'bg-purple-100'
                }`}>
                  <Home className={`w-6 h-6 ${
                    home.home_type === 'house'
                      ? 'text-blue-600'
                      : 'text-purple-600'
                  }`} />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(home)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4 text-slate-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(home.home_id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-800 mb-3 capitalize">
                {home.home_type}
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex items-start space-x-2 text-slate-600">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{home.address}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-600">
                  <Square className="w-4 h-4" />
                  <span>{home.size_m2} m²</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-600">
                  <Bed className="w-4 h-4" />
                  <span>{home.num_rooms} rooms</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 flex items-center space-x-3">
                {home.has_ac && (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                    AC
                  </span>
                )}
                {home.has_heater && (
                  <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                    Heater
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800">
                {editingHome ? 'Edit Home' : 'Add New Home'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Address *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  className="input-field"
                  placeholder="123 Main Street, City"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Home Type *
                  </label>
                  <select
                    value={formData.home_type}
                    onChange={(e) => setFormData({ ...formData, home_type: e.target.value })}
                    className="input-field"
                  >
                    <option value="apartment">Apartment</option>
                    <option value="house">House</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Size (m²) *
                  </label>
                  <input
                    type="number"
                    value={formData.size_m2}
                    onChange={(e) => setFormData({ ...formData, size_m2: e.target.value })}
                    required
                    min="10"
                    step="0.1"
                    className="input-field"
                    placeholder="100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Number of Rooms *
                </label>
                <input
                  type="number"
                  value={formData.num_rooms}
                  onChange={(e) => setFormData({ ...formData, num_rooms: e.target.value })}
                  required
                  min="1"
                  className="input-field"
                  placeholder="3"
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.has_ac}
                    onChange={(e) => setFormData({ ...formData, has_ac: e.target.checked })}
                    className="w-5 h-5 text-primary-600 rounded"
                  />
                  <span className="text-slate-700">Has Air Conditioning</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.has_heater}
                    onChange={(e) => setFormData({ ...formData, has_heater: e.target.checked })}
                    className="w-5 h-5 text-primary-600 rounded"
                  />
                  <span className="text-slate-700">Has Heater</span>
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="submit" className="flex-1 btn-primary py-3">
                  {editingHome ? 'Update Home' : 'Add Home'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 btn-secondary py-3"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Homes
