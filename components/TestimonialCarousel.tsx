import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  title: string;
  quote: string;
  image: string;
}

const testimonials: Testimonial[] = [
  {
    id: 0,
    name: 'Sarah J.',
    role: 'ESL Teacher',
    title: 'Perfect for speaking classes',
    quote: 'I can turn a grammar point into a quick classroom game before the lesson starts. It is especially useful when my teens need energy after written work.',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&h=96&q=80'
  },
  {
    id: 1,
    name: 'Mike T.',
    role: 'Math Coordinator',
    title: 'Revision without the drag',
    quote: 'I use it to build quick review games before assessments. The questions are easy to adjust, and the class is much more willing to practise when it feels like a game.',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=96&h=96&q=80'
  },
  {
    id: 2,
    name: 'Emma W.',
    role: 'Primary Teacher',
    title: 'My class asks for the games',
    quote: 'The pupils recognise the game formats now and get started straight away. It has made review lessons feel calmer and more purposeful.',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=96&h=96&q=80'
  },
  {
    id: 3,
    name: 'David L.',
    role: 'Science Head',
    title: 'Great for revision',
    quote: 'Uploading source material and turning it into quiz questions is the part I use most. It helps us revisit key vocabulary without making another slideshow.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=96&h=96&q=80'
  },
  {
    id: 4,
    name: 'Jessica R.',
    role: 'History Teacher',
    title: 'More variety in lessons',
    quote: 'I use it when a topic needs a different rhythm. A quiz round, timeline challenge, or team game can be ready quickly enough to actually use.',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=96&h=96&q=80'
  },
  {
    id: 5,
    name: 'Tom H.',
    role: 'Tutor',
    title: 'Flexible for one-to-one work',
    quote: 'For tutoring, I need resources that match the exact student in front of me. Being able to adjust level, topic, and format makes a big difference.',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=96&h=96&q=80'
  },
  {
    id: 6,
    name: 'Lisa K.',
    role: 'Music Teacher',
    title: 'Quick starter activities',
    quote: 'I use the games as lesson starters and exit checks. They are quick enough to prepare, but still feel more polished than something thrown together.',
    image: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=96&h=96&dpr=2'
  },
  {
    id: 7,
    name: 'James P.',
    role: 'Drama Coach',
    title: 'Easy to share for practice',
    quote: 'The QR code and link sharing are really useful. Students can open a review game at home, practise the key ideas, and come back ready to build on them.',
    image: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=96&h=96&dpr=2'
  },
  {
    id: 8,
    name: 'Anna M.',
    role: 'Art Teacher',
    title: 'Creative without being messy',
    quote: 'I like that I can start from an idea and get something structured. The editable output means I can keep the creative parts and fix anything too generic.',
    image: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=96&h=96&dpr=2'
  },
  {
    id: 9,
    name: 'Robert B.',
    role: 'PE Instructor',
    title: 'Good for theory lessons',
    quote: 'When we cover rules, anatomy, or tactics, the game formats make theory less dry. It helps me check understanding without turning the lesson into a lecture.',
    image: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=96&h=96&dpr=2'
  }
];

const TestimonialAvatar: React.FC<{ testimonial: Testimonial }> = ({ testimonial }) => {
  const [hasImageError, setHasImageError] = useState(false);
  const initials = testimonial.name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .replace(/[^A-Za-z]/g, '')
    .slice(0, 2)
    .toUpperCase();

  if (hasImageError) {
    return (
      <div className="w-12 h-12 rounded-full mr-4 bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={testimonial.image}
      alt={testimonial.name}
      crossOrigin="anonymous"
      onError={() => setHasImageError(true)}
      className="w-12 h-12 rounded-full mr-4 object-cover"
    />
  );
};

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
                <TestimonialAvatar testimonial={t} />
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
