import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Share2 } from 'lucide-react';
import { blogPosts } from '../data/blogPosts';
import { BrandName } from '../components/BrandName';

export const BlogPostPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const post = blogPosts.find(p => p.id === Number(id));

    // Scroll to top on load
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    if (!post) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Article not found</h2>
                <Link to="/blog" className="text-brand-blue hover:underline flex items-center">
                    <ArrowLeft size={16} className="mr-2" /> Back to Blog
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white animate-fade-in">
            {/* Hero Section */}
            <div className="relative h-[50vh] min-h-[400px]">
                <img src={post.image} alt={post.title} crossOrigin="anonymous" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
                
                <div className="absolute inset-0 flex flex-col justify-end pb-12 md:pb-20">
                    <div className="max-w-4xl mx-auto px-4 w-full">
                        <Link to="/blog" className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors bg-black/20 hover:bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
                            <ArrowLeft size={18} className="mr-2" /> Back to Blog
                        </Link>
                        <div className="flex items-center space-x-6 text-white/90 mb-4 text-sm md:text-base font-medium">
                            <span className="flex items-center"><Calendar size={16} className="mr-2 text-brand-yellow" /> {post.date}</span>
                            <span className="flex items-center"><User size={16} className="mr-2 text-brand-yellow" /> <BrandName /> Team</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-display font-bold text-white leading-tight mb-4 shadow-black drop-shadow-lg">
                            {post.title}
                        </h1>
                        <p className="text-xl md:text-2xl text-sky-100 font-light max-w-2xl leading-relaxed border-l-4 border-brand-yellow pl-6">
                            {post.subtitle}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <article className="max-w-3xl mx-auto px-4 py-16">
                <div className="prose prose-lg prose-slate prose-headings:font-display prose-headings:font-bold prose-headings:text-slate-800 prose-p:text-slate-600 prose-a:text-brand-blue prose-strong:text-slate-900 max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: post.content }} />
                </div>

                {/* Footer of Article */}
                <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-slate-500 italic text-sm">
                        Posted in Education Strategies
                    </div>
                    <button 
                        className="flex items-center space-x-2 text-slate-600 hover:text-brand-blue transition-colors px-4 py-2 rounded-lg hover:bg-slate-50"
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            alert("Link copied to clipboard!");
                        }}
                    >
                        <Share2 size={18} />
                        <span className="font-bold text-sm">Share Article</span>
                    </button>
                </div>
            </article>
            
            {/* Suggested Readings */}
            <div className="bg-slate-50 py-16 mt-12 border-t border-slate-100">
                <div className="max-w-6xl mx-auto px-4">
                     <h3 className="font-display text-2xl font-bold text-slate-800 mb-8">Read Next</h3>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {blogPosts.filter(p => p.id !== post.id).slice(0, 3).map(related => (
                            <Link to={`/blog/${related.id}`} key={related.id} className="group block bg-white rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden border border-slate-100">
                                <div className="h-48 overflow-hidden">
                                    <img src={related.image} alt={related.title} crossOrigin="anonymous" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                </div>
                                <div className="p-6">
                                    <p className="text-xs font-bold text-teal-600 mb-2">{related.date}</p>
                                    <h4 className="font-bold text-slate-800 mb-2 group-hover:text-teal-600 transition-colors line-clamp-2">{related.title}</h4>
                                    <p className="text-sm text-slate-500 line-clamp-2">{related.subtitle}</p>
                                </div>
                            </Link>
                        ))}
                     </div>
                </div>
            </div>
        </div>
    );
};
