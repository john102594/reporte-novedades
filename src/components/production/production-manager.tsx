'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProductionTable } from './production-table';
import { getProductionContext, getShiftReport } from '@/app/actions/production';
import { Loader2, Calendar, Clock, MapPin, Search } from 'lucide-react';

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
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
            <div className="flex gap-6 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-foreground">
                        {areas.find(a => a.id === areaId)?.name}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-foreground">
                        {date}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-foreground">
                        {shift}
                    </span>
                </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep('selection')}>
                Change Selection
            </Button>
        </div>

        {context.machines.length === 0 && (
            <div className="p-4 bg-red-100 text-red-800 rounded border border-red-300">
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
