'use client';

import { useState } from 'react';
import { createMachine, updateMachine } from '@/app/actions/machines';
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
import { Plus, Settings, X } from 'lucide-react';

interface Area {
  id: string;
  name: string;
}

interface Machine {
  id: string;
  name: string;
  areaId: string;
  operators?: { id: string }[];
}

interface Operator {
  id: string;
  name: string | null;
  managedAreas: { id: string }[];
}

export function MachineDialog({ areas, operators = [], machineToEdit }: { areas: Area[], operators?: Operator[], machineToEdit?: Machine }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState(machineToEdit?.areaId || '');
  
  // Local state for selected operators (for the UI list)
  const [assignedOperators, setAssignedOperators] = useState<{id: string, name?: string}[]>(
    machineToEdit?.operators?.map(op => ({ id: op.id, name: operators.find(o => o.id === op.id)?.name || 'Unknown' })) || []
  );

  // Sync state when dialog opens or machineToEdit changes
  // (We use a key on the dialog content or reset effects if needed, but for now initializing state is fine)

  function addOperator(operatorId: string) {
    const op = operators.find(o => o.id === operatorId);
    if (op && !assignedOperators.some(ById => ById.id === operatorId)) {
        setAssignedOperators([...assignedOperators, { id: op.id, name: op.name || 'Unknown' }]);
    }
  }

  function removeOperator(operatorId: string) {
    setAssignedOperators(assignedOperators.filter(op => op.id !== operatorId));
  }

  async function clientAction(formData: FormData) {
    // Append operators manually if needed, or rely on hidden inputs.
    // Since we are using hidden inputs for 'operatorIds', formData will contain them.
    const res = machineToEdit 
      ? await updateMachine(machineToEdit.id, formData)
      : await createMachine(formData);
    if (res?.error) {
      setError(res.error);
    } else {
      setOpen(false);
      setError('');
    }
  }

  // Filter available operators: belong to area AND not already assigned
  const availableOperators = operators.filter(op => 
    op.managedAreas.some(area => area.id === selectedAreaId) &&
    !assignedOperators.some(assigned => assigned.id === op.id)
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={machineToEdit ? "ghost" : "default"} size={machineToEdit ? "icon" : "default"} className={machineToEdit ? "h-8 w-8 hover:bg-muted" : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all hover:scale-105"}>
          {machineToEdit ? <Settings className="h-4 w-4" /> : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Add Machine
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white dark:bg-zinc-950 border border-border shadow-xl sm:max-w-[425px] z-50">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            {machineToEdit ? 'Edit Machine' : 'Add New Machine'}
          </DialogTitle>
        </DialogHeader>
        <form action={clientAction} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-muted-foreground">Machine Name</Label>
            <Input 
              id="name" 
              name="name" 
              placeholder="e.g., Extruder 01" 
              defaultValue={machineToEdit?.name}
              className="bg-zinc-50 dark:bg-zinc-900 border-border focus:border-primary/50"
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="areaId" className="text-muted-foreground">Assigned Area</Label>
            <Select 
              name="areaId" 
              required 
              defaultValue={machineToEdit?.areaId}
              onValueChange={(val) => setSelectedAreaId(val)}
            >
              <SelectTrigger className="w-full bg-zinc-50 dark:bg-zinc-900 border border-input">
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

          {selectedAreaId && (
            <div className="space-y-4 border-t pt-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground">Assigned Operators</Label>
                  <span className="text-xs text-muted-foreground">{assignedOperators.length} assigned</span>
              </div>
              
              {/* List of Assigned Operators (Chips) */}
              <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded bg-zinc-50 dark:bg-zinc-900">
                  {assignedOperators.length === 0 && (
                      <span className="text-sm text-muted-foreground w-full text-center py-2">No operators assigned.</span>
                  )}
                  {assignedOperators.map(op => (
                      <div key={op.id} className="flex items-center gap-1 bg-white dark:bg-zinc-800 border pl-2 pr-1 py-1 rounded-md shadow-sm text-sm">
                          <span>{op.name}</span>
                          <button 
                            type="button"
                            onClick={() => removeOperator(op.id)}
                            className="text-muted-foreground hover:text-red-500 p-0.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                              <X className="w-3 h-3" />
                          </button>
                          {/* Hidden Input for Form Submission */}
                          <input type="hidden" name="operatorIds" value={op.id} />
                      </div>
                  ))}
              </div>

              {/* Add Operator Selection */}
              <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">Add Operator</Label>
                  <Select onValueChange={(val) => addOperator(val)}>
                    <SelectTrigger className="w-full bg-zinc-50 dark:bg-zinc-900 border border-input">
                        <SelectValue placeholder="Select operator to add..." />
                    </SelectTrigger>
                    <SelectContent>
                        {availableOperators.length === 0 ? (
                            <SelectItem value="none" disabled>No more operators available in this area</SelectItem>
                        ) : (
                            availableOperators.map((op) => (
                                <SelectItem key={op.id} value={op.id}>
                                    {op.name}
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Select from valid operators for this area.</p>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
          <div className="flex justify-end pt-4">
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              {machineToEdit ? 'Save Changes' : 'Create Machine'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
