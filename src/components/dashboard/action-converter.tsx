'use client';

import { useState } from 'react';
import { createActionPlan } from '@/app/actions/plans';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, UserCheck } from 'lucide-react';

interface Variation {
  id: string;
  event: string;
  rootCause: string;
  failureType: string;
  failedProgram: string;
}

interface User {
  id: string;
  name: string;
  role: string;
}

export function ActionConverter({ variation, users }: { variation: Variation, users: User[] }) {
  const [open, setOpen] = useState(false);
  
  // Auto-Assign Logic
  const suggestedRole = variation.failureType === 'SYSTEMIC' ? 'MANAGER' : 'COORDINATOR';
  const suggestedUser = users.find(u => u.role === suggestedRole) || users[0]; // Fallback
  
  const [responsibleId, setResponsibleId] = useState(suggestedUser?.id);

  async function clientAction(formData: FormData) {
    await createActionPlan(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary hover:bg-primary/90">
             Convert to Action <ArrowRight className="w-3 h-3 ml-2" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" /> Define Action Plan
          </DialogTitle>
        </DialogHeader>
        
        <div className="bg-accent/10 p-4 rounded-lg text-sm space-y-2 mb-4">
            <div className="flex justify-between">
                <span className="text-muted-foreground">Problem:</span>
                <span className="text-white font-medium">{variation.event}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-muted-foreground">Cause:</span>
                <span className="text-white font-medium">{variation.rootCause}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Type:</span>
                <Badge variant={variation.failureType === 'SYSTEMIC' ? 'destructive' : 'secondary'}>
                    {variation.failureType}
                </Badge>
            </div>
        </div>

        <form action={clientAction} className="space-y-4">
          <input type="hidden" name="variationId" value={variation.id} />
          
          <div className="space-y-2">
            <Label>Action Description</Label>
            <Textarea 
                name="description" 
                defaultValue={`Address root cause: ${variation.rootCause}`} 
                className="bg-accent/20" 
                required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Responsible</Label>
                <Select name="responsibleId" value={responsibleId} onValueChange={setResponsibleId}>
                <SelectTrigger className="bg-accent/20">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                    ))}
                </SelectContent>
                </Select>
                <p className="text-xs text-primary/80">
                    Auto-suggested: {suggestedRole}
                </p>
            </div>
            <div className="space-y-2">
                <Label>Deadline</Label>
                <Input name="deadline" type="date" className="bg-accent/20" required />
            </div>
          </div>

          <Button type="submit" className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500">
            Confirm & Assign
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
