'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';
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
    areas?: { id: string; name: string }[];
  };
  availableAreas?: { id: string; name: string }[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function VariationTypeDialog({ 
  initialData, 
  availableAreas = [],
  trigger, 
  open: controlledOpen, 
  onOpenChange: setControlledOpen 
}: VariationTypeDialogProps) {
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
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>(
    initialData?.areas?.map(a => a.id) || []
  );
  
  const router = useRouter();
  const isEditing = !!initialData;

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setCode(initialData?.code || '');
      setDescription(initialData?.description || '');
      setCategory((initialData?.category as any) || 'ADICIONAL');
      setVisibleToGestor(initialData?.visibleToGestor ?? true);
      setIsActive(initialData?.isActive ?? true);
      setSortOrder(initialData?.sortOrder?.toString() || '0');
      setSelectedAreaIds(initialData?.areas?.map(a => a.id) || []);
    }
  }, [open, initialData]);

  const handleAreaToggle = (areaId: string) => {
    setSelectedAreaIds(prev => 
      prev.includes(areaId)
        ? prev.filter(id => id !== areaId)
        : [...prev, areaId]
    );
  };

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
          sortOrder: parseInt(sortOrder) || 0,
          areaIds: selectedAreaIds
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
          sortOrder: parseInt(sortOrder) || 0,
          areaIds: selectedAreaIds.length > 0 ? selectedAreaIds : undefined
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
          setSelectedAreaIds([]);
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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

          {/* Areas Assignment */}
          {availableAreas.length > 0 && (
            <div className="space-y-3 p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200/50 dark:border-blue-800/30">
              <div className="space-y-1">
                <Label className="text-base font-medium">Áreas Asignadas</Label>
                <p className="text-sm text-muted-foreground">
                  Seleccione las áreas donde este tipo será visible. Si no selecciona ninguna, será global.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                {availableAreas.map(area => (
                  <div key={area.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`area-${area.id}`}
                      checked={selectedAreaIds.includes(area.id)}
                      onCheckedChange={() => handleAreaToggle(area.id)}
                    />
                    <label
                      htmlFor={`area-${area.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {area.name}
                    </label>
                  </div>
                ))}
              </div>
              {selectedAreaIds.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  ⚠️ Sin áreas seleccionadas, el tipo será visible en TODAS las áreas.
                </p>
              )}
            </div>
          )}

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
