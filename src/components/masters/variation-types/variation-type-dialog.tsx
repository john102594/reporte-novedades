'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createVariationType, updateVariationType } from '@/app/actions/additional-variations';

interface VariationTypeDialogProps {
  initialData?: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    category: string;
    visibleToGestor: boolean;
    sortOrder: number;
    isActive: boolean;
  };
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function VariationTypeDialog({ initialData, trigger, open: controlledOpen, onOpenChange: setControlledOpen }: VariationTypeDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen : setInternalOpen;

  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState(initialData?.name || '');
  const [code, setCode] = useState(initialData?.code || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState<'OPERATIVA' | 'ADICIONAL'>(
    (initialData?.category as any) || 'ADICIONAL'
  );
  const [visibleToGestor, setVisibleToGestor] = useState(initialData?.visibleToGestor ?? true);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(initialData?.sortOrder?.toString() || '0');
  
  const router = useRouter();
  const isEditing = !!initialData;

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      toast.error('Nombre y código son requeridos');
      return;
    }

    setIsLoading(true);

    try {
      if (isEditing && initialData) {
        // Update
        const result = await updateVariationType(initialData.id, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim() || '',
          category,
          visibleToGestor,
          isActive,
          sortOrder: parseInt(sortOrder) || 0
        });

        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success('Tipo de variación actualizado');
          setOpen?.(false);
          router.refresh();
        }
      } else {
        // Create
        const result = await createVariationType({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim() || undefined,
          category,
          visibleToGestor,
          sortOrder: parseInt(sortOrder) || 0
        });

        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success('Tipo de variación creado');
          setOpen?.(false);
          // Reset form
          setName('');
          setCode('');
          setDescription('');
          setCategory('ADICIONAL');
          setVisibleToGestor(true);
          setSortOrder('0');
          router.refresh();
        }
      }
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      {!trigger && !isControlled && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Tipo
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar' : 'Nuevo'} Tipo de Variación</DialogTitle>
          <DialogDescription>
            Configure los detalles del tipo de variación
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Desperdicio Adicional"
              />
            </div>
            <div className="space-y-2">
              <Label>Código *</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ej: DESPERDICIO_ADICIONAL"
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción opcional..."
              className="min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Categoría *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPERATIVA">
                    OPERATIVA (reporte de turno)
                  </SelectItem>
                  <SelectItem value="ADICIONAL">
                    ADICIONAL (post-reporte)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Orden</Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                min="0"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 p-5 bg-muted/50 rounded-xl border border-muted">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Visible para Gestor</Label>
                <p className="text-sm text-muted-foreground">
                  Si está activo, el gestor podrá seleccionar este tipo
                </p>
              </div>
              <Switch
                checked={visibleToGestor}
                onCheckedChange={setVisibleToGestor}
              />
            </div>
            
            {isEditing && (
              <div className="flex items-center justify-between border-t border-muted-foreground/10 pt-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Estado Activo</Label>
                  <p className="text-sm text-muted-foreground">
                    Desactivar para ocultar de todos los selectores
                  </p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen?.(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? 'Guardar Cambios' : 'Crear Tipo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
