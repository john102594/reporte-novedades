'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, ArrowLeft } from 'lucide-react';
import { searchOT } from '@/app/actions/ot';
import { OTSearchResults } from '@/components/production/ot-search-results';
import Link from 'next/link';

export default function OTSearchPage() {
  const [otNumber, setOtNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otNumber.trim()) return;

    setIsSearching(true);
    const res = await searchOT(otNumber.trim());
    setIsSearching(false);

    if (res.success) {
      setResults(res.data || []);
    } else {
      setResults([]);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Link href="/production">
                <Button variant="ghost" size="icon" className="hover:bg-white/10">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
            </Link>
            <div>
                <h1 className="text-4xl font-black text-white bg-gradient-to-r from-white to-white/60 bg-clip-text">
                    Buscador de OT
                </h1>
                <p className="text-muted-foreground font-medium">
                    Consulta el historial y reportes de una Orden de Trabajo específica.
                </p>
            </div>
        </div>
      </div>

      <div className="bg-card/30 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={otNumber}
              onChange={(e) => setOtNumber(e.target.value)}
              placeholder="Ingrese el número de OT..."
              className="pl-11 h-12 bg-white/5 border-white/20 text-lg font-bold placeholder:font-normal focus-visible:ring-primary"
            />
          </div>
          <Button 
            type="submit" 
            disabled={isSearching || !otNumber.trim()} 
            size="lg"
            className="px-8 font-bold bg-primary hover:bg-primary/90 transition-all hover:scale-105"
          >
            {isSearching ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Buscar'
            )}
          </Button>
        </form>
      </div>

      {results !== null && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white/90">
              {results.length > 0 
                ? `${results.length} reporte(s) encontrado(s)` 
                : 'Sin resultados'}
            </h2>
          </div>
          <OTSearchResults results={results} />
        </div>
      )}
    </div>
  );
}
