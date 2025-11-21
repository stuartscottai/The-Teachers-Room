import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, FileText, Clock, Smile, Zap, Star, ArrowRight, Triangle, Circle, Hexagon, Square } from 'lucide-react';
import { TestimonialCarousel } from '../components/TestimonialCarousel';

export const Home: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="overflow-hidden">
      {/* Hero Section - Parallax Effect */}
      <section className="relative min-h-[85vh] flex items-center justify-center bg-brand-blue overflow-hidden">
        
        {/* Background Image Layer with Parallax */}
        <div 
            className="absolute inset-0 z-0 pointer-events-none"
            style={{ 
                transform: `translateY(${scrollY * 0.4}px)`,
                height: '120%', // Extra height for parallax movement
                top: '-10%' // Center the extra height
            }}
        >
            <img 
                src="https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=2070&auto=format&fit=crop" 
                alt="Teacher's Desk Background" 
                className="w-full h-full object-cover opacity-20 mix-blend-overlay filter blur-[1px]"
            />
             {/* Tint Overlay to maintain theme consistency */}
             <div className="absolute inset-0 bg-brand-blue/60" />
        </div>

        {/* Gradient Fade to Solid Blue at Bottom for Seamless Divider */}
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-b from-transparent to-brand-blue z-10" />

        {/* Parallax Shapes */}
        {/* Top Left Cluster */}
        <div className="absolute top-20 left-[10%] text-brand-yellow opacity-80"
             style={{ transform: `translateY(${scrollY * 0.4}px) rotate(${scrollY * 0.1}deg)` }}>
            <Star size={48} fill="currentColor" />
        </div>
        <div className="absolute top-40 left-[5%] text-sky-200 opacity-60"
             style={{ transform: `translateY(${scrollY * 0.2}px) rotate(${scrollY * -0.2}deg)` }}>
             <Circle size={32} fill="currentColor" />
        </div>
        
        {/* Top Right Cluster */}
        <div className="absolute top-24 right-[15%] text-white opacity-30"
             style={{ transform: `translateY(${scrollY * -0.1}px) rotate(${scrollY * 0.1}deg)` }}>
             <Hexagon size={80} strokeWidth={1.5} />
        </div>
        <div className="absolute top-10 right-[5%] text-brand-accent opacity-90"
             style={{ transform: `translateY(${scrollY * 0.3}px) rotate(${scrollY * 0.2}deg)` }}>
             <Triangle size={56} fill="currentColor" className="rotate-12" />
        </div>

        {/* Middle Floating */}
        <div className="absolute top-1/2 left-[2%] text-white opacity-40"
             style={{ transform: `translateY(${scrollY * 0.15}px) rotate(45deg)` }}>
             <Square size={64} fill="currentColor" />
        </div>
        <div className="absolute top-1/3 right-[25%] text-brand-yellow opacity-50"
             style={{ transform: `translateY(${scrollY * -0.2}px)` }}>
             <Zap size={40} fill="currentColor" />
        </div>

        {/* Bottom Cluster */}
        <div className="absolute bottom-32 left-[15%] text-sky-200 opacity-80"
             style={{ transform: `translateY(${scrollY * 0.1}px) rotate(${scrollY * -0.1}deg)` }}>
             <Smile size={72} />
        </div>
        <div className="absolute bottom-20 right-[10%] text-white opacity-20"
             style={{ transform: `translateY(${scrollY * 0.25}px) rotate(${scrollY * 0.1}deg)` }}>
             <Hexagon size={120} fill="currentColor" />
        </div>
         <div className="absolute bottom-40 right-[40%] text-sky-100 opacity-30"
             style={{ transform: `translateY(${scrollY * -0.05}px) rotate(15deg)` }}>
             <Triangle size={30} strokeWidth={3} />
        </div>


        {/* Main Content */}
        <div className="relative z-20 text-center max-w-5xl mx-auto px-4 mt-10">
          
          <h1 className="font-display text-6xl md:text-8xl font-black text-white mb-8 leading-tight drop-shadow-md">
            <span className="inline-block transform -rotate-3 hover:rotate-0 transition-transform duration-300 text-sky-100 mr-4">The</span>
            <span className="relative inline-block mr-4">
                <span className="relative z-10">Teachers'</span>
                {/* Stylish highlight behind text */}
                <svg className="absolute w-[110%] h-[60%] -bottom-2 -left-[5%] z-0 text-brand-accent opacity-90" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0,50 Q50,100 100,50" stroke="currentColor" strokeWidth="80" fill="none" />
                </svg>
            </span>
            <span className="inline-block transform rotate-3 hover:rotate-0 transition-transform duration-300 text-sky-100">Room</span>
          </h1>

          <p className="text-xl md:text-2xl text-sky-50 mb-12 font-medium max-w-3xl mx-auto leading-relaxed drop-shadow-sm">
            The ultimate playground for educators. Create AI-powered games and worksheets in seconds.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            <Link 
                to="/games" 
                className="group px-8 py-4 bg-white text-sky-700 font-bold text-lg rounded-full shadow-lg hover:shadow-2xl hover:bg-sky-50 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3"
            >
                <div className="bg-brand-yellow text-slate-900 rounded-full p-1 group-hover:rotate-12 transition-transform">
                    <Play size={16} fill="currentColor" />
                </div>
                Start Playing
            </Link>
            <Link 
                to="/worksheets" 
                className="group px-8 py-4 bg-transparent border-2 border-white text-white font-bold text-lg rounded-full hover:bg-white/10 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3"
            >
                <FileText size={20} className="group-hover:scale-110 transition-transform" /> 
                Create Worksheets
            </Link>
          </div>
        </div>
      </section>

      {/* Popular Games */}
      <section className="relative py-20 bg-white z-20">
        {/* Wave Divider (Blue hanging down) */}
        <div className="absolute top-0 left-0 w-full overflow-hidden leading-none z-20 transform -translate-y-[1px]">
             <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-[calc(100%+1.3px)] h-[60px] text-brand-blue fill-current">
                <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
            </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 pt-12">
            <h2 className="font-display text-3xl font-bold text-center text-slate-800 mb-12">
                <span className="border-b-4 border-brand-yellow pb-2">Trending Games</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {['Jeopardy Extreme', 'Phonics Snakes', 'History Trivia', 'Math Darts', 'Grammar Quiz'].map((game, idx) => (
                    <Link to="/games" key={idx} className="group block">
                        <div className="bg-slate-50 rounded-xl overflow-hidden shadow-sm group-hover:shadow-xl hover:shadow-sky-200 transition-all border border-slate-100">
                            <div className="h-32 bg-slate-200 relative overflow-hidden">
                                <img src={`https://picsum.photos/seed/game${idx}/300/200`} alt={game} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-sky-900/10 group-hover:bg-transparent transition-colors" />
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-slate-700 group-hover:text-sky-600 transition-colors">{game}</h3>
                                <p className="text-xs text-slate-400 mt-1">2.5k plays this week</p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
      </section>

      {/* Recent Worksheets - Yellow Background with Blue Parallax Symbols */}
      <section className="relative py-24 bg-brand-yellow overflow-hidden">
        {/* Parallax Background Symbols */}
        <div className="absolute top-20 left-10 text-brand-blue opacity-20"
             style={{ transform: `translateY(${(scrollY - 800) * 0.15}px) rotate(${scrollY * 0.1}deg)` }}>
             <Star size={80} fill="currentColor" />
        </div>
        <div className="absolute top-40 right-[10%] text-sky-600 opacity-25"
             style={{ transform: `translateY(${(scrollY - 800) * -0.1}px) rotate(${scrollY * -0.05}deg)` }}>
             <Hexagon size={100} strokeWidth={2} />
        </div>
        <div className="absolute bottom-20 left-[20%] text-brand-blue opacity-15"
             style={{ transform: `translateY(${(scrollY - 1200) * 0.1}px) rotate(45deg)` }}>
             <Square size={60} fill="currentColor" />
        </div>
        <div className="absolute bottom-10 right-10 text-sky-700 opacity-20"
             style={{ transform: `translateY(${(scrollY - 1200) * -0.15}px)` }}>
             <Circle size={50} strokeWidth={4} />
        </div>
        <div className="absolute top-1/2 left-1/2 text-white opacity-30"
             style={{ transform: `translateY(${(scrollY - 1000) * 0.05}px) rotate(${scrollY * 0.2}deg)` }}>
             <Triangle size={120} className="rotate-180" />
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
            <h2 className="font-display text-3xl font-bold text-center text-slate-900 mb-12">
                <span className="border-b-4 border-brand-blue pb-2">Fresh Worksheets</span>
            </h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 {['Present Perfect Simple', 'Photosynthesis Matching', 'French Vocab Search'].map((ws, idx) => (
                    <div key={idx} className="flex items-start space-x-4 bg-white p-6 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-yellow-200 group">
                        <div className="bg-sky-100 p-3 rounded-lg text-sky-600 group-hover:bg-brand-blue group-hover:text-white transition-colors">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">{ws}</h3>
                            <p className="text-sm text-slate-500 mb-2">Created 2 hours ago by Teacher{idx+1}</p>
                            <Link to="/worksheets" className="text-sm font-semibold text-brand-blue hover:text-sky-800 flex items-center">
                                View Resource <ArrowRight size={14} className="ml-1" />
                            </Link>
                        </div>
                    </div>
                 ))}
             </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-white relative z-10">
         <div className="max-w-7xl mx-auto px-4">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                 {[
                     { icon: Clock, title: "Less Prep", desc: "Cut planning time in half with AI generation." },
                     { icon: Smile, title: "More Fun", desc: "Engage students with interactive formats." },
                     { icon: Star, title: "High Quality", desc: "Curriculum-aligned content every time." },
                     { icon: Zap, title: "Instant Use", desc: "No signup required to try basic tools." }
                 ].map((feature, idx) => (
                     <div key={idx} className="text-center group">
                         <div className="w-20 h-20 mx-auto bg-brand-yellow rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-yellow-100 border-2 border-transparent group-hover:border-brand-blue">
                             <feature.icon size={32} className="text-slate-800" />
                         </div>
                         <h3 className="font-display text-xl font-bold text-slate-800 mb-3">{feature.title}</h3>
                         <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                     </div>
                 ))}
             </div>
         </div>
      </section>

      {/* Testimonials - Parallax Effects */}
      <section className="py-24 bg-brand-blue text-white relative overflow-hidden">
          {/* Animated Decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
               <div className="absolute -top-20 -right-20 opacity-10 text-white"
                    style={{ transform: `translateY(${(scrollY - 2000) * 0.1}px)` }}>
                   <Circle size={400} />
               </div>
               <div className="absolute bottom-20 left-10 opacity-10 text-brand-yellow"
                    style={{ transform: `translateY(${(scrollY - 2200) * -0.15}px) rotate(${scrollY * 0.05}deg)` }}>
                   <Triangle size={200} fill="currentColor" />
               </div>
               <div className="absolute top-1/3 left-10 opacity-10 text-sky-300"
                    style={{ transform: `translateY(${(scrollY - 2000) * 0.05}px) rotate(${scrollY * -0.1}deg)` }}>
                   <Star size={100} fill="currentColor" />
               </div>
               <div className="absolute bottom-1/4 right-20 opacity-5 text-white"
                    style={{ transform: `translateY(${(scrollY - 2000) * -0.08}px) rotate(45deg)` }}>
                   <Square size={150} fill="currentColor" />
               </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 relative z-10">
              <h2 className="font-display text-4xl font-bold text-center text-white mb-4 drop-shadow-md">
                  Reasons why teachers love us
              </h2>
              <p className="text-center text-sky-100 mb-12 text-lg">Join thousands of happy educators transforming their classrooms.</p>
              <TestimonialCarousel />
          </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 text-center">
              <h2 className="font-display text-4xl font-bold text-slate-800 mb-8">Ready to gamify your class?</h2>
              <Link 
                to="/games"
                className="inline-flex items-center px-10 py-5 bg-brand-blue text-white text-xl font-bold rounded-full hover:bg-sky-600 transition-colors shadow-xl hover:shadow-2xl shadow-sky-200"
              >
                  Go to Games <ArrowRight className="ml-3" />
              </Link>
          </div>
      </section>
    </div>
  );
};
