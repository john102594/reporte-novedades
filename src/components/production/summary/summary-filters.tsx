'use client';

import React from 'react';

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface SummaryFiltersProps {
  startDate: string;
  endDate: string;
  areaId: string;
  areas: { id: string; name: string }[];
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  onAreaChange: (val: string) => void;
}

export function SummaryFilters({
  startDate,
  endDate,
  areaId,
  areas,
  onStartDateChange,
  onEndDateChange,
  onAreaChange
}: SummaryFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-card border rounded-lg shadow-sm mb-6">
      <div className="space-y-2">
        <Label>Start Date</Label>
        <Input 
          type="date" 
          value={startDate} 
          onChange={(e) => onStartDateChange(e.target.value)}
          className="bg-background"
        />
      </div>
      <div className="space-y-2">
        <Label>End Date</Label>
        <Input 
          type="date" 
          value={endDate} 
          onChange={(e) => onEndDateChange(e.target.value)}
          className="bg-background"
        />
      </div>
      <div className="space-y-2">
        <Label>Area / Process</Label>
        <Select value={areaId} onValueChange={onAreaChange}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Select Area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Areas</SelectItem>
            {areas.map(area => (
              <SelectItem key={area.id} value={area.id}>
                {area.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
