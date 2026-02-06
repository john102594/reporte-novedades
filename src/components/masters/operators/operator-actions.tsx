'use client';

import { useState } from 'react';
import { deleteOperator } from '@/app/actions/operators';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { OperatorDialog } from './operator-dialog';
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
} from '@/components/ui/alert-dialog';

interface Operator {
    id: string;
    name: string;
    status: string;
    areaId: string;
}

interface ActionProps {
  operator: Operator;
  areas: { id: string; name: string }[];
}

export function OperatorActions({ operator, areas }: ActionProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    await deleteOperator(operator.id);
    setIsDeleting(false);
  }

  return (
    <div className="flex justify-end gap-2">
      <OperatorDialog operatorToEdit={operator} areas={areas} />
      
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
              This action cannot be undone. This will permanently delete the operator "{operator.name}".
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
