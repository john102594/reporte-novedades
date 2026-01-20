'use server';

import prisma from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

export interface SummaryDetail {
  id: string; // Detail ID or Generated ID
  date: string;
  shift: string;
  gestorName: string; // From Report
  machineName: string;
  operatorName: string;
  efficiency: number;
  wastePercentage: number;
  meters: number;
  kgProd: number;
  kgWaste: number;
  reportId: string; // For navigation
}

export interface SummaryRow {
  groupKey: string; // Unique key for the row (e.g. date-shift-gestor)
  date: string;
  shift: string;
  gestorName: string;
  efficiency: number; // Avg
  wastePercentage: number; // Calculated
  totalMeters: number;
  totalKgProd: number;
  totalKgWaste: number;
  details: SummaryDetail[];
  reportId: string; // Link to the first report found for this group (or we might need navigating to specific report)
  // Note: A "Shift-Gestor" combo might span multiple reports if they manage multiple areas? 
  // But usually 1 report per area/shift. If filtering by Area, it should be 1 report.
  areaId: string;
}

export async function getProductionSummary(
  startDate: Date,
  endDate: Date,
  areaId?: string
) {
  try {
    // Ensure accurate daily boundaries (UTC usually, but let's be careful with what passes in)
    // Assuming the dates passed are already what the user intends (e.g. 00:00 to 23:59 local interpreted as UTC)
    
    const whereClause: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        not: 'DELETED' // Assuming we might have this, or just fetch all
      }
    };

    if (areaId && areaId !== 'all') {
      whereClause.areaId = areaId;
    }

    const reports = await prisma.shiftReport.findMany({
      where: whereClause,
      include: {
        gestor: true,
        items: {
          include: {
            machine: true,
            operator: true,
            details: true,
          }
        }
      },
      orderBy: {
        date: 'asc' // or desc
      }
    });

    const summaryMap = new Map<string, SummaryRow>();

    // Process reports to build summary rows
    // Grouping Strategy: Date + Shift + Gestor
    for (const report of reports) {
      const dateStr = report.date.toISOString().split('T')[0]; // Simple YYYY-MM-DD
      const key = `${dateStr}-${report.shift}-${report.gestor?.name || 'Unassigned'}`;
      
      let summary = summaryMap.get(key);
      if (!summary) {
        summary = {
          groupKey: key,
          date: dateStr,
          shift: report.shift,
          gestorName: report.gestor?.name || 'Unassigned',
          efficiency: 0,
          wastePercentage: 0,
          totalMeters: 0,
          totalKgProd: 0,
          totalKgWaste: 0,
          details: [],
          reportId: report.id,
          areaId: report.areaId
        };
        summaryMap.set(key, summary);
      }

      // Process Items & Details
      for (const item of report.items) {
        for (const detail of item.details) {
            // Check valid data
            const kgProd = detail.kgProd || 0;
            const kgDesp = detail.kgDesp || 0;
            const meters = detail.kgProd ? (detail.kgProd * 10) : 0; // Approximate if not stored? 
            // Wait, schema has NO meters field in Detail? 
            // Checking schema... "mtProd"? Yes.
            const mtProd = detail.mtProd || 0;

            const efficiency = detail.efficiency || 0;

            // Add to totals
            summary.totalKgProd += kgProd;
            summary.totalKgWaste += kgDesp;
            summary.totalMeters += mtProd;

            // Collect Detail Row
            summary.details.push({
                id: detail.id,
                date: dateStr,
                shift: report.shift,
                gestorName: summary.gestorName,
                machineName: item.machine.name,
                operatorName: item.operator?.name || 'Unassigned',
                efficiency: efficiency,
                wastePercentage: (kgProd + kgDesp) > 0 ? (kgDesp / (kgProd + kgDesp)) * 100 : 0,
                meters: mtProd,
                kgProd: kgProd,
                kgWaste: kgDesp,
                reportId: report.id
            });
        }
      }
    }

    // Final calculations for Aggregates
    const result = Array.from(summaryMap.values()).map(row => {
        // Prepare to group details by Machine + Operator
        const detailMap = new Map<string, SummaryDetail>();

        // We need to recalculate row totals based on all raw details first before grouping? 
        // Actually, the 'row' already has accumulated totals from the loop above.
        // Let's verify standard waste calculation:
        const globalTotalMat = row.totalKgProd + row.totalKgWaste;
        row.wastePercentage = globalTotalMat > 0 ? (row.totalKgWaste / globalTotalMat) * 100 : 0;

        // Weighted Efficiency for the Row (Shift Total)
        // Formula: Sum(Efficiency * Meters) / Sum(Meters)
        let totalWeightedEff = 0;
        let totalEffMeters = 0;

        // First pass: Calculate weighted efficiency and Group Details
        for (const d of row.details) {
            // For Row Weighted Efficiency
            if (d.efficiency > 0 && d.meters > 0) {
                totalWeightedEff += (d.efficiency * d.meters);
                totalEffMeters += d.meters;
            }

            // Grouping for Detail View (Machine + Operator key)
            // User requested grouping by Machine if multiple OTs exist.
            const detailKey = `${d.machineName}-${d.operatorName}`;
            
            let groupedDetail = detailMap.get(detailKey);
            if (!groupedDetail) {
                groupedDetail = { ...d }; // Clone initial
                detailMap.set(detailKey, groupedDetail);
            } else {
                // Aggregate into existing group
                // We need to store weighted sums for the group to calculate final group efficiency later
                // But 'd' currently holds formatted values. We need raw numbers.
                // Re-calculating group values:
                groupedDetail.kgProd += d.kgProd;
                groupedDetail.kgWaste += d.kgWaste;
                groupedDetail.meters += d.meters;
                
                // We'll temporarily store 'accumulatedWeightedEff' in efficiency field for now? 
                // No, let's strictly handle it. The 'd' coming in is a "one OT" detail.
                // We can't just sum efficiencies.
            }
        }

        // Correcting the Grouped Details Logic
        
        const machineGroups = new Map<string, {
            id: string,
            date: string,
            shift: string,
            gestorName: string,
            machineName: string,
            operatorName: string,
            reportId: string,
            totalKgProd: number,
            totalKgWaste: number,
            totalMeters: number,
            weightedEffSum: number,
            effMetersSum: number
        }>();

        // Use the raw details we pushed earlier
        for (const d of row.details) {
             const key = `${d.machineName}-${d.operatorName}`;
             let group = machineGroups.get(key);
             if (!group) {
                 group = {
                     id: d.id, // Use first ID found
                     date: d.date,
                     shift: d.shift,
                     gestorName: d.gestorName,
                     machineName: d.machineName,
                     operatorName: d.operatorName,
                     reportId: d.reportId,
                     totalKgProd: 0,
                     totalKgWaste: 0,
                     totalMeters: 0,
                     weightedEffSum: 0,
                     effMetersSum: 0
                 };
                 machineGroups.set(key, group);
             }

             // Accumulate
             group.totalKgProd += d.kgProd;
             group.totalKgWaste += d.kgWaste;
             group.totalMeters += d.meters;
             
             if (d.efficiency > 0 && d.meters > 0) {
                 group.weightedEffSum += (d.efficiency * d.meters);
                 group.effMetersSum += d.meters;
             }
        }

        // Convert Groups to SummaryDetail objects
        row.details = Array.from(machineGroups.values()).map(g => {
            // WASTE % FORMULA CHANGE: KgWaste / KgProd (as per user request: 250/1620 = 15.43%)
            // Previous: KgWaste / (KgProd + KgWaste)
            
            const wastePct = g.totalKgProd > 0 ? (g.totalKgWaste / g.totalKgProd) * 100 : 0;
            const avgEff = g.effMetersSum > 0 ? (g.weightedEffSum / g.effMetersSum) : 0;

            return {
                id: g.id,
                date: g.date,
                shift: g.shift,
                gestorName: g.gestorName,
                machineName: g.machineName,
                operatorName: g.operatorName,
                efficiency: avgEff,
                wastePercentage: wastePct,
                meters: g.totalMeters,
                kgProd: g.totalKgProd,
                kgWaste: g.totalKgWaste,
                reportId: g.reportId
            };
        });

        // Final Row Efficiency Calculation (Shift Level)
        if (totalEffMeters > 0) {
            row.efficiency = totalWeightedEff / totalEffMeters;
        } else {
            row.efficiency = 0;
        }

        // Final Row Waste % (Shift Level)
        // WASTE % FORMULA CHANGE: KgWaste / KgProd
        if (row.totalKgProd > 0) {
            row.wastePercentage = (row.totalKgWaste / row.totalKgProd) * 100;
        } else {
             row.wastePercentage = 0;
        }

        return row;
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching summary:', error);
    return { error: 'Failed to fetch summary' };
  }
}

export async function getAreas() {
  try {
    const areas = await prisma.area.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    });
    return areas;
  } catch (error) {
    return [];
  }
}
