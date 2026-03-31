import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mbfolmhpwjdldwvxsuri.supabase.co'
const supabaseKey = 'sb_publishable_l0rvsagxhLH4C1Q2SLYvRg_ZgWK4Ybx'

export const supabase = createClient(supabaseUrl, supabaseKey)

export const signUpWithEmail = (email, password) => {
	return supabase.auth.signUp({ email, password })
}

export const signInWithEmail = (email, password) => {
	return supabase.auth.signInWithPassword({ email, password })
}

export const signOutCurrentUser = () => {
	return supabase.auth.signOut()
}

export const getCurrentSession = () => {
	return supabase.auth.getSession()
}

export const deleteCurrentUserAccount = () => {
	return supabase.rpc('delete_current_user_account')
}