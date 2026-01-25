'use client';

import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  ChevronDown, 
  ChevronRight, 
  ExternalLink,
  Search,
  FileText
} from "lucide-react";
import { SummaryRow } from '@/app/actions/summary';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface SummaryTableProps {
  data: SummaryRow[];
}

export function SummaryTable({ data }: SummaryTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (key: string) => {
    const newDocs = new Set(expandedRows);
    if (newDocs.has(key)) {
      newDocs.delete(key);
    } else {
      newDocs.add(key);
    }
    setExpandedRows(newDocs);
  };

  const formatNumber = (num: number, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  const formatPercent = (num: number) => {
    return `${formatNumber(num, 1)}%`;
  };

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border rounded-lg bg-gray-50 dark:bg-zinc-900 border-dashed">
        <FileText className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No records found</p>
        <p className="text-sm">Try adjusting the filter criteria.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border shadow-sm bg-white dark:bg-zinc-950 overflow-hidden">
      <Table>
        <TableHeader className="bg-gray-100 dark:bg-zinc-900">
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead className="font-bold text-black dark:text-white">Date</TableHead>
            <TableHead className="font-bold text-black dark:text-white">Shift</TableHead>
            <TableHead className="font-bold text-black dark:text-white">Gestor</TableHead>
            <TableHead className="text-right font-bold text-blue-600 dark:text-blue-400">Efficiency</TableHead>
            <TableHead className="text-right font-bold text-red-600 dark:text-red-400">% Waste</TableHead>
            <TableHead className="text-right font-bold text-black dark:text-white">Meters</TableHead>
            <TableHead className="text-right font-bold text-black dark:text-white">Kg Prod</TableHead>
            <TableHead className="text-right font-bold text-black dark:text-white">Kg Waste</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <React.Fragment key={row.groupKey}>
              <TableRow key={row.groupKey} className="hover:bg-muted/50 transition-colors">
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={() => toggleRow(row.groupKey)}
                  >
                    {expandedRows.has(row.groupKey) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="font-medium">{row.date}</TableCell>
                <TableCell>{row.shift}</TableCell>
                <TableCell>
                   <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                      {row.gestorName.charAt(0)}
                    </div>
                    {row.gestorName}
                   </div>
                </TableCell>
                
                <TableCell className="text-right">
                  <span className={`font-bold ${row.efficiency < 70 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {formatPercent(row.efficiency)}
                  </span>
                </TableCell>
                
                <TableCell className="text-right">
                   <span className={`font-bold ${row.wastePercentage > 10 ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>
                    {formatPercent(row.wastePercentage)}
                   </span>
                </TableCell>
                
                <TableCell className="text-right font-mono text-sm">{formatNumber(row.totalMeters, 0)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatNumber(row.totalKgProd, 0)}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatNumber(row.totalKgWaste, 0)}</TableCell>
                
                <TableCell>
                  <Link href={`/production?date=${row.date}&shift=${encodeURIComponent(row.shift)}&area=${row.areaId}`} passHref>
                    <Button variant="outline" size="sm" className="h-8 gap-2">
                      Report
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
              
              {/* Detailed Expanded Row */}
              {expandedRows.has(row.groupKey) && (
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableCell colSpan={10} className="p-0">
                    <div className="p-4 bg-muted/20 border-b border-t shadow-inner">
                        <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Detailed Production Breakdown</h4>
                        <div className="rounded-md border bg-background">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="text-xs">Machine</TableHead>
                                    <TableHead className="text-xs">Operator</TableHead>
                                    <TableHead className="text-right text-xs">Efficiency</TableHead>
                                    <TableHead className="text-right text-xs">% Waste</TableHead>
                                    <TableHead className="text-right text-xs">Meters</TableHead>
                                    <TableHead className="text-right text-xs">Kg Prod</TableHead>
                                    <TableHead className="text-right text-xs">Total Desp</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {row.details.map((detail) => (
                                    <TableRow key={detail.id} className="h-10">
                                        <TableCell className="text-sm font-medium">{detail.machineName}</TableCell>
                                        <TableCell className="text-sm">{detail.operatorName}</TableCell>
                                        <TableCell className="text-right text-sm">{formatPercent(detail.efficiency)}</TableCell>
                                        <TableCell className="text-right text-sm">{formatPercent(detail.wastePercentage)}</TableCell>
                                        <TableCell className="text-right text-sm">{formatNumber(detail.meters, 0)}</TableCell>
                                        <TableCell className="text-right text-sm">{formatNumber(detail.kgProd, 0)}</TableCell>
                                        <TableCell className="text-right text-sm">{formatNumber(detail.kgWaste, 0)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
