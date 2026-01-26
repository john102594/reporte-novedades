'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, AlertCircle, CheckCircle2, Users, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getOperatorsByOT,
  checkOTExists,
  createAdditionalVariation,
  getVariationTypes,
  getCauses
} from '@/app/actions/additional-variations';

interface Operator {
  id: string;
  name: string | null;
  shifts: string[];
}

interface VariationType {
  id: string;
  name: string;
  code: string;
  description: string | null;
  category: string;
  visibleToGestor: boolean;
}

interface Cause {
  id: string;
  name: string;
}

interface VariationFormProps {
  onSuccess?: () => void;
}

export function VariationForm({ onSuccess }: VariationFormProps) {
  const [ot, setOt] = useState('');
  const [otSearched, setOtSearched] = useState(false);
  const [otValid, setOtValid] = useState(false);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [variationTypes, setVariationTypes] = useState<VariationType[]>([]);
  const [causes, setCauses] = useState<Cause[]>([]);
  const [selectedCauseId, setSelectedCauseId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);

  // Load variation types on mount (only ADICIONAL category, not visible to gestor)
  useEffect(() => {
    async function loadTypes() {
      try {
        const [types, causesList] = await Promise.all([
          getVariationTypes({ category: 'ADICIONAL' }),
          getCauses()
        ]);
        setVariationTypes(types);
        setCauses(causesList);
      } catch (error) {
        toast.error('Error al cargar tipos de variación');
      } finally {
        setIsLoadingTypes(false);
      }
    }
    loadTypes();
  }, []);

  const handleSearchOT = async () => {
    if (!ot.trim()) {
      toast.error('Ingrese un número de OT');
      return;
    }

    setIsSearching(true);
    setOtSearched(false);
    setOperators([]);
    setSelectedOperators([]);

    try {
      const exists = await checkOTExists(ot.trim());
      setOtValid(exists);
      setOtSearched(true);

      if (exists) {
        const ops = await getOperatorsByOT(ot.trim());
        setOperators(ops);
        toast.success(`OT encontrada con ${ops.length} operador(es)`);
      } else {
        toast.error('OT no encontrada en ningún reporte');
      }
    } catch (error) {
      toast.error('Error al buscar la OT');
    } finally {
      setIsSearching(false);
    }
  };

  const handleOperatorToggle = (operatorId: string) => {
    setSelectedOperators(prev => 
      prev.includes(operatorId)
        ? prev.filter(id => id !== operatorId)
        : [...prev, operatorId]
    );
  };

  const handleSubmit = async () => {
    if (!ot.trim() || !selectedTypeId || !quantity || selectedOperators.length === 0) {
      toast.error('Complete todos los campos requeridos');
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('La cantidad debe ser un número positivo');
      return;
    }

    setIsLoading(true);

    try {
      const result = await createAdditionalVariation({
        ot: ot.trim(),
        typeId: selectedTypeId,
        quantity: qty,
        description: description.trim() || undefined,
        causeId: selectedCauseId || undefined,
        operatorIds: selectedOperators
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Variación creada exitosamente. Se ha creado una tarea para seguimiento.');
        // Reset form
        setOt('');
        setOtSearched(false);
        setOtValid(false);
        setOperators([]);
        setSelectedOperators([]);
        setSelectedTypeId('');
        setQuantity('');
        setDescription('');
        setSelectedCauseId('');
        onSuccess?.();
      }
    } catch (error) {
      toast.error('Error al crear la variación');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedType = variationTypes.find(t => t.id === selectedTypeId);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nueva Variación Adicional
        </CardTitle>
        <CardDescription>
          Registre una variación posterior al reporte del turno. Se creará automáticamente una tarea de seguimiento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tipo de Variación */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Tipo de Variación *
          </Label>
          {isLoadingTypes ? (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Cargando tipos...</span>
            </div>
          ) : variationTypes.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              No hay tipos de variación configurados. Contacte al administrador.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {variationTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setSelectedTypeId(type.id)}
                  className={`
                    p-3 rounded-lg border-2 transition-all text-sm font-medium text-left
                    ${selectedTypeId === type.id 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }
                  `}
                >
                  <div className="font-bold">{type.name}</div>
                  {type.description && (
                    <div className="text-xs text-slate-400 mt-1">{type.description}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Búsqueda de OT */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Número de OT *
          </Label>
          <div className="flex gap-2">
            <Input
              value={ot}
              onChange={(e) => {
                setOt(e.target.value);
                setOtSearched(false);
                setOtValid(false);
                setOperators([]);
                setSelectedOperators([]);
              }}
              placeholder="Ingrese número de OT"
              className="flex-1"
            />
            <Button 
              onClick={handleSearchOT} 
              disabled={isSearching || !ot.trim()}
              variant="outline"
            >
              <Search className="w-4 h-4 mr-2" />
              {isSearching ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
          
          {otSearched && (
            <div className={`flex items-center gap-2 text-sm ${otValid ? 'text-green-600' : 'text-red-600'}`}>
              {otValid ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>OT válida - {operators.length} operador(es) encontrado(s)</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>OT no encontrada en ningún reporte</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Selección de Operadores */}
        {operators.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Operadores Responsables * (seleccione uno o más)
            </Label>
            <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
              {operators.map(op => (
                <label
                  key={op.id}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selectedOperators.includes(op.id)}
                    onCheckedChange={() => handleOperatorToggle(op.id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{op.name || 'Sin nombre'}</div>
                    <div className="text-xs text-slate-500">
                      Turnos: {op.shifts.join(', ')}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {selectedOperators.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedOperators.map(id => {
                  const op = operators.find(o => o.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="text-xs">
                      {op?.name || id}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Cantidad */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Package className="w-4 h-4" />
            Cantidad (Kg) *
          </Label>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-32"
          />
        </div>

        {/* Causa (Opcional) */}
        <div className="space-y-2">
           <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Causa Específica (Opcional)
          </Label>
          <Select value={selectedCauseId} onValueChange={setSelectedCauseId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione una causa si aplica..." />
            </SelectTrigger>
            <SelectContent>
              {causes.map(cause => (
                <SelectItem key={cause.id} value={cause.id}>{cause.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-slate-400">Si no selecciona una causa, se usará el nombre del tipo de variación.</p>
        </div>

        {/* Descripción */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Descripción / Justificación
          </Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describa la razón de esta variación..."
            className="min-h-[80px]"
          />
        </div>

        {/* Summary */}
        {selectedType && otValid && selectedOperators.length > 0 && quantity && (
          <div className="p-4 bg-slate-50 rounded-lg border text-sm space-y-1">
            <p className="font-bold text-slate-700">Resumen:</p>
            <p><span className="text-slate-500">Tipo:</span> {selectedType.name}</p>
            <p><span className="text-slate-500">OT:</span> {ot}</p>
            <p><span className="text-slate-500">Cantidad:</span> {quantity} kg</p>
            <p><span className="text-slate-500">Operadores:</span> {selectedOperators.length}</p>
          </div>
        )}

        {/* Botón de Guardar */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !selectedTypeId || !otValid || selectedOperators.length === 0 || !quantity}
            className="min-w-32"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Crear Variación'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
