'use client';

import { useState } from 'react';
import { deleteMachine } from '@/app/actions/machines';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { MachineDialog } from './machine-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../ui/alert-dialog';

interface ActionProps {
  machine: {
    id: string;
    name: string;
    areaId: string;
    operators?: { id: string }[];
  };
  areas: { id: string; name: string }[];
  operators?: { id: string; name: string | null; managedAreas: { id: string }[] }[];
}

export function MachineActions({ machine, areas, operators }: ActionProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    await deleteMachine(machine.id);
    setIsDeleting(false);
  }

  return (
    <div className="flex justify-end gap-2">
      <MachineDialog areas={areas} machineToEdit={machine} operators={operators} />
      
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the machine "{machine.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
