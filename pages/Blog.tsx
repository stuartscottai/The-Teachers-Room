import React from 'react';
import { Link } from 'react-router-dom';
import { blogPosts } from '../data/blogPosts';

export const Blog: React.FC = () => {
    return (
        <div className="bg-slate-50 min-h-screen py-20">
            <div className="max-w-7xl mx-auto px-4">
                <h1 className="font-display text-4xl font-bold text-slate-800 mb-2 text-center">The Teachers' Blog</h1>
                <p className="text-center text-slate-500 mb-16">Insights, tips, and stories from the education frontier.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {blogPosts.map((post) => (
                        <Link 
                            key={post.id} 
                            to={`/blog/${post.id}`}
                            className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 flex flex-col group"
                        >
                            <div className="h-48 overflow-hidden">
                                <img src={post.image} alt={post.title} crossOrigin="anonymous" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                            <div className="p-6 flex-grow">
                                <p className="text-xs font-bold text-teal-600 mb-2">{post.date}</p>
                                <h3 className="font-display text-xl font-bold text-slate-800 mb-3 leading-tight group-hover:text-teal-600 transition-colors">{post.title}</h3>
                                <p className="text-slate-600 text-sm mb-4 line-clamp-3">{post.subtitle}</p>
                            </div>
                            <div className="p-6 pt-0 border-t border-slate-50 mt-auto">
                                <span 
                                    className="text-slate-800 font-bold group-hover:text-teal-600 text-sm transition-colors flex items-center"
                                >
                                    Read Article &rarr;
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};
