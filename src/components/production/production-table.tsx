'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  variationTypeId?: string;
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
  variationTypes: { id: string; name: string; code: string }[];
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
  variationTypes,
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
                            variationTypeId: v.variationTypeId,
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
    variationTypeId: '',
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
      const updatedDetail = { ...newDetails[detailIndex], [field]: value };
      
      newDetails[detailIndex] = updatedDetail;
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

  // Connect Global Save Button from Manager Header
  useEffect(() => {
    const btn = document.getElementById('global-save-button');
    if (btn) {
        const handleClick = () => handleSave();
        btn.addEventListener('click', handleClick);
        return () => btn.removeEventListener('click', handleClick);
    }
  }, [items, reportId]); // Re-bind when state changes to capture current items in closure or use a ref

  // Auto-save effect (debounce?)
  // For now, let's rely on manual Save or Close, maybe auto-save every 30s.

  // Calculations
  const calculatePerecentDesp = (kgProd: any, kgDesp: any) => {
    const prod = parseFloat(kgProd);
    const desp = parseFloat(kgDesp);
    if (!prod || isNaN(prod) || !desp || isNaN(desp)) return '0%';
    return ((desp / prod) * 100).toFixed(1) + '%';
  };

  // --- Totals for Footer ---
  const totals = items.reduce((acc, item) => {
    item.details.forEach(detail => {
        const prodMetros = parseFloat(detail.mtProd as string) || 0;
        const efficiencyValue = parseFloat(detail.efficiency as string) || 0;
        
        acc.progMetros += parseFloat(detail.mtProg as string) || 0;
        acc.prodMetros += prodMetros;
        acc.prodKg += parseFloat(detail.kgProd as string) || 0;
        acc.despKg += parseFloat(detail.kgDesp as string) || 0;
        
        // Weighted Efficiency: Sum(Efic * Prod)
        acc.weightedEficSum += (efficiencyValue * prodMetros);
        acc.count++;
    });
    return acc;
  }, { progMetros: 0, prodMetros: 0, prodKg: 0, despKg: 0, weightedEficSum: 0, count: 0 });

  // Weighted Avg = Sum(Efic * Prod) / Sum(Prod)
  const globalEfficiency = (totals.prodMetros > 0 ? (totals.weightedEficSum / totals.prodMetros) : 0).toFixed(1);
  const globalDesp = (totals.prodKg > 0 ? (totals.despKg / totals.prodKg) * 100 : 0).toFixed(1);

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      {readOnly && (
        <div className="mx-6 my-2 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg flex items-center gap-2 text-xs">
            <XCircle className="w-4 h-4" />
            <span><strong>Modo Lectura:</strong> Este reporte pertenece a <strong>{ownerName}</strong>.</span>
        </div>
      )}

      {/* Hidden legacy buttons, we use the header one now or can keep them for safety */}
      <div className="hidden">
        <Button id="legacy-save-btn" onClick={handleSave} disabled={isSaving || readOnly} />
        <Button id="legacy-close-btn" onClick={handleCloseShift} disabled={readOnly} />
      </div>

      {/* Main Table Container */}
      <div className="flex-1 overflow-auto px-6 pb-24">
        <table className="w-full text-[11px] border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 bg-white dark:bg-zinc-950">
                <tr className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider h-12">
                    <th className="px-4 text-left border-b w-[240px]">Máquina / Operador</th>
                    <th className="px-2 text-center border-b w-[100px]">Orden</th>
                    <th className="px-2 text-center border-b w-[80px]">Eficiencia</th>
                    <th className="px-2 text-center border-b w-[180px]">Metros</th>
                    <th className="px-2 text-center border-b w-[180px]">Kilogramos</th>
                    <th className="px-1 text-center border-b w-[60px]">% Desp</th>
                    <th className="px-2 text-center border-b w-[100px]">Variación</th>
                    <th className="px-4 text-left border-b">Análisis y Causa</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
                            variationTypes={variationTypes}
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

      {/* FIXED FOOTER SUMMARY BAR */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#0f172a] text-white flex items-center justify-between px-12 z-50 border-t border-slate-800 shadow-2xl">
          <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Planta Operativa</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Máquinas</span>
                  <span className="text-xl font-black text-white">{machines.length}</span>
              </div>
          </div>

          <div className="flex items-center gap-12">
              <div className="flex flex-col items-end">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Total Metros</span>
                  <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black">{totals.prodMetros.toLocaleString()}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">mt</span>
                  </div>
              </div>

              <div className="flex flex-col items-end">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Total Kg Prod.</span>
                  <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black">{totals.prodKg.toLocaleString()}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">kg</span>
                  </div>
              </div>

              <div className="flex flex-col items-end">
                  <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest leading-none">Total Kg Desp.</span>
                  <div className="flex items-baseline gap-1 text-amber-500">
                      <span className="text-lg font-black">{totals.despKg.toLocaleString()}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest">kg</span>
                  </div>
              </div>

              <div className="h-8 w-px bg-slate-800" />

              <div className="flex flex-col items-end">
                  <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest leading-none">% Desp. Total</span>
                  <span className="text-xl font-black text-white">{globalDesp}%</span>
              </div>

              <div className="flex flex-col items-end">
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest leading-none flex items-center gap-1">
                      <Plus className="w-2 h-2 rotate-45" /> Eficiencia Global
                  </span>
                  <span className="text-2xl font-black text-white tracking-tight">{globalEfficiency}%</span>
              </div>
          </div>
      </div>
    </div>
  );
}

