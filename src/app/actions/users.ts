'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string;
  const username = formData.get('username') as string;
  const rawEmail = formData.get('email') as string;
  const email = rawEmail === '' ? null : rawEmail;
  const role = formData.get('role') as string;
  const password = formData.get('password') as string;
  const areaIds = formData.getAll('areaIds') as string[];
  
  if (!name || !role || !username || !password) return { error: 'Missing required fields' };

  try {
    await prisma.user.create({
      data: {
        name,
        username,
        email,
        role,
        password, // In a real app, hash this!
        managedAreas: {
            connect: areaIds.map(id => ({ id }))
        }
      },
    });
    revalidatePath('/masters/users');
    return { success: true };
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === 'P2002') return { error: 'Username or Email already exists' };
    return { error: `Failed to create user: ${error.message}` };
  }
}

export async function deleteUser(id: string) {
  try {
    await prisma.user.delete({ where: { id } });
    revalidatePath('/masters/users');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to delete user' };
  }
}

export async function updateUser(id: string, formData: FormData) {
  const name = formData.get('name') as string;
  const username = formData.get('username') as string;
  const rawEmail = formData.get('email') as string;
  const email = rawEmail === '' ? null : rawEmail;
  const role = formData.get('role') as string;
  const password = formData.get('password') as string;
  const areaIds = formData.getAll('areaIds') as string[];
  
  if (!name || !role || !username) return { error: 'Name, Username and Role are required' };

  const data: any = {
      name,
      username,
      email,
      role,
      managedAreas: {
          set: areaIds.map(id => ({ id })) // Replace existing
      }
  };

  if (password && password.trim() !== '') {
      data.password = password;
  }

  try {
    await prisma.user.update({
      where: { id },
      data,
    });
    revalidatePath('/masters/users');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating user:', error);
    if (error.code === 'P2002') return { error: 'Username or Email already exists' };
    return { error: `Failed to update user: ${error.message}` };
  }
}
