import { createClient } from '@supabase/supabase-js'

// Replace these with actual Supabase project credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  }
})

// Auth helpers
export const authHelpers = {
  signUp: async (email, password, name, phone) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })
    
    if (authError) throw authError
    
    // Insert user data into Users table
    const { data, error } = await supabase
      .from('Users')
      .insert([{ 
        user_id: authData.user.id,
        name, 
        email, 
        password: 'hashed', // In production, hash on backend
        phone,
        role: 'user'
      }])
      .select()
    
    if (error) {
      console.error('Error inserting user:', error)
      throw error
    }
    return data
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    
    // Ensure user exists in Users table (fix for foreign key issue)
    try {
      const { data: existingUser } = await supabase
        .from('Users')
        .select('user_id')
        .eq('user_id', data.user.id)
        .single()
      
      if (!existingUser) {
        // Create user in Users table if it doesn't exist
        const { error: insertError } = await supabase
          .from('Users')
          .insert([{
            user_id: data.user.id,
            name: data.user.email.split('@')[0],
            email: data.user.email,
            password: 'hashed',
            phone: null,
            role: 'user'
          }])
        
        if (insertError) {
          console.error('Error creating user in Users table:', insertError)
        } else {
          console.log('User record created in Users table')
        }
      }
    } catch (err) {
      console.error('Error checking/creating user:', err)
    }
    
    return data
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  getCurrentUser: async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      
      if (!session) return null
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      
      return user
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  },

  getSession: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }
}
