import { useState, useEffect } from 'react'
import { Home, Plus, Edit, Trash2, MapPin, Square, Bed, Tv, Zap, X, Check } from 'lucide-react'
import { supabase } from '../services/supabase'

const Homes = ({ user }) => {
  const [homes, setHomes] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingHome, setEditingHome] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Appliance Management State
  const [showApplianceModal, setShowApplianceModal] = useState(false)
  const [selectedHome, setSelectedHome] = useState(null)
  const [appliances, setAppliances] = useState([])
  const [newAppliance, setNewAppliance] = useState({
    appliance_type: 'fridge',
    quantity: 1,
    wattage: 150,
    avg_hours_per_day: 24
  })

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
      // DATABASE QUERY: SELECT from Homes table (Entity #2)
      // Uses: Foreign key constraint (fk_homes_user), user_id index (idx_homes_user)
      // RLS Policy: homes_select_own - ensures users only see their own homes
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

  // Appliance Functions
  const openApplianceModal = async (home) => {
    setSelectedHome(home)
    setShowApplianceModal(true)
    await loadAppliances(home.home_id)
  }

  const loadAppliances = async (homeId) => {
    try {
      // DATABASE QUERY: SELECT from Appliances table (Entity #5)
      // Uses: Foreign key (fk_appliances_home), index (idx_appliances_home)
      // CHECK Constraints: appliance_type, quantity > 0, avg_hours_per_day BETWEEN 0 AND 24, wattage > 0
      // RLS Policy: appliances_select_own
      const { data, error } = await supabase
        .from('Appliances')
        .select('*')
        .eq('home_id', homeId)
      
      if (error) throw error
      setAppliances(data || [])
    } catch (error) {
      console.error('Error loading appliances:', error)
    }
  }

  const handleAddAppliance = async (e) => {
    e.preventDefault()
    try {
      // DATABASE INSERT: Appliances table (Entity #5)
      // Enforces: CHECK constraints on quantity, wattage, avg_hours_per_day, appliance_type
      // RLS Policy: appliances_insert_own - validates user owns the home
      const { data, error } = await supabase
        .from('Appliances')
        .insert([{
          ...newAppliance,
          home_id: selectedHome.home_id,
          quantity: parseInt(newAppliance.quantity),
          wattage: parseInt(newAppliance.wattage),
          avg_hours_per_day: parseFloat(newAppliance.avg_hours_per_day)
        }])
        .select()

      if (error) {
        console.error('Error adding appliance:', error)
        alert(`Failed to add appliance: ${error.message}`)
        throw error
      }
      
      await loadAppliances(selectedHome.home_id)
      setNewAppliance({
        appliance_type: 'fridge',
        quantity: 1,
        wattage: 150,
        avg_hours_per_day: 24
      })
    } catch (error) {
      console.error('Error adding appliance:', error)
    }
  }

  const handleDeleteAppliance = async (applianceId) => {
    if (!window.confirm('Are you sure you want to remove this appliance?')) return
    try {
      // DATABASE DELETE: Appliances table (Entity #5)
      // RLS Policy: appliances_delete_own - ensures user owns the home
      const { error } = await supabase
        .from('Appliances')
        .delete()
        .eq('appliance_id', applianceId)

      if (error) throw error
      await loadAppliances(selectedHome.home_id)
    } catch (error) {
      console.error('Error deleting appliance:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const homeData = {
        user_id: user.id,
        address: formData.address,
        home_type: formData.home_type,
        size_m2: parseFloat(formData.size_m2),
        num_rooms: parseInt(formData.num_rooms),
        has_ac: formData.has_ac,
        has_heater: formData.has_heater,
      }

      if (editingHome) {
        // DATABASE UPDATE: Homes table (Entity #2)
        // RLS Policy: homes_update_own - user must own the home
        // Enforces: CHECK constraints on home_type, size_m2 > 0, num_rooms > 0
        const { error } = await supabase
          .from('Homes')
          .update(homeData)
          .eq('home_id', editingHome.home_id)
        if (error) throw error
      } else {
        // DATABASE INSERT: Homes table (Entity #2)
        // Foreign key: user_id references Users table with CASCADE delete
        // RLS Policy: homes_insert_own - validates user_id matches authenticated user
        const { error } = await supabase
          .from('Homes')
          .insert([homeData])
        if (error) throw error
      }

      setShowModal(false)
      setEditingHome(null)
      setFormData({
        address: '',
        home_type: 'apartment',
        size_m2: '',
        num_rooms: '',
        has_ac: false,
        has_heater: false,
      })
      loadHomes()
    } catch (error) {
      console.error('Error saving home:', error)
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

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this home?')) {
      try {
        // DATABASE DELETE: Homes table (Entity #2)
        // CASCADE DELETE: Also removes related Appliances, EnergyConsumption, Predictions, BillHistory
        // RLS Policy: homes_delete_own - user must own the home
        const { error } = await supabase
          .from('Homes')
          .delete()
          .eq('home_id', id)
        if (error) throw error
        loadHomes()
      } catch (error) {
        console.error('Error deleting home:', error)
      }
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
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">My Homes</h1>
          <p className="text-slate-500 text-sm">Manage your properties and appliances</p>
        </div>
        <button
          onClick={() => {
            setEditingHome(null)
            setFormData({
              address: '',
              home_type: 'apartment',
              size_m2: '',
              num_rooms: '',
              has_ac: false,
              has_heater: false,
            })
            setShowModal(true)
          }}
          className="mac-btn flex items-center space-x-2 transition-all duration-200 hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Add Home</span>
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {homes.length > 0 ? homes.map((home) => (
          <div key={home.home_id} className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-white/50 hover:shadow-md transition-all duration-300 group hover:bg-white/80">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-xl text-blue-600 transition-transform duration-200 group-hover:scale-105">
                <Home className="w-6 h-6" />
              </div>
              <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                <button
                  onClick={() => handleEdit(home)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(home.home_id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-bold text-slate-800 mb-2 truncate">{home.address}</h3>
            
            <div className="space-y-2 mb-6">
              <div className="flex items-center text-sm text-slate-600">
                <Square className="w-4 h-4 mr-2 text-slate-400" />
                <span>{home.size_m2} m² • {home.home_type}</span>
              </div>
              <div className="flex items-center text-sm text-slate-600">
                <Bed className="w-4 h-4 mr-2 text-slate-400" />
                <span>{home.num_rooms} Rooms</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                {home.has_ac && (
                  <span className="flex items-center text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs font-medium transition-all duration-200 hover:bg-blue-100">AC</span>
                )}
                {home.has_heater && (
                  <span className="flex items-center text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-xs font-medium transition-all duration-200 hover:bg-orange-100">Heater</span>
                )}
              </div>
            </div>

            <button
              onClick={() => openApplianceModal(home)}
              className="w-full py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 text-sm font-medium flex items-center justify-center space-x-2 hover:border-slate-300"
            >
              <Tv className="w-4 h-4" />
              <span>Manage Appliances</span>
            </button>
          </div>
        )) : (
          <div className="col-span-full bg-white/40 backdrop-blur-sm p-12 rounded-2xl border border-white/30 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-white/50 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <Home className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No Homes Yet</h3>
            <p className="text-slate-500 max-w-xs mb-4">
              Add your first home to start tracking energy consumption and making predictions.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mac-btn flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Home</span>
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Home Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/50">
            <div className="px-6 py-4 border-b border-slate-200/50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                {editingHome ? 'Edit Home' : 'Add New Home'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mac-input pl-10"
                    placeholder="123 Main St, City"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Type</label>
                  <select
                    value={formData.home_type}
                    onChange={(e) => setFormData({ ...formData, home_type: e.target.value })}
                    className="mac-input"
                  >
                    <option value="apartment">Apartment</option>
                    <option value="house">House</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Size (m²)</label>
                  <input
                    type="number"
                    required
                    value={formData.size_m2}
                    onChange={(e) => setFormData({ ...formData, size_m2: e.target.value })}
                    className="mac-input"
                    placeholder="120"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Rooms</label>
                <input
                  type="number"
                  required
                  value={formData.num_rooms}
                  onChange={(e) => setFormData({ ...formData, num_rooms: e.target.value })}
                  className="mac-input"
                  placeholder="3"
                />
              </div>

              <div className="flex space-x-6 pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.has_ac}
                    onChange={(e) => setFormData({ ...formData, has_ac: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Air Conditioning</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.has_heater}
                    onChange={(e) => setFormData({ ...formData, has_heater: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Heating</span>
                </label>
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 mac-btn"
                >
                  {editingHome ? 'Save Changes' : 'Add Home'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appliances Modal */}
      {showApplianceModal && selectedHome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/50 flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-slate-200/50 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Appliances</h2>
                <p className="text-xs text-slate-500">{selectedHome.address}</p>
              </div>
              <button onClick={() => setShowApplianceModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Add Appliance Form */}
              <form onSubmit={handleAddAppliance} className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/50 mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Add New Appliance</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="col-span-2 md:col-span-1">
                    <select
                      value={newAppliance.appliance_type}
                      onChange={(e) => setNewAppliance({ ...newAppliance, appliance_type: e.target.value })}
                      className="mac-input w-full"
                    >
                      <option value="fridge">Fridge</option>
                      <option value="TV">TV</option>
                      <option value="AC">AC</option>
                      <option value="heater">Heater</option>
                      <option value="washing_machine">Washer</option>
                      <option value="dishwasher">Dishwasher</option>
                    </select>
                  </div>
                  <input
                    type="number"
                    placeholder="Qty"
                    min="1"
                    value={newAppliance.quantity}
                    onChange={(e) => setNewAppliance({ ...newAppliance, quantity: e.target.value })}
                    className="mac-input"
                  />
                  <input
                    type="number"
                    placeholder="Watts"
                    min="0"
                    value={newAppliance.wattage}
                    onChange={(e) => setNewAppliance({ ...newAppliance, wattage: e.target.value })}
                    className="mac-input"
                  />
                  <input
                    type="number"
                    placeholder="Hrs/Day"
                    min="0"
                    max="24"
                    step="0.1"
                    value={newAppliance.avg_hours_per_day}
                    onChange={(e) => setNewAppliance({ ...newAppliance, avg_hours_per_day: e.target.value })}
                    className="mac-input"
                  />
                  <button type="submit" className="mac-btn flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {/* Appliances List */}
              <div className="space-y-2">
                {appliances.length > 0 ? (
                  appliances.map((app) => (
                    <div key={app.appliance_id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 capitalize">{app.appliance_type.replace('_', ' ')}</p>
                          <p className="text-xs text-slate-500">
                            {app.quantity}x • {app.wattage}W • {app.avg_hours_per_day}h/day
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAppliance(app.appliance_id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <p>No appliances added yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Homes
