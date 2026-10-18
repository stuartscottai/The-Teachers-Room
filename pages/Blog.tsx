import { translateInterfaceText as ui, useInterfaceLanguage as useUiLanguage } from '../utils/interfaceLanguage';
import React from 'react';
import { Link } from 'react-router-dom';
import { getPublicBlogPosts } from '../data/blogPosts';
import { PlayfulHeading } from '../components/PlayfulHeading';
import { BookOpen } from 'lucide-react';

export const Blog: React.FC = () => {
  const { language } = useUiLanguage();
  const publicBlogPosts = getPublicBlogPosts(language);
    return (
        <div className="playful-page playful-blog min-h-screen py-12 sm:py-16">
            <div className="max-w-7xl mx-auto px-4">
                <PlayfulHeading centered icon={<BookOpen size={38} />} title={ui("The Teachers' Blog")} description={ui("Insights, tips, and stories from the education frontier.")} />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {publicBlogPosts.map((post) => (
                        <Link 
                            key={post.id} 
                            to={`/blog/${post.id}`}
                            className="playful-blog-card bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 border border-slate-100 flex flex-col group"
                        >
                            <div className="h-48 overflow-hidden">
                                <img src={post.image} alt={post.title} crossOrigin="anonymous" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                            <div className="p-6 flex-grow">
                                <p className="text-xs font-bold text-brand-blue mb-2">{post.date}</p>
                                <h3 className="font-display text-xl font-bold text-slate-800 mb-3 leading-tight group-hover:text-brand-blue transition-colors">{post.title}</h3>
                                <p className="text-slate-600 text-sm mb-4 line-clamp-3">{post.subtitle}</p>
                            </div>
                            <div className="p-6 pt-0 border-t border-slate-50 mt-auto">
                                <span 
                                    className="text-slate-800 font-bold group-hover:text-brand-blue text-sm transition-colors flex items-center"
                                >
                                    {ui("Read Article →")}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};
