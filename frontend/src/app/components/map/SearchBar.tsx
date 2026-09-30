import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { GeocodingProvider, GeocodeResult } from '../../services/geocodingProvider';

interface SearchBarProps {
  onResultSelect: (result: GeocodeResult) => void;
}

export default function SearchBar({ onResultSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    const search = async () => {
      if (query.length < 3) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      const res = await GeocodingProvider.search(query);
      setResults(res);
      setIsSearching(false);
      setIsOpen(true);
    };

    const timer = setTimeout(search, 500);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div ref={wrapperRef} className="absolute top-6 left-6 z-[1000] font-sans w-80">
      <div className="relative">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder="Search location..."
          className="w-full bg-black/80 backdrop-blur-md border border-white/20 rounded-lg py-2.5 pl-10 pr-4 text-xs font-mono tracking-widest text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 shadow-xl"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </div>
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl overflow-hidden">
          {results.map((res) => (
            <button
              key={res.id}
              onClick={() => {
                onResultSelect(res);
                setIsOpen(false);
                setQuery('');
              }}
              className="w-full text-left px-4 py-3 hover:bg-white/10 border-b border-white/5 last:border-0 flex items-start gap-3 transition-colors"
            >
              <MapPin className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              <span className="text-xs font-mono tracking-wide text-white/80 leading-relaxed truncate">
                {res.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
