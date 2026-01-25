'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProductionTable } from './production-table';
import { getProductionContext, getShiftReport } from '@/app/actions/production';
import { Loader2, Calendar, Clock, MapPin, Search, Save } from 'lucide-react';

interface Area {
  id: string;
  name: string;
}

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import Link from 'next/link';

export function ProductionManager({ areas, userId }: { areas: Area[], userId: string }) {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'selection' | 'table'>('selection');
  
  // Selection State - Init from URL if present
  const [areaId, setAreaId] = useState<string>(searchParams.get('area') || '');
  const [date, setDate] = useState<string>(searchParams.get('date') || new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState<string>(decodeURIComponent(searchParams.get('shift') || 'T1'));
  
  // Loaded Data
  const [context, setContext] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasAutoLoaded = useRef(false);

  const handleStart = async (overrideArea?: any) => {
    const targetArea = typeof overrideArea === 'string' ? overrideArea : areaId;
    const targetDate = date;
    const targetShift = shift;

    if (!targetArea || !targetDate || !targetShift) return;
    
    setIsLoading(true);
    try {
      const [ctx, rep] = await Promise.all([
        getProductionContext(targetArea),
        getShiftReport(targetArea, targetDate, targetShift)
      ]);
      
      setContext(ctx);
      setReport(rep);
      
      setStep('table');
    } catch (error) {
      console.error(error);
      // Handle error (toast)
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-load if URL params exist
  useEffect(() => {
    const urlArea = searchParams.get('area');
    const urlDate = searchParams.get('date');
    const urlShift = searchParams.get('shift');

    if (urlArea && urlDate && urlShift && !hasAutoLoaded.current) {
        hasAutoLoaded.current = true;
        handleStart(urlArea);
    }
  }, [searchParams]);

  const isReadOnly = !!(report && report.gestorId && report.gestorId !== userId);
  const ownerName = report?.gestor?.name || 'Another Manager';

  if (step === 'table' && context) {
    return (
      <div className="flex flex-col h-[calc(100vh-2rem)] animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header Redesign */}
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-950 border-b shrink-0">
            <div className="flex items-center gap-6">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-950 via-primary to-purple-600 dark:from-purple-400 dark:via-primary dark:to-purple-300 bg-clip-text text-transparent">
                    FlexFlow
                </h1>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-full">
                        <MapPin className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span className="text-xs font-bold text-purple-900 dark:text-purple-100 uppercase tracking-wider">
                            {areas.find(a => a.id === areaId)?.name}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            {date}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            {shift}
                        </span>
                    </div>

                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setStep('selection')}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors h-8"
                    >
                        Change Selection
                    </Button>
                </div>
            </div>

            {/* Guardar Jornada Button - Linked to Table via custom ID for simple DOM access or just rely on Table buttons for now */}
            <div className="flex items-center gap-3">
                <Button 
                    id="global-save-button"
                    className="bg-slate-900 hover:bg-black text-white px-6 font-bold shadow-lg transition-all active:scale-95 flex gap-2"
                >
                    <Save className="w-4 h-4" />
                    Guardar Jornada
                </Button>
            </div>
        </div>

        {context.machines.length === 0 && (
            <div className="m-4 p-4 bg-red-100 text-red-800 rounded border border-red-300">
                <strong>Error: No machines found for this area.</strong>
                <p>Please check if the area "Impresion" has machines assigned in the database.</p>
                <p>Debug ID: {areaId}</p>
            </div>
        )}

        <ProductionTable 
            areaId={areaId}
            date={date}
            shift={shift}
            machines={context.machines}
            operators={context.operators}
            causes={context.causes}
            initialReport={report}
            readOnly={isReadOnly}
            ownerName={isReadOnly ? ownerName : undefined}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto animate-in fade-in duration-500">
      <Card className="w-full bg-card/50 backdrop-blur-sm border-primary/20 shadow-xl">
        <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Start Production Shift</CardTitle>
            <CardDescription>Select area and shift details to manage the report</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
                <Label>Production Area</Label>
                <Select value={areaId} onValueChange={setAreaId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Area" />
                    </SelectTrigger>
                    <SelectContent>
                        {areas.map(area => (
                            <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Date</Label>
                    <Input 
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Shift</Label>
                    <Select value={shift} onValueChange={setShift}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Shift" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="T1">Turno 1 (6am - 6pm)</SelectItem>
                            <SelectItem value="T2">Turno 2 (6pm - 6am)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Button 
                onClick={handleStart} 
                disabled={!areaId || !date || !shift || isLoading} 
                className="w-full mt-4 bg-primary hover:bg-primary/90"
                size="lg"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading Context...
                    </>
                ) : (
                    'Open Report'
                )}
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
