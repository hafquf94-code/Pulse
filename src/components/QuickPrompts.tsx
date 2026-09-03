import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const QuickPrompts = React.memo(function QuickPrompts({ prompts, onSelect }: { prompts?: string[], onSelect: (prompt: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeft(scrollLeft > 0);
    setShowRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, [prompts]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  if (!prompts || prompts.length === 0) return null;
  
  return (
    <div className="mb-4 relative">
      <p className="text-xs text-[#6b7280] font-semibold mb-3 ml-1">Ask Pulse</p>
      
      <button 
        onClick={() => scroll('left')}
        className={`hidden md:flex absolute left-0 top-[28px] bottom-2 w-8 bg-gradient-to-r from-[#000000] via-[#000000]/80 to-transparent items-center justify-start z-10 text-[#f9fafb] hover:text-[#6366f1] transition-opacity duration-200 ${showLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <ChevronLeft className="w-5 h-5 bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] rounded-full p-0.5" />
      </button>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="grid grid-cols-2 md:flex md:overflow-x-auto gap-2 pb-2 whitespace-normal md:whitespace-nowrap relative" 
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {prompts.map((prompt, i) => (
          <button 
            key={i}
            onClick={() => onSelect(prompt)}
            className="min-h-[44px] px-4 py-2 rounded-2xl md:rounded-full bg-[#000000] hover:bg-[rgba(255,255,255,0.06)] text-xs text-[#f9fafb] border border-[rgba(255,255,255,0.06)] hover:border-[#6366f1]/50 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm font-medium flex-shrink-0 text-left md:text-center h-auto md:h-[44px]"
          >
            {prompt}
          </button>
        ))}
      </div>

      <button 
        onClick={() => scroll('right')}
        className={`hidden md:flex absolute right-0 top-[28px] bottom-2 w-8 bg-gradient-to-l from-[#000000] via-[#000000]/80 to-transparent items-center justify-end z-10 text-[#f9fafb] hover:text-[#6366f1] transition-opacity duration-200 ${showRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <ChevronRight className="w-5 h-5 bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] rounded-full p-0.5" />
      </button>
    </div>
  );
});
export default QuickPrompts;
