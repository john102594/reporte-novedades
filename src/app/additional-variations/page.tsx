'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Filter, RefreshCw, Search } from 'lucide-react';
import { VariationForm } from '@/components/additional-variations/variation-form';
import { VariationList } from '@/components/additional-variations/variation-list';
import {
  getAdditionalVariations,
  getVariationTypes,
  type VariationStatus
} from '@/app/actions/additional-variations';

interface VariationType {
  id: string;
  name: string;
  code: string;
  category: string;
}

interface Variation {
  id: string;
  ot: string;
  type: VariationType;
  quantity: number;
  description: string | null;
  status: VariationStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string | null } | null;
  responsibleOperators: { id: string; name: string | null }[];
  actionTask: { id: string; status: string } | null;
}

export default function AdditionalVariationsPage() {
  const [activeTab, setActiveTab] = useState('list');
  const [variations, setVariations] = useState<Variation[]>([]);
  const [variationTypes, setVariationTypes] = useState<VariationType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [filterOT, setFilterOT] = useState('');
  const [filterTypeId, setFilterTypeId] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<VariationStatus | 'ALL'>('ALL');

  // Load variation types for filter
  useEffect(() => {
    async function loadTypes() {
      const types = await getVariationTypes({ category: 'ADICIONAL' });
      setVariationTypes(types);
    }
    loadTypes();
  }, []);

  const loadVariations = async () => {
    setIsLoading(true);
    try {
      const filters: any = {};
      
      if (filterOT) filters.ot = filterOT;
      if (filterTypeId !== 'ALL') filters.typeId = filterTypeId;
      if (filterStatus !== 'ALL') filters.status = filterStatus;
      
      const data = await getAdditionalVariations(
        Object.keys(filters).length > 0 ? filters : undefined
      );
      setVariations(data);
    } catch (error) {
      console.error('Error loading variations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVariations();
  }, [filterOT, filterTypeId, filterStatus]);

  const handleFormSuccess = () => {
    setActiveTab('list');
    loadVariations();
  };

  // Group stats by type
  const statsByType = variationTypes.reduce((acc, type) => {
    acc[type.id] = {
      name: type.name,
      count: variations.filter(v => v.type.id === type.id).length,
      totalKg: variations.filter(v => v.type.id === type.id).reduce((sum, v) => sum + v.quantity, 0)
    };
    return acc;
  }, {} as Record<string, { name: string; count: number; totalKg: number }>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <div className="border-b bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Variaciones Adicionales
              </h1>
              <p className="text-sm text-slate-500">
                Gestión de desperdicios adicionales, rechazos y producto retenido (post-reporte)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadVariations}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <Button 
                size="sm"
                onClick={() => setActiveTab('create')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Variación
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white dark:bg-zinc-900 border shadow-sm">
            <TabsTrigger value="list" className="data-[state=active]:bg-primary/10">
              Listado
            </TabsTrigger>
            <TabsTrigger value="create" className="data-[state=active]:bg-primary/10">
              Crear Nueva
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 p-4 bg-white dark:bg-zinc-900 rounded-lg border shadow-sm">
              <Filter className="w-4 h-4 text-slate-400" />
              
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por OT..."
                  value={filterOT}
                  onChange={(e) => setFilterOT(e.target.value)}
                  className="w-40 h-8"
                />
              </div>

              <Select value={filterTypeId} onValueChange={setFilterTypeId}>
                <SelectTrigger className="w-44 h-8">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los tipos</SelectItem>
                  {variationTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                <SelectTrigger className="w-36 h-8">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="EN_ANALISIS">En Análisis</SelectItem>
                  <SelectItem value="RESUELTO">Resuelto</SelectItem>
                </SelectContent>
              </Select>

              {(filterOT || filterTypeId !== 'ALL' || filterStatus !== 'ALL') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterOT('');
                    setFilterTypeId('ALL');
                    setFilterStatus('ALL');
                  }}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              <StatCard 
                label="Total" 
                value={variations.length} 
                subValue={`${variations.reduce((sum, v) => sum + v.quantity, 0).toLocaleString()} kg`}
                color="bg-slate-100 text-slate-700"
              />
              {Object.entries(statsByType).slice(0, 3).map(([id, stat]) => (
                <StatCard 
                  key={id}
                  label={stat.name} 
                  value={stat.count}
                  subValue={`${stat.totalKg.toLocaleString()} kg`}
                  color="bg-amber-100 text-amber-700"
                />
              ))}
            </div>

            {/* List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <VariationList variations={variations} onRefresh={loadVariations} />
            )}
          </TabsContent>

          <TabsContent value="create" className="flex justify-center">
            <VariationForm onSuccess={handleFormSuccess} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({ label, value, subValue, color }: { label: string; value: number; subValue?: string; color: string }) {
  return (
    <div className={`${color} rounded-lg p-4 border`}>
      <p className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-2xl font-black">{value}</p>
      {subValue && <p className="text-xs opacity-70">{subValue}</p>}
    </div>
  );
}
