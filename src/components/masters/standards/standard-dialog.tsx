'use client';

import { useState } from 'react';
import { upsertStandard } from '@/app/actions/standards';
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
import { Settings } from 'lucide-react';

interface Machine {
  id: string;
  name: string;
}

interface Standard {
  id: string;
  machineId: string;
  t1_setup_min: number;
  t5_run_speed_mpm: number;
  t2_calibration_min: number | null;
  t3_toning_min: number | null;
  t4_approval_min: number | null;
}

export function StandardDialog({ machines, standardToEdit }: { machines: Machine[], standardToEdit?: Standard }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  async function clientAction(formData: FormData) {
    const data = {
      machineId: formData.get('machineId') as string,
      t1_setup_min: Number(formData.get('t1_setup_min')),
      t5_run_speed_mpm: Number(formData.get('t5_run_speed_mpm')),
      t2_calibration_min: Number(formData.get('t2_calibration_min')) || undefined,
      t3_toning_min: Number(formData.get('t3_toning_min')) || undefined,
      t4_approval_min: Number(formData.get('t4_approval_min')) || undefined,
    };

    const res = await upsertStandard(data);
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
        <Button variant={standardToEdit ? "ghost" : "default"} size={standardToEdit ? "icon" : "default"} className={standardToEdit ? "h-8 w-8 hover:bg-muted" : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all hover:scale-105"}>
          {standardToEdit ? <Settings className="h-4 w-4" /> : (
            <>
              <Settings className="w-4 h-4 mr-2" />
              Configure Standard
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white dark:bg-zinc-950 border border-border shadow-xl sm:max-w-[425px] z-50">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-purple-400 via-primary to-purple-600 dark:to-purple-400 bg-clip-text text-transparent">
            {standardToEdit ? 'Edit Process Standard' : 'Configure Machine Standard'}
          </DialogTitle>
        </DialogHeader>
        <form action={clientAction} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="machineId" className="text-muted-foreground">Target Machine</Label>
            <Select name="machineId" required defaultValue={standardToEdit?.machineId}>
              <SelectTrigger className="w-full bg-zinc-50 dark:bg-zinc-900 border border-input">
                <SelectValue placeholder="Select machine" />
              </SelectTrigger>
              <SelectContent>
                {machines.map((machine) => (
                  <SelectItem key={machine.id} value={machine.id}>
                    {machine.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="t1_setup_min" className="text-muted-foreground">T1 Setup (Min)</Label>
              <Input 
                id="t1_setup_min" 
                name="t1_setup_min" 
                type="number" 
                className="bg-zinc-50 dark:bg-zinc-900 border-border focus:border-primary/50"
                required 
                defaultValue={standardToEdit?.t1_setup_min}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t5_run_speed_mpm" className="text-muted-foreground">T5 Speed (m/min)</Label>
              <Input 
                id="t5_run_speed_mpm" 
                name="t5_run_speed_mpm" 
                type="number" 
                className="bg-zinc-50 dark:bg-zinc-900 border-border focus:border-primary/50"
                required 
                defaultValue={standardToEdit?.t5_run_speed_mpm}
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Printing Specifics (Optional)</Label>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                 <Label htmlFor="t2" className="text-xs text-muted-foreground">T2 Calib.</Label>
                 <Input 
                   id="t2" 
                   name="t2_calibration_min" 
                   type="number" 
                   className="h-8 bg-zinc-50 dark:bg-zinc-900 border-border"
                   defaultValue={standardToEdit?.t2_calibration_min ?? ''}
                 />
              </div>
              <div className="space-y-1">
                 <Label htmlFor="t3" className="text-xs text-muted-foreground">T3 Toning</Label>
                 <Input 
                   id="t3" 
                   name="t3_toning_min" 
                   type="number" 
                   className="h-8 bg-zinc-50 dark:bg-zinc-900 border-border" 
                   defaultValue={standardToEdit?.t3_toning_min ?? ''} 
                 />
              </div>
              <div className="space-y-1">
                 <Label htmlFor="t4" className="text-xs text-muted-foreground">T4 Aprv.</Label>
                 <Input 
                   id="t4" 
                   name="t4_approval_min" 
                   type="number" 
                   className="h-8 bg-zinc-50 dark:bg-zinc-900 border-border" 
                   defaultValue={standardToEdit?.t4_approval_min ?? ''} 
                 />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
          <div className="flex justify-end pt-4">
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              {standardToEdit ? 'Save Changes' : 'Save Standard'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
