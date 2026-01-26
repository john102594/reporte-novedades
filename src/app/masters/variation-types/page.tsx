import prisma from '@/lib/prisma';
import { Badge } from '@/components/ui/badge';
import { Tag, Check, X, Eye, EyeOff } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VariationTypeDialog } from '@/components/masters/variation-types/variation-type-dialog';
import { VariationTypeActions } from '@/components/masters/variation-types/variation-type-actions';

export default async function VariationTypesPage() {
  const types = await prisma.variationType.findMany({
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    include: {
      _count: {
        select: { additionalVariations: true }
      }
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent mb-2">
            Tipos de Variación
          </h1>
          <p className="text-muted-foreground">
            Configure los tipos de variación disponibles para reportes y post-reportes.
          </p>
        </div>
        <VariationTypeDialog />
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Código</TableHead>
              <TableHead className="w-[250px]">Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-center">Visible Gestor</TableHead>
              <TableHead className="text-center">Activo</TableHead>
              <TableHead className="text-center">Uso</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.map((type) => (
              <TableRow key={type.id} className="hover:bg-muted/50">
                <TableCell className="font-mono font-bold text-primary">
                  {type.code}
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-slate-400" />
                    {type.name}
                    {type.description && (
                      <span className="text-xs text-muted-foreground">
                        - {type.description}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={
                      type.category === 'OPERATIVA' 
                        ? 'border-blue-300 text-blue-600 bg-blue-50' 
                        : 'border-amber-300 text-amber-600 bg-amber-50'
                    }
                  >
                    {type.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {type.visibleToGestor ? (
                    <Eye className="w-4 h-4 text-green-500 mx-auto" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-300 mx-auto" />
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {type.isActive ? (
                    <Check className="w-4 h-4 text-green-500 mx-auto" />
                  ) : (
                    <X className="w-4 h-4 text-red-400 mx-auto" />
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary" className="text-xs">
                    {type._count.additionalVariations}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <VariationTypeActions variationType={type} />
                </TableCell>
              </TableRow>
            ))}
            {types.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No hay tipos de variación. Cree el primero.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 text-xs text-muted-foreground p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-blue-300 text-blue-600 bg-blue-50">OPERATIVA</Badge>
          <span>Variaciones de turno (T1-T5, Montaje, Ajuste) - visibles para Gestor</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-amber-300 text-amber-600 bg-amber-50">ADICIONAL</Badge>
          <span>Post-reporte (Desperdicio adicional, Rechazo) - solo Coordinador/Manager</span>
        </div>
      </div>
    </div>
  );
}
