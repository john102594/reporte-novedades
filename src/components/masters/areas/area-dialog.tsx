'use client';

import { useState } from 'react';
import { createArea, updateArea } from '@/app/actions/areas';
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
import { Plus, Settings } from 'lucide-react';

export function AreaDialog({ areaToEdit }: { areaToEdit?: { id: string, name: string } }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  async function clientAction(formData: FormData) {
    const res = areaToEdit 
      ? await updateArea(areaToEdit.id, formData)
      : await createArea(formData);
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
        <Button variant={areaToEdit ? "ghost" : "default"} size={areaToEdit ? "icon" : "default"} className={areaToEdit ? "h-8 w-8 hover:bg-muted" : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all hover:scale-105"}>
          {areaToEdit ? <Settings className="h-4 w-4" /> : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Add Area
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white dark:bg-zinc-950 border border-border shadow-xl sm:max-w-[425px] z-50">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-purple-400 via-primary to-purple-600 dark:to-purple-400 bg-clip-text text-transparent">
            {areaToEdit ? 'Edit Area' : 'Add New Area'}
          </DialogTitle>
        </DialogHeader>
        <form action={clientAction} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Area Name</Label>
            <Input 
              id="name" 
              name="name" 
              placeholder="e.g., Extrusion, Printing"
              defaultValue={areaToEdit?.name}
              className="bg-zinc-50 dark:bg-zinc-900 border-border focus:border-primary/50" 
              required 
            />
          </div>
          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
          <div className="flex justify-end pt-4">
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              {areaToEdit ? 'Save Changes' : 'Create Area'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
