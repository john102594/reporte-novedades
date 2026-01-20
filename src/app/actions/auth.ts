'use server';

import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { error: 'Username and password are required' };
  }

  try {
    const user = await prisma.user.findFirst({
      where: { 
        username: username.trim() 
      }
    });

    // NOTE: In a real app, use bcrypt.compare(password, user.password)
    // For this prototype, we are doing direct comparison as requested/implied by previous steps
    if (!user || user.password !== password) {
      return { error: 'Invalid credentials' };
    }

    // Create session (simple cookie for now)
    const sessionData = {
      userId: user.id,
      role: user.role,
      name: user.name
    };
    
    // Set cookie
    // In Next.js server actions, cookies() is read-only in some contexts depending on version, 
    // but usually writable in actions.
    const cookieStore = await cookies();
    cookieStore.set('session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    return { success: true };
  } catch (error) {
    console.error('Login error:', error);
    return { error: 'An error occurred during login' };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  redirect('/login');
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');
  if (!session) return null;
  try {
    return JSON.parse(session.value);
  } catch (e) {
    return null;
  }
}
