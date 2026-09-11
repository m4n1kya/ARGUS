'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Camera, MapPin, AlertTriangle, ArrowLeft, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ReportPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    
    // Generate a random coordinate within VIT Bhopal / Kothri pilot zone
    // Base: 23.0775 N, 76.8513 E
    const mockLat = 23.0775 + (Math.random() - 0.5) * 0.005; 
    const mockLon = 76.8513 + (Math.random() - 0.5) * 0.005;

    formData.append('lat', mockLat.toString());
    formData.append('lon', mockLon.toString());
    
    if (file) {
      formData.append('image', file);
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/reports', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/map');
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <CheckCircle2 className="w-24 h-24 text-green-500 mb-6 animate-pulse" />
        <h1 className="text-3xl font-bold text-white mb-2">Report Submitted</h1>
        <p className="text-gray-400 text-center mb-8">Your hazard report has been securely ingested into the ARGUS grid.</p>
        <div className="flex items-center gap-2 text-blue-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Routing to Command Centre...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Glassmorphism Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10 px-4 py-4 flex items-center gap-4">
        <Link href="/" className="bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold tracking-wider">NEW HAZARD REPORT</h1>
      </header>

      <div className="max-w-md mx-auto p-4 md:p-6 mt-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Hazard Type Selector */}
          <div className="space-y-3">
            <label className="text-sm font-semibold tracking-widest text-gray-400 uppercase">1. Hazard Classification</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'pothole', label: 'Pothole / Road', color: 'bg-red-500/20 border-red-500/50 text-red-400' },
                { id: 'garbage', label: 'Garbage / Dump', color: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' },
                { id: 'construction', label: 'Unsafe Construction', color: 'bg-orange-500/20 border-orange-500/50 text-orange-400' },
                { id: 'debris', label: 'Fallen Debris', color: 'bg-green-500/20 border-green-500/50 text-green-400' },
                { id: 'exposed_wire', label: 'Exposed Wires', color: 'bg-blue-500/20 border-blue-500/50 text-blue-400' },
              ].map(type => (
                <label key={type.id} className="cursor-pointer relative">
                  <input type="radio" name="hazard_class" value={type.id} required className="peer sr-only" />
                  <div className={`p-4 rounded-xl border border-white/10 bg-white/5 peer-checked:bg-white/10 peer-checked:border-white transition-all text-center text-sm font-medium hover:bg-white/10`}>
                    {type.label}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Location Mock Info */}
          <div className="p-4 rounded-xl bg-blue-900/20 border border-blue-500/30 flex gap-4 items-start">
            <MapPin className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-400 mb-1">GPS Lock Acquired</h3>
              <p className="text-xs text-blue-300/70 leading-relaxed">Your location is automatically clamped to the VIT Bhopal / Kothri pilot zone for this demonstration.</p>
            </div>
          </div>

          {/* Photographic Evidence */}
          <div className="space-y-3">
            <label className="text-sm font-semibold tracking-widest text-gray-400 uppercase">2. Photographic Evidence</label>
            <div className="relative border-2 border-dashed border-white/20 rounded-2xl p-8 hover:bg-white/5 transition-colors group cursor-pointer text-center">
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              />
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                  {file ? <CheckCircle2 className="w-8 h-8 text-green-400" /> : <Camera className="w-8 h-8 text-gray-400" />}
                </div>
                <div className="text-sm font-medium text-gray-300">
                  {file ? file.name : "Tap to capture or upload photo"}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-4 rounded-xl bg-white text-black font-bold text-lg shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-8"
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> INGESTING...</>
            ) : (
              <><Upload className="w-5 h-5" /> SUBMIT TO ARGUS</>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
