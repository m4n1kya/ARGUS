import Link from 'next/link';
import { AlertCircle, Trash2, HardHat, TreeDeciduous, Zap } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30 overflow-hidden relative">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-900/20 blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-24 lg:pt-32 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
            <span className="text-sm font-medium tracking-wide text-gray-300">v3.0 • Pilot Zone: VIT Bhopal University, Kotri Kalan</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 bg-gradient-to-br from-white via-gray-200 to-gray-500 bg-clip-text text-transparent leading-tight">
            Autonomous Regional Geospatial Urban Sentinel
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 mb-12 leading-relaxed max-w-2xl mx-auto">
            A Multimodal Geospatial Intelligence Platform for Closed-Loop Urban Infrastructure & Public-Safety Management. Zero recurring cost. Local-first inference.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6">
            <Link 
              href="/map" 
              className="px-8 py-4 rounded-xl bg-white text-black font-semibold text-lg hover:bg-gray-200 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] transform hover:-translate-y-1"
            >
              Enter Command Centre
            </Link>
            <button className="px-8 py-4 rounded-xl border border-white/20 bg-white/5 text-white font-semibold text-lg hover:bg-white/10 backdrop-blur-sm transition-all transform hover:-translate-y-1">
              Report Hazard
            </button>
          </div>
        </div>

        <div className="mt-32">
          <h2 className="text-2xl font-bold text-center mb-12 text-gray-300">Monitoring Five Real Urban Hazard Classes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { icon: AlertCircle, title: 'Potholes & Road Damage', color: 'bg-red-500/10 border-red-500/20 text-red-400' },
              { icon: Trash2, title: 'Garbage & Illegal Dumping', color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' },
              { icon: HardHat, title: 'Unsafe Construction Sites', color: 'bg-orange-500/10 border-orange-500/20 text-orange-400' },
              { icon: TreeDeciduous, title: 'Fallen Trees & Debris', color: 'bg-green-500/10 border-green-500/20 text-green-400' },
              { icon: Zap, title: 'Exposed Electric Lines', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
            ].map((hazard, i) => {
              const Icon = hazard.icon;
              return (
                <div key={i} className={`p-6 rounded-2xl border bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors ${hazard.color.split(' ')[1]}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${hazard.color.split(' ')[0]}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-gray-200">{hazard.title}</h3>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
