import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Factory, BarChart3, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8 animate-in fade-in zoom-in duration-700">
      <div className="space-y-4">
        <h1 className="text-6xl font-extrabold tracking-tight lg:text-8xl bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-2xl">
          FlexFlow
        </h1>
        <p className="text-xl text-muted-foreground max-w-[600px] mx-auto">
          Production Management System v1.0
          <br/>
          <span className="text-sm opacity-70">Integrated Quality & Efficiency Control</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-10">
        <Link href="/production">
          <Card className="p-6 bg-card/40 backdrop-blur border-border hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/20 cursor-pointer group">
            <Factory className="w-12 h-12 mx-auto mb-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-bold text-white">Production Floor</h3>
            <p className="text-sm text-muted-foreground mt-2">Manage OTs, Track T-Times, and Monitor Lines.</p>
          </Card>
        </Link>
        
        <Link href="/dashboard/coordinator">
          <Card className="p-6 bg-card/40 backdrop-blur border-border hover:border-blue-500/50 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/20 cursor-pointer group">
            <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-blue-400 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-bold text-white">Coordinator Hub</h3>
            <p className="text-sm text-muted-foreground mt-2">Manage Variations, Assign Actions, and Validate.</p>
          </Card>
        </Link>
        
        <Link href="/analytics">
          <Card className="p-6 bg-card/40 backdrop-blur border-border hover:border-purple-500/50 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/20 cursor-pointer group">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-purple-400 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-bold text-white">Analytics</h3>
            <p className="text-sm text-muted-foreground mt-2">Strategic Insights, KP-Is, and Systemic Analysis.</p>
          </Card>
        </Link>
      </div>

      <div className="pt-10">
        <Link href="/production">
            <Button size="lg" className="rounded-full px-8 bg-white text-black hover:bg-gray-200 font-bold text-lg shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                Get Started <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
        </Link>
      </div>
    </div>
  );
}
