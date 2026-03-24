'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  try {
    const supabase = await createClient();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return { error: error.message };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('force_password_change')
        .eq('id', user.id)
        .single();
      
      if (profile?.force_password_change) {
        return { success: true, forcePasswordChange: true };
      }
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err) {
    console.error('Login action error:', err);
    return { error: 'An unexpected internal error occurred' };
  }
}
export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