// Local optimized input to avoid global re-renders on every keystroke
function DebouncedInput({ value: initialValue, onChange, delay = 300, ...props }: any) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (value !== initialValue) {
        onChange(value);
      }
    }, delay);
    return () => clearTimeout(timeout);
  }, [value]);

  return (
    <Input
      {...props}
      value={value}
      onChange={e => setValue(e.target.value)}
    />
  );
}

// Sub-component for rendering the complex row structure
const MachineRow = React.memo(function MachineRow({ 
    item, 
    machineName, 
    operators, 
    causes,
    variationTypes,
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
    const totalRows = item.details.reduce((acc: number, d: any) => acc + Math.max(d.variations.length, 1), 0);
    const machineIdDisplay = machineName.replace(/\D/g, '') || machineName.charAt(0);

    return (
        <React.Fragment key={item.machineId}>
            {item.details.map((detail: any, dIndex: number) => {
                const variationRows = Math.max(detail.variations.length, 1);
                
                return detail.variations.map((variation: any, vIndex: number) => (
                    <tr key={`${item.machineId}-${dIndex}-${vIndex}`} className="group hover:bg-slate-50/50 dark:hover:bg-zinc-900 transition-colors">
                        {/* Machine & Operator Section */}
                        {dIndex === 0 && vIndex === 0 && (
                            <td rowSpan={totalRows} className="p-4 border-b border-slate-100 dark:border-slate-800 align-top">
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                                            <span className="text-xs font-black text-primary">{machineIdDisplay}</span>
                                        </div>
                                        <span className="font-bold text-slate-800 dark:text-slate-100">{machineName}</span>
                                    </div>
                                    <div className="flex items-center gap-2 group/op">
                                        <Select 
                                            value={item.operatorId} 
                                            onValueChange={(v) => onOperatorChange(item.machineId, v)}
                                            disabled={readOnly}
                                        >
                                            <SelectTrigger className="w-full h-8 text-[10px] font-bold uppercase tracking-widest bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover/op:bg-primary transition-colors" />
                                                    <SelectValue placeholder="OPERADOR" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="UNPROGRAMMED">DESPROGRAMADA</SelectItem>
                                                {operators.map((op: any) => (
                                                    <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </td>
                        )}

                        {/* Order Detail Section */}
                        {vIndex === 0 && (
                            <>
                                <td rowSpan={variationRows} className="px-2 py-4 border-b border-slate-100 dark:border-slate-800 align-middle">
                                    <div className="flex flex-col items-center gap-1.5">
                                        <DebouncedInput 
                                            value={detail.ot} 
                                            onChange={(val: any) => onDetailChange(item.machineId, dIndex, 'ot', val)}
                                            placeholder="OT #" 
                                            className="h-8 text-center font-bold text-primary bg-purple-50/50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-800"
                                            disabled={readOnly}
                                        />
                                        {!readOnly && (
                                            <div className="flex gap-1">
                                                <button onClick={() => onAddDetail(item.machineId)} className="p-1 text-slate-300 hover:text-primary transition-colors">
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                                {item.details.length > 1 && (
                                                    <button onClick={() => onRemoveDetail(item.machineId, dIndex)} className="p-1 text-slate-300 hover:text-destructive transition-colors">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                
                                <td rowSpan={variationRows} className="px-2 py-4 border-b border-slate-100 dark:border-slate-800 align-middle text-center">
                                    <div className="flex flex-col items-center gap-1 w-full max-w-[80px] mx-auto">
                                        <div className="relative w-full">
                                            <DebouncedInput 
                                                value={detail.efficiency} 
                                                onChange={(val: any) => onDetailChange(item.machineId, dIndex, 'efficiency', val)}
                                                className={`h-8 w-full text-center font-black bg-white dark:bg-zinc-950 pr-6 ${
                                                    parseFloat(detail.efficiency) > 92 
                                                        ? 'text-emerald-500 border-emerald-200' 
                                                        : parseFloat(detail.efficiency) >= 80 
                                                            ? 'text-amber-500 border-amber-200' 
                                                            : 'text-rose-500 border-rose-200'
                                                }`}
                                                disabled={readOnly}
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 select-none">%</span>
                                        </div>
                                    </div>
                                </td>

                                <td rowSpan={variationRows} className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 align-middle">
                                    <div className="flex flex-col gap-2 w-full">
                                        <div className="space-y-1 w-full">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.1em] block">Programado</span>
                                            <DebouncedInput 
                                                value={detail.mtProg} 
                                                onChange={(val: any) => onDetailChange(item.machineId, dIndex, 'mtProg', val)}
                                                className="h-8 text-xs font-bold bg-white dark:bg-zinc-950 text-center w-full"
                                                disabled={readOnly}
                                            />
                                        </div>
                                        <div className="space-y-1 w-full">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.1em] block">Producido</span>
                                            <DebouncedInput 
                                                value={detail.mtProd} 
                                                onChange={(val: any) => onDetailChange(item.machineId, dIndex, 'mtProd', val)}
                                                className="h-8 text-xs font-black bg-purple-50/30 dark:bg-purple-900/5 text-center border-primary/20 w-full"
                                                disabled={readOnly}
                                            />
                                        </div>
                                    </div>
                                </td>

                                <td rowSpan={variationRows} className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 align-middle">
                                    <div className="flex flex-col gap-2 w-full">
                                        <div className="space-y-1 w-full">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.1em] block">Producido</span>
                                            <DebouncedInput 
                                                value={detail.kgProd} 
                                                onChange={(val: any) => onDetailChange(item.machineId, dIndex, 'kgProd', val)}
                                                className="h-8 text-xs font-bold bg-white dark:bg-zinc-950 text-center w-full"
                                                disabled={readOnly}
                                            />
                                        </div>
                                        <div className="space-y-1 w-full">
                                            <span className="text-[8px] font-bold text-rose-400 uppercase tracking-[0.1em] block">Desperdicio</span>
                                            <DebouncedInput 
                                                value={detail.kgDesp} 
                                                onChange={(val: any) => onDetailChange(item.machineId, dIndex, 'kgDesp', val)}
                                                className="h-8 text-xs font-bold bg-rose-50/30 dark:bg-rose-900/5 text-center border-rose-100 dark:border-rose-900/50 text-rose-600 w-full"
                                                disabled={readOnly}
                                            />
                                        </div>
                                    </div>
                                </td>

                                <td rowSpan={variationRows} className="px-2 py-4 border-b border-slate-100 dark:border-slate-800 align-middle text-center">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">
                                            {calculatePerecentDesp(detail.kgProd, detail.kgDesp)}
                                        </span>
                                    </div>
                                </td>
                            </>
                        )}

                        {/* Variation Column */}
                        <td className="px-2 py-4 border-b border-slate-100 dark:border-slate-800 align-top">
                            <div className="flex flex-col gap-2 pt-1 uppercase">
                                <Select 
                                    value={variation.variationTypeId || ''} 
                                    onValueChange={(v) => {
                                        const selectedType = variationTypes.find(t => t.id === v);
                                        onVariationChange(item.machineId, dIndex, vIndex, 'variationTypeId', v === '_CLEAR_' ? '' : v);
                                        // Also update stage for legacy consistency if needed
                                        onVariationChange(item.machineId, dIndex, vIndex, 'stage', selectedType?.name || '');
                                    }}
                                    disabled={readOnly}
                                >
                                    <SelectTrigger className="h-7 text-[10px] font-black tracking-widest border-slate-100 dark:border-slate-800 bg-slate-100/50 dark:bg-zinc-950">
                                        <SelectValue placeholder="ETAPA" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_CLEAR_">SIN VARIACION</SelectItem>
                                        {(variationTypes || []).map((vt: any) => (
                                            <SelectItem key={vt.id} value={vt.id}>{vt.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {!readOnly && (
                                    <div className="flex gap-1 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => onAddVariation(item.machineId, dIndex)} className="p-1 text-slate-300 hover:text-primary transition-colors">
                                            <Plus size={12} />
                                        </button>
                                        {detail.variations.length > 1 && (
                                            <button onClick={() => onRemoveVariation(item.machineId, dIndex, vIndex)} className="p-1 text-slate-300 hover:text-destructive transition-colors">
                                                <XCircle size={12} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </td>

                        {/* Analysis & Cause Section */}
                        <td className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 align-top">
                            <div className="flex flex-col gap-3">
                                <Textarea 
                                    value={variation.analysis} 
                                    onChange={(e) => onVariationChange(item.machineId, dIndex, vIndex, 'analysis', e.target.value)}
                                    placeholder="Escribir análisis técnico detallado..."
                                    className="min-h-[80px] bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-xs italic shadow-none focus:border-primary/30 transition-all resize-none font-medium text-slate-500"
                                    disabled={readOnly}
                                />
                                <div className="flex items-center gap-2 group/cause">
                                    <span className="text-[10px] font-bold text-primary tracking-widest uppercase">Causa:</span>
                                    <Select 
                                        value={variation.causeId} 
                                        onValueChange={(v) => onVariationChange(item.machineId, dIndex, vIndex, 'causeId', v)}
                                        disabled={readOnly}
                                    >
                                        <SelectTrigger className="h-6 gap-2 border-none bg-transparent hover:bg-slate-50 dark:hover:bg-zinc-800 p-0 shadow-none text-[10px] font-bold text-primary">
                                            <SelectValue placeholder="Click para seleccionar causa..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(causes || []).map((c: any) => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </td>
                    </tr>
                ));
            })}
        </React.Fragment>
    );
});
