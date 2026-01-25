'use client';

import { useState } from 'react';
import { createProgram, updateProgram } from '@/app/actions/programs';
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

interface Program {
  id: string;
  name: string;
  areaId: string;
}

export function ProgramDialog({ areas, programToEdit }: { areas: Area[], programToEdit?: Program }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  async function clientAction(formData: FormData) {
    const res = programToEdit
      ? await updateProgram(programToEdit.id, formData) // You need to export this from actions
      : await createProgram(formData);
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
        <Button variant={programToEdit ? "ghost" : "default"} size={programToEdit ? "icon" : "default"} className={programToEdit ? "h-8 w-8 hover:bg-muted" : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all hover:scale-105"}>
          {programToEdit ? <Settings className="h-4 w-4" /> : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Add Program
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white dark:bg-zinc-950 !opacity-100 shadow-2xl border-border sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-purple-400 via-primary to-purple-600 dark:to-purple-400 bg-clip-text text-transparent">
            {programToEdit ? 'Edit Failure Program' : 'Define Failure Program'}
          </DialogTitle>
        </DialogHeader>
        <form action={clientAction} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-muted-foreground">Program Name</Label>
            <Input 
              id="name" 
              name="name" 
              placeholder="e.g., Ink Manufacturing, Preventive Maint." 
              className="bg-zinc-50 dark:bg-zinc-900 border-border focus:border-primary/50"
              required 
              defaultValue={programToEdit?.name}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="areaId" className="text-muted-foreground">Applicable Area</Label>
            <Select name="areaId" required defaultValue={programToEdit?.areaId}>
              <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900 border-border">
                <SelectValue placeholder="Select area" />
              </SelectTrigger>
              <SelectContent>
                {areas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
          <div className="flex justify-end pt-4">
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              {programToEdit ? 'Save Changes' : 'Create Program'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
