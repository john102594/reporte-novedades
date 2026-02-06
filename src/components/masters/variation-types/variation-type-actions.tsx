'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Pencil, Trash2, Power } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { updateVariationType, deleteVariationType } from '@/app/actions/additional-variations';
import { VariationTypeDialog } from './variation-type-dialog';

interface VariationTypeActionsProps {
  variationType: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    category: string;
    visibleToGestor: boolean;
    sortOrder: number;
    isActive: boolean;
    areas?: { id: string; name: string }[];
  };
  availableAreas?: { id: string; name: string }[];
}

export function VariationTypeActions({ variationType, availableAreas = [] }: VariationTypeActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const router = useRouter();

  const handleToggleActive = async () => {
    setIsToggling(true);
    try {
      const result = await updateVariationType(variationType.id, {
        isActive: !variationType.isActive
      });
      
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(variationType.isActive ? 'Tipo desactivado' : 'Tipo activado');
        router.refresh();
      }
    } catch (error) {
      toast.error('Error al actualizar');
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteVariationType(variationType.id);
      
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Tipo eliminado');
        router.refresh();
      }
    } catch (error) {
      toast.error('Error al eliminar');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <VariationTypeDialog 
        initialData={variationType}
        availableAreas={availableAreas}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onSelect={() => setShowEditDialog(true)}
          >
            <Pencil className="w-4 h-4 mr-2" />
            Editar
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={handleToggleActive}
            disabled={isToggling}
          >
            <Power className="w-4 h-4 mr-2" />
            {variationType.isActive ? 'Desactivar' : 'Activar'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tipo de variación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el tipo "{variationType.name}" ({variationType.code}).
              Solo es posible si no hay variaciones usando este tipo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
