import React from 'react';
import { BlogPost } from '../types';

const blogPosts: BlogPost[] = [
    {
        id: 1,
        title: "AI in the Classroom: Friend or Foe?",
        subtitle: "Exploring the ethical implications and practical benefits of artificial intelligence for modern educators.",
        date: "October 12, 2024",
        content: "Full article content...",
        image: "https://picsum.photos/seed/blog1/600/400"
    },
    {
        id: 2,
        title: "5 Ways to Gamify History Lessons",
        subtitle: "Turn dates and facts into exciting adventures with these simple game structures.",
        date: "October 28, 2024",
        content: "Full article content...",
        image: "https://picsum.photos/seed/blog2/600/400"
    },
    {
        id: 3,
        title: "The End of Grading Homework?",
        subtitle: "How automated feedback tools are giving teachers their weekends back.",
        date: "November 5, 2024",
        content: "Full article content...",
        image: "https://picsum.photos/seed/blog3/600/400"
    },
    {
        id: 4,
        title: "Personalized Learning at Scale",
        subtitle: "Using data to tailor worksheets for every student's unique proficiency level.",
        date: "November 15, 2024",
        content: "Full article content...",
        image: "https://picsum.photos/seed/blog4/600/400"
    },
    {
        id: 5,
        title: "ESL Strategies for 2025",
        subtitle: "New methodologies that focus on immersion and conversation over rote memorization.",
        date: "December 1, 2024",
        content: "Full article content...",
        image: "https://picsum.photos/seed/blog5/600/400"
    }
];

export const Blog: React.FC = () => {
    return (
        <div className="bg-slate-50 min-h-screen py-20">
            <div className="max-w-7xl mx-auto px-4">
                <h1 className="font-display text-4xl font-bold text-slate-800 mb-2 text-center">The Teachers' Blog</h1>
                <p className="text-center text-slate-500 mb-16">Insights, tips, and stories from the education frontier.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {blogPosts.map((post) => (
                        <div key={post.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-slate-100 flex flex-col">
                            <div className="h-48 overflow-hidden">
                                <img src={post.image} alt={post.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                            </div>
                            <div className="p-6 flex-grow">
                                <p className="text-xs font-bold text-teal-600 mb-2">{post.date}</p>
                                <h3 className="font-display text-xl font-bold text-slate-800 mb-3 leading-tight">{post.title}</h3>
                                <p className="text-slate-600 text-sm mb-4">{post.subtitle}</p>
                            </div>
                            <div className="p-6 pt-0 border-t border-slate-50 mt-auto">
                                <button className="text-slate-800 font-bold hover:text-teal-600 text-sm transition-colors">Read Article &rarr;</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
