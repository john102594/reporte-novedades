'use client';

import { useState } from 'react';
import { createOperator, updateOperator } from '@/app/actions/operators';
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

interface Operator {
  id: string;
  name: string;
  status: string;
  areaId: string;
}

export function OperatorDialog({ operatorToEdit, areas = [] }: { operatorToEdit?: Operator, areas?: Area[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  async function clientAction(formData: FormData) {
    const res = operatorToEdit 
      ? await updateOperator(operatorToEdit.id, formData)
      : await createOperator(formData);
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
        <Button variant={operatorToEdit ? "ghost" : "default"} size={operatorToEdit ? "icon" : "default"} className={operatorToEdit ? "h-8 w-8 hover:bg-muted" : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all hover:scale-105"}>
          {operatorToEdit ? <Settings className="h-4 w-4" /> : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Add Operator
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white dark:bg-zinc-950 border-border shadow-xl sm:max-w-[500px] z-50">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-purple-400 via-primary to-purple-600 dark:to-purple-400 bg-clip-text text-transparent">
            {operatorToEdit ? 'Edit Operator' : 'Create Operator'}
          </DialogTitle>
        </DialogHeader>
        <form action={clientAction} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-muted-foreground">Full Name</Label>
            <Input 
              id="name" 
              name="name" 
              placeholder="Operator Name" 
              defaultValue={operatorToEdit?.name || ''}
              className="bg-zinc-50 dark:bg-zinc-900 border-border focus:border-primary/50"
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="areaId" className="text-muted-foreground">Area</Label>
            <Select name="areaId" required defaultValue={operatorToEdit?.areaId}>
              <SelectTrigger className="w-full bg-zinc-50 dark:bg-zinc-900 border border-input">
                <SelectValue placeholder="Select area" />
              </SelectTrigger>
              <SelectContent>
                {areas.map(area => (
                  <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {operatorToEdit && (
            <div className="space-y-2">
                <Label htmlFor="status" className="text-muted-foreground">Status</Label>
                <Select name="status" required defaultValue={operatorToEdit?.status}>
                <SelectTrigger className="w-full bg-zinc-50 dark:bg-zinc-900 border border-input">
                    <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
                </Select>
            </div>
          )}

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
          <div className="flex justify-end pt-4">
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              {operatorToEdit ? 'Save Changes' : 'Create Operator'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
