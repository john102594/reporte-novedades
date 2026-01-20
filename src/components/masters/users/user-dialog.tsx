'use client';

import { useState } from 'react';
import { createUser, updateUser } from '@/app/actions/users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Settings } from 'lucide-react';

interface Area {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  username: string | null;
  managedAreas?: Area[];
}

export function UserDialog({ userToEdit, areas = [] }: { userToEdit?: User, areas?: Area[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  
  // Managing local state for multi-select areas
  // Initial state based on userToEdit.managedAreas
  const initialSelectedAreas = userToEdit?.managedAreas?.map(a => a.id) || [];
  // Since we are using standard form submission, we can use hidden inputs or just handle it if we were doing fetch.
  // But standard form action with checkboxes works if we name them 'areaIds'.
  // Let's rely on native FormData handling for checkboxes with same name.

  async function clientAction(formData: FormData) {
    const res = userToEdit 
      ? await updateUser(userToEdit.id, formData)
      : await createUser(formData);
    if (res?.error) {
      setError(res.error);
    } else {
      setOpen(false);
      setError('');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={userToEdit ? "ghost" : "default"} size={userToEdit ? "icon" : "default"} className={userToEdit ? "h-8 w-8 hover:bg-muted" : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all hover:scale-105"}>
          {userToEdit ? <Settings className="h-4 w-4" /> : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white dark:bg-zinc-950 border-border shadow-xl sm:max-w-[500px] z-50 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            {userToEdit ? 'Edit User' : 'Create User'}
          </DialogTitle>
        </DialogHeader>
        <form action={clientAction} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-muted-foreground">Full Name</Label>
              <Input 
                id="name" 
                name="name" 
                placeholder="John Doe" 
                defaultValue={userToEdit?.name || ''}
                className="bg-zinc-50 dark:bg-zinc-900 border-border focus:border-primary/50"
                required 
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="username" className="text-muted-foreground">Username (No spaces)</Label>
              <Input 
                id="username" 
                name="username" 
                placeholder="johndoe" 
                defaultValue={userToEdit?.username || ''}
                className="bg-zinc-50 dark:bg-zinc-900 border-border focus:border-primary/50"
                required 
                pattern="^\S+$"
                title="Username must not contain spaces"
              />
            </div>
          </div>
          
          <div className="space-y-2">
             <Label htmlFor="password" className="text-muted-foreground">
                {userToEdit ? 'New Password (Optional)' : 'Password'}
             </Label>
             <Input 
               id="password" 
               name="password" 
               type="password"
               placeholder={userToEdit ? "Leave blank to keep current" : "******"}
               required={!userToEdit}
               className="bg-zinc-50 dark:bg-zinc-900 border-border focus:border-primary/50"
             />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-muted-foreground">Email <span className="text-xs text-muted-foreground/70">(Optional)</span></Label>
            <Input 
              id="email" 
              name="email" 
              type="email"
              placeholder="john@company.com" 
              defaultValue={userToEdit?.email || ''}
              className="bg-zinc-50 dark:bg-zinc-900 border-border focus:border-primary/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role" className="text-muted-foreground">Role</Label>
            <Select name="role" required defaultValue={userToEdit?.role}>
              <SelectTrigger className="w-full bg-zinc-50 dark:bg-zinc-900 border border-input">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANAGER">Admin (Jefe - Full Access)</SelectItem>
                <SelectItem value="GESTOR">Gestor (Manager - View Only)</SelectItem>
                <SelectItem value="COORDINATOR">Coordinator</SelectItem>
                <SelectItem value="OPERATOR">Operator</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2 border-t pt-4">
              <Label className="text-muted-foreground mb-2 block">Assigned Areas</Label>
              <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto p-2 border rounded bg-zinc-50 dark:bg-zinc-900">
                  {areas.map(area => (
                      <div key={area.id} className="flex items-center space-x-2">
                          <input 
                              type="checkbox" 
                              name="areaIds" 
                              value={area.id} 
                              id={`area-${area.id}`}
                              defaultChecked={initialSelectedAreas.includes(area.id)}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <label htmlFor={`area-${area.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              {area.name}
                          </label>
                      </div>
                  ))}
              </div>
              <p className="text-xs text-muted-foreground">Select areas visible to this user.</p>
          </div>

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
          <div className="flex justify-end pt-4">
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              {userToEdit ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
