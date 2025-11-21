import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  title: string;
  quote: string;
  image: string;
}

const testimonials: Testimonial[] = Array.from({ length: 10 }).map((_, i) => ({
  id: i,
  name: [`Sarah J.`, `Mike T.`, `Emma W.`, `David L.`, `Jessica R.`, `Tom H.`, `Lisa K.`, `James P.`, `Anna M.`, `Robert B.`][i],
  role: [`ESL Teacher`, `Math Coordinator`, `Primary Teacher`, `Science Head`, `History Teacher`, `Tutor`, `Music Teacher`, `Drama Coach`, `Art Teacher`, `PE Instructor`][i],
  title: ["Game changer!", "Saved my weekend", "Kids love it", "So intuitive", "Brilliant AI", "Fun visuals", "Easy to use", "Great support", "Creative booster", "Lesson planning fix"][i],
  quote: "This platform has completely revolutionized how I prepare for my classes. The AI generation is spot on and saves me hours every week.",
  image: `https://picsum.photos/seed/person${i}/64/64`
}));

export const TestimonialCarousel: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = 300;
      current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group">
      <button 
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white shadow-lg p-3 rounded-full z-10 hidden group-hover:block text-slate-600 hover:text-teal-600 transition-all"
      >
        <ChevronLeft size={24} />
      </button>
      
      <div 
        ref={scrollRef}
        className="flex space-x-6 overflow-x-auto no-scrollbar py-8 px-4 snap-x snap-mandatory"
      >
        {testimonials.map((t) => (
          <div key={t.id} className="snap-center flex-shrink-0 w-80 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
             <div className="flex items-center mb-4">
                <img src={t.image} alt={t.name} className="w-12 h-12 rounded-full mr-4 object-cover" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{t.name}</h4>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">{t.role}</p>
                </div>
             </div>
             <h5 className="font-display font-semibold text-teal-600 mb-2">{t.title}</h5>
             <p className="text-slate-600 text-sm italic">"{t.quote}"</p>
          </div>
        ))}
      </div>

      <button 
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white shadow-lg p-3 rounded-full z-10 hidden group-hover:block text-slate-600 hover:text-teal-600 transition-all"
      >
        <ChevronRight size={24} />
      </button>
    </div>
  );
};
