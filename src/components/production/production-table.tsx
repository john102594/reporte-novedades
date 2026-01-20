'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save, XCircle } from 'lucide-react';
import { saveShiftReport, closeShift, getShiftReport } from '@/app/actions/production';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

// Types
interface Machine {
  id: string;
  name: string;
  operators?: { id: string; name: string | null }[];
}

interface Operator {
  id: string;
  name: string | null;
}

interface Cause {
  id: string;
  name: string;
}

interface Variation {
  id?: string; // local or db id
  stage: string;
  causeId: string;
  analysis: string;
}

interface Detail {
  id?: string;
  ot: string;
  efficiency: number | string; // string for input handling
  mtProg: number | string;
  mtProd: number | string;
  kgProd: number | string;
  kgDesp: number | string;
  variations: Variation[];
}

interface ReportItem {
  machineId: string;
  operatorId: string;
  details: Detail[];
}

interface ProductionTableProps {
  areaId: string;
  date: string;
  shift: string;
  machines: Machine[];
  operators: Operator[];
  causes: Cause[];
  initialReport?: any; // The DB report object
  readOnly?: boolean;
  ownerName?: string;
}

export function ProductionTable({ 
  areaId, 
  date, 
  shift, 
  machines, 
  operators, 
  causes,
  initialReport,
  readOnly,
  ownerName
}: ProductionTableProps) {
  const [items, setItems] = useState<ReportItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [reportId, setReportId] = useState<string | null>(initialReport?.id || null);

  // Initialize state from machines and initialReport
  useEffect(() => {
    if (initialReport) {
        // Map DB structure to State structure
        // We need to ensure EVERY machine in the area is present, either with data or empty
        const mappedItems = machines.map(machine => {
            const existingItem = initialReport.items.find((i: any) => i.machineId === machine.id);
            if (existingItem) {
                return {
                    machineId: machine.id,
                    operatorId: existingItem.status === 'UNPROGRAMMED' ? 'UNPROGRAMMED' : (existingItem.operatorId || ''),
                    details: existingItem.details.map((d: any) => ({
                        id: d.id,
                        ot: d.ot,
                        efficiency: d.efficiency || '',
                        mtProg: d.mtProg || '',
                        mtProd: d.mtProd || '',
                        kgProd: d.kgProd || '',
                        kgDesp: d.kgDesp || '',
                        variations: d.variations.map((v: any) => ({
                            id: v.id,
                            stage: v.stage,
                            causeId: v.programId || v.causeId,
                            analysis: v.analysis
                        }))
                    })).map((d: any) => ({
                        ...d,
                        variations: d.variations.length > 0 ? d.variations : [createEmptyVariation()]
                    }))
                };
            } else {
                return {
                    machineId: machine.id,
                    operatorId: '',
                    details: [createEmptyDetail()]
                };
            }
        });
        setItems(mappedItems);
    } else {
        // New blank report
        setItems(machines.map(m => ({
            machineId: m.id,
            operatorId: '',
            details: [createEmptyDetail()]
        })));
    }
  }, [machines, initialReport]);

  useEffect(() => {
      // DEBUG: Toast the counts
      toast.info(`Debug: Received ${machines.length} machines and ${initialReport ? 'Found Report' : 'No Report'}`);
      if (initialReport) {
        toast.info(`Report items: ${initialReport.items?.length || 0}`);
      }
  }, [machines, initialReport]);

  const createEmptyDetail = (): Detail => ({
    ot: '',
    efficiency: '',
    mtProg: '',
    mtProd: '',
    kgProd: '',
    kgDesp: '',
    variations: [createEmptyVariation()]
  });

  const createEmptyVariation = (): Variation => ({
    stage: '',
    causeId: '',
    analysis: ''
  });

  // --- Handlers ---

  const handleOperatorChange = (machineId: string, operatorId: string) => {
    setItems(prev => prev.map(item => 
      item.machineId === machineId ? { ...item, operatorId } : item
    ));
  };

  const handleDetailChange = (machineId: string, detailIndex: number, field: keyof Detail, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.machineId !== machineId) return item;
      const newDetails = [...item.details];
      newDetails[detailIndex] = { ...newDetails[detailIndex], [field]: value };
      return { ...item, details: newDetails };
    }));
  };

  const handleVariationChange = (machineId: string, detailIndex: number, variationIndex: number, field: keyof Variation, value: any) => {
    setItems(prev => prev.map(item => {
        if (item.machineId !== machineId) return item;
        const newDetails = [...item.details];
        const newVariations = [...newDetails[detailIndex].variations];
        newVariations[variationIndex] = { ...newVariations[variationIndex], [field]: value };
        newDetails[detailIndex] = { ...newDetails[detailIndex], variations: newVariations };
        return { ...item, details: newDetails };
    }));
  };

  const addDetail = (machineId: string) => {
    setItems(prev => prev.map(item => 
      item.machineId === machineId ? { ...item, details: [...item.details, createEmptyDetail()] } : item
    ));
  };

  const removeDetail = (machineId: string, detailIndex: number) => {
    setItems(prev => prev.map(item => {
        if (item.machineId !== machineId) return item;
        const newDetails = item.details.filter((_, idx) => idx !== detailIndex);
        if (newDetails.length === 0) newDetails.push(createEmptyDetail()); // Ensure at least one
        return { ...item, details: newDetails };
    }));
  };

  const addVariation = (machineId: string, detailIndex: number) => {
    setItems(prev => prev.map(item => {
        if (item.machineId !== machineId) return item;
        const newDetails = [...item.details];
        newDetails[detailIndex] = {
            ...newDetails[detailIndex],
            variations: [...newDetails[detailIndex].variations, createEmptyVariation()]
        };
        return { ...item, details: newDetails };
    }));
  };

  const removeVariation = (machineId: string, detailIndex: number, variationIndex: number) => {
    setItems(prev => prev.map(item => {
        if (item.machineId !== machineId) return item;
        const newDetails = [...item.details];
        const newVariations = newDetails[detailIndex].variations.filter((_, idx) => idx !== variationIndex);
        
        if (newVariations.length === 0) newVariations.push(createEmptyVariation());
        
        newDetails[detailIndex] = {
            ...newDetails[detailIndex],
            variations: newVariations
        };
        return { ...item, details: newDetails };
    }));
  };

  // --- Persistence ---

  const handleSave = async () => {
    if (readOnly) return;
    setIsSaving(true);
    const dataToSave = {
        areaId,
        date,
        shift,
        status: 'OPEN',
        items: items
    };
    
    const res = await saveShiftReport(dataToSave);
    setIsSaving(false);
    
    if (res.error) {
        toast.error('Failed to save draft');
    } else {
        toast.success('Draft saved');
        if (res.report && res.report.id) setReportId(res.report.id);
    }
  };

  const handleCloseShift = async () => {
    if (readOnly) return;
    if (!confirm('Are you sure you want to close the shift? This will finalize the report.')) return;
    
    // Save first
    await handleSave();
    
    if (reportId) {
        const res = await closeShift(reportId);
        if (res.success) {
            toast.success('Shift closed successfully');
            // Reset local state or redirect?
            // "limpiara el reporte para un nuevo turno"
            setItems(machines.map(m => ({
                machineId: m.id,
                operatorId: '',
                details: [createEmptyDetail()]
            })));
            setReportId(null);
        }
    }
  };

  // Auto-save effect (debounce?)
  // For now, let's rely on manual Save or Close, maybe auto-save every 30s.

  // Calculations
  const calculatePerecentDesp = (kgProd: any, kgDesp: any) => {
    const prod = parseFloat(kgProd);
    const desp = parseFloat(kgDesp);
    if (!prod || isNaN(prod) || !desp || isNaN(desp)) return '0%';
    return ((desp / prod) * 100).toFixed(1) + '%';
  };

  return (
    <div className="space-y-4">
      {readOnly && (
        <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 p-4 rounded-md flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            <div>
                <strong>Read Only Mode</strong>
                <p className="text-sm">This report belongs to manager <strong>{ownerName}</strong>. You can only view it.</p>
            </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button onClick={handleSave} disabled={isSaving || readOnly} variant="outline" className="gap-2">
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Draft'}
        </Button>
        <Button onClick={handleCloseShift} disabled={readOnly} variant="destructive" className="gap-2">
            <XCircle className="w-4 h-4" />
            Close Shift
        </Button>
      </div>

      <div className="border rounded-lg overflow-x-auto bg-card">
        <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                <tr>
                    <th className="p-2 border w-[120px]">Machine</th>
                    <th className="p-2 border w-[160px]">Operator</th>
                    <th className="p-2 border w-[140px]">OT</th>
                    <th className="p-2 border w-[80px]">Efficiency</th>
                    <th className="p-2 border w-[120px]">MT PROG</th>
                    <th className="p-2 border w-[120px]">MT PROD</th>
                    <th className="p-2 border w-[80px]">KG PROD</th>
                    <th className="p-2 border w-[80px]">KG DESP</th>
                    <th className="p-2 border w-[70px]">% Desp</th>
                    <th className="p-2 border w-[120px]">Variations</th>
                    <th className="p-2 border w-[160px]">Cause</th>
                    <th className="p-2 border min-w-[250px]">Analysis</th>
                </tr>
            </thead>
            <tbody>
                {items.map((item) => {
                    const machine = machines.find(m => m.id === item.machineId);
                    const machineOperators = machine?.operators && machine.operators.length > 0 
                        ? machine.operators 
                        : operators;

                    return (
                        <MachineRow 
                            key={item.machineId} 
                            item={item} 
                            machineName={machine?.name || 'Unknown'} 
                            operators={machineOperators}
                            causes={causes}
                            onOperatorChange={handleOperatorChange}
                            onDetailChange={handleDetailChange}
                            onVariationChange={handleVariationChange}
                            onAddDetail={addDetail}
                            onRemoveDetail={removeDetail}
                            onAddVariation={addVariation}
                            onRemoveVariation={removeVariation}
                            calculatePerecentDesp={calculatePerecentDesp}
                            readOnly={readOnly}
                        />
                    );
                })}
            </tbody>
        </table>
      </div>
    </div>
  );
}

// Sub-component for rendering the complex row structure
function MachineRow({ 
    item, 
    machineName, 
    operators, 
    causes,
    onOperatorChange,
    onDetailChange,
    onVariationChange,
    onAddDetail,
    onRemoveDetail,
    onAddVariation,
    onRemoveVariation,
    calculatePerecentDesp,
    readOnly
}: any) {
    // We need to calculate how many rows this machine takes up.
    // It is the sum of variations for all details.
    const totalRows = item.details.reduce((acc: number, d: any) => acc + Math.max(d.variations.length, 1), 0);

    return (
        <>
            {item.details.map((detail: any, dIndex: number) => {
                const variationRows = Math.max(detail.variations.length, 1);
                
                return detail.variations.map((variation: any, vIndex: number) => (
                    <tr key={`${item.machineId}-${dIndex}-${vIndex}`} className="border-b hover:bg-muted/20">
                        {/* Machine & Operator: Render only on first row of first detail */}
                        {dIndex === 0 && vIndex === 0 && (
                            <>
                                <td rowSpan={totalRows} className="p-2 border font-medium align-top bg-muted/5">
                                    {machineName}
                                </td>
                                <td rowSpan={totalRows} className="p-2 border align-top bg-muted/5">
                                    <Select 
                                        value={item.operatorId} 
                                        onValueChange={(v) => onOperatorChange(item.machineId, v)}
                                        disabled={readOnly}
                                    >
                                        <SelectTrigger className="w-[140px] h-8">
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="UNPROGRAMMED" className="text-muted-foreground font-semibold">
                                                Desprogramada
                                            </SelectItem>
                                            {operators.map((op: any) => (
                                                <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </td>
                            </>
                        )}

                        {/* Detail Columns: Render only on first row of the detail */}
                        {vIndex === 0 && (
                            <>
                                <td rowSpan={variationRows} className="p-2 border align-top min-w-[120px] max-w-[120px]">
                                    <div className="flex flex-col gap-1">
                                        <Input 
                                            value={detail.ot} 
                                            onChange={(e) => onDetailChange(item.machineId, dIndex, 'ot', e.target.value)}
                                            placeholder="OT #" 
                                            className="h-8"
                                            disabled={readOnly}
                                        />
                                        <div className="flex gap-1">
                                            <Button disabled={readOnly} variant="ghost" size="icon" className="h-6 w-6" onClick={() => onAddDetail(item.machineId)}>
                                                <Plus className="w-3 h-3" />
                                            </Button>
                                            {item.details.length > 1 && (
                                                <Button disabled={readOnly} variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onRemoveDetail(item.machineId, dIndex)}>
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td rowSpan={variationRows} className="p-2 border align-top">
                                    <Input 
                                        value={detail.efficiency} 
                                        onChange={(e) => onDetailChange(item.machineId, dIndex, 'efficiency', e.target.value)}
                                        className="w-16 h-8" 
                                        placeholder="%"
                                        disabled={readOnly}
                                    />
                                </td>
                                <td rowSpan={variationRows} className="p-2 border align-top">
                                    <Input 
                                        value={detail.mtProg} 
                                        onChange={(e) => onDetailChange(item.machineId, dIndex, 'mtProg', e.target.value)}
                                        className="w-full h-8"
                                        disabled={readOnly}
                                    />
                                </td>
                                <td rowSpan={variationRows} className="p-2 border align-top">
                                    <Input 
                                        value={detail.mtProd} 
                                        onChange={(e) => onDetailChange(item.machineId, dIndex, 'mtProd', e.target.value)}
                                        className="w-full h-8"
                                        disabled={readOnly}
                                    />
                                </td>
                                <td rowSpan={variationRows} className="p-2 border align-top">
                                    <Input 
                                        value={detail.kgProd} 
                                        onChange={(e) => onDetailChange(item.machineId, dIndex, 'kgProd', e.target.value)}
                                        className="w-16 h-8"
                                        disabled={readOnly}
                                    />
                                </td>
                                <td rowSpan={variationRows} className="p-2 border align-top">
                                    <Input 
                                        value={detail.kgDesp} 
                                        onChange={(e) => onDetailChange(item.machineId, dIndex, 'kgDesp', e.target.value)}
                                        className="w-16 h-8"
                                        disabled={readOnly}
                                    />
                                </td>
                                <td rowSpan={variationRows} className="p-2 border align-top font-medium">
                                    {calculatePerecentDesp(detail.kgProd, detail.kgDesp)}
                                </td>
                            </>
                        )}

                        {/* Variation Columns */}
                        <td className="p-2 border align-top">
                            <Select 
                                value={variation.stage || ''} 
                                onValueChange={(v) => onVariationChange(item.machineId, dIndex, vIndex, 'stage', v === '_CLEAR_' ? '' : v)}
                                disabled={readOnly}
                            >
                                <SelectTrigger className="w-[100px] h-8">
                                    <SelectValue placeholder="Stage" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_CLEAR_">-- Vacío --</SelectItem>
                                    <SelectItem value="T1">T1</SelectItem>
                                    <SelectItem value="T2">T2</SelectItem>
                                    <SelectItem value="T3">T3</SelectItem>
                                    <SelectItem value="T4">T4</SelectItem>
                                    <SelectItem value="T5">T5</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="flex gap-1 mt-1">
                                {vIndex === detail.variations.length - 1 && (
                                     <Button disabled={readOnly} variant="ghost" size="icon" className="h-5 w-5" onClick={() => onAddVariation(item.machineId, dIndex)}>
                                        <Plus className="w-3 h-3" />
                                    </Button>
                                )}
                                {detail.variations.length > 1 && (
                                     <Button disabled={readOnly} variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => onRemoveVariation(item.machineId, dIndex, vIndex)}>
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                )}
                            </div>
                        </td>
                        <td className="p-2 border align-top">
                            <Select 
                                value={variation.causeId} 
                                onValueChange={(v) => onVariationChange(item.machineId, dIndex, vIndex, 'causeId', v)}
                                disabled={readOnly}
                            >
                                <SelectTrigger className="w-[140px] h-8">
                                    <SelectValue placeholder="Cause" />
                                </SelectTrigger>
                                <SelectContent>
                                    {causes.map((c: any) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </td>
                        <td className="p-2 border align-top">
                            <Textarea 
                                value={variation.analysis} 
                                onChange={(e) => onVariationChange(item.machineId, dIndex, vIndex, 'analysis', e.target.value)}
                                placeholder="Analysis..."
                                className="min-h-[80px] min-w-[200px] resize-y"
                                disabled={readOnly}
                            />
                        </td>
                    </tr>
                ));
            })}
        </>
    );
}
