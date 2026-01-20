'use client';

import { Suspense, useEffect, useState } from 'react';
import { SummaryFilters } from '@/components/production/summary/summary-filters';
import { SummaryTable } from '@/components/production/summary/summary-table';
import { getProductionSummary, SummaryRow, getAreas } from '@/app/actions/summary';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ProductionSummaryPage() {
  const [data, setData] = useState<SummaryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([]);
  
  // Filters
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedArea, setSelectedArea] = useState('all');

  // Load areas on mount
  useEffect(() => {
    async function fetchAreas() {
        const areaList = await getAreas();
        setAreas(areaList);
    }
    fetchAreas();
  }, []);

  useEffect(() => {
    async function loadData() {
        setIsLoading(true);
        try {
            const res = await getProductionSummary(
                new Date(startDate),
                new Date(endDate),
                selectedArea
            );

            if (res.success && res.data) {
                setData(res.data);
            }
        } catch (error) {
            console.error("Failed to load summary", error);
        } finally {
            setIsLoading(false);
        }
    }

    loadData();
  }, [startDate, endDate, selectedArea]);

  return (
    <div className="container mx-auto py-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-700 to-blue-400 bg-clip-text text-transparent">
             Production Summary
           </h1>
           <p className="text-muted-foreground mt-1">
             Management view for production efficiency and waste analysis.
           </p>
        </div>
        <div className="flex gap-2">
            <Link href="/production">
                <Button variant="outline">Back into Production</Button>
            </Link>
        </div>
      </div>

      <SummaryFilters 
        startDate={startDate}
        endDate={endDate}
        areaId={selectedArea}
        areas={areas}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onAreaChange={setSelectedArea}
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
        </div>
      ) : (
        <SummaryTable data={data} />
      )}
    </div>
  );
}
