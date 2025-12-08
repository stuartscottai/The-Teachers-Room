
import React, { useState } from 'react';
import { Check, AlertCircle, Send, Loader } from 'lucide-react';
import { sendContactMessage } from '../utils/gameUtils';

export const Info: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <h1 className="font-display text-4xl font-bold text-slate-800 mb-6">Our Story</h1>
      <div className="prose prose-lg text-slate-600">
        <p className="mb-6">
          The Teachers' Room began in a small, cluttered staff room in 2023. Sarah, an ESL teacher overwhelmed by the sheer volume of lesson planning required for her diverse classes, realized that while she loved teaching, the administrative burden was stealing her joy.
        </p>
        <p className="mb-6">
          She started experimenting with early AI models to generate gap-fill exercises. The results were promising but clunky. She teamed up with a developer friend, and together they refined the prompts and interface specifically for educational contexts.
        </p>
        <p>
          Today, The Teachers' Room is a vibrant community where educators reclaim their weekends, share resources, and bring the joy back into the classroom with engaging, custom-built games and materials.
        </p>
      </div>
    </div>
  );
};

export const Pricing: React.FC = () => {
  return (
    <div className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="font-display text-4xl font-bold text-slate-800 mb-4">Simple Pricing for Heroes</h1>
          <p className="text-slate-600">Choose the plan that fits your classroom needs.</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Free */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-display text-2xl font-bold text-slate-800 mb-2">Starter</h3>
            <p className="text-4xl font-bold text-teal-600 mb-6">$0<span className="text-sm text-slate-400 font-normal">/mo</span></p>
            <ul className="space-y-4 mb-8">
              {['3 AI Games per month', '5 Worksheet generations', 'Access to Community Library', 'Standard Support'].map(item => (
                <li key={item} className="flex items-center text-slate-600">
                  <Check size={18} className="text-teal-500 mr-2" /> {item}
                </li>
              ))}
            </ul>
            <button className="w-full py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:border-teal-500 hover:text-teal-600 transition-colors">Sign Up Free</button>
          </div>

          {/* Pro */}
          <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-brand-yellow relative transform scale-105">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-yellow px-4 py-1 rounded-full text-xs font-bold text-slate-800 uppercase tracking-wide">Best Value</div>
            <h3 className="font-display text-2xl font-bold text-slate-800 mb-2">Teacher Pro</h3>
            <p className="text-4xl font-bold text-teal-600 mb-6">$12<span className="text-sm text-slate-400 font-normal">/mo</span></p>
            <ul className="space-y-4 mb-8">
              {['Unlimited AI Games', 'Unlimited Worksheets', 'Save to Private Library', 'Priority Support', 'Export to PDF/Word'].map(item => (
                <li key={item} className="flex items-center text-slate-800 font-medium">
                  <Check size={18} className="text-brand-accent mr-2" /> {item}
                </li>
              ))}
            </ul>
            <button className="w-full py-3 bg-brand-yellow rounded-xl font-bold text-slate-800 hover:bg-yellow-300 transition-colors shadow-md">Go Pro</button>
          </div>

           {/* School */}
           <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-display text-2xl font-bold text-slate-800 mb-2">School</h3>
            <p className="text-4xl font-bold text-teal-600 mb-6">$99<span className="text-sm text-slate-400 font-normal">/mo</span></p>
            <ul className="space-y-4 mb-8">
              {['10 Teacher Accounts', 'Shared School Library', 'Admin Dashboard', 'Training Session', 'Custom Branding'].map(item => (
                <li key={item} className="flex items-center text-slate-600">
                  <Check size={18} className="text-teal-500 mr-2" /> {item}
                </li>
              ))}
            </ul>
            <button className="w-full py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:border-teal-500 hover:text-teal-600 transition-colors">Contact Sales</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    setStatus('sending');
    setErrorMessage('');

    const result = await sendContactMessage(formData.name, formData.email, formData.message);

    if (result.success) {
        setStatus('success');
        setFormData({ name: '', email: '', message: '' });
    } else {
        setStatus('error');
        setErrorMessage(result.error || "Failed to send message.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-20">
       <h1 className="font-display text-4xl font-bold text-slate-800 mb-8 text-center">Get in Touch</h1>
       <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100 relative overflow-hidden">
          
          {status === 'success' ? (
              <div className="text-center py-12 animate-fade-in">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Check size={40} className="text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Message Sent!</h2>
                  <p className="text-slate-500 mb-8">Thanks for reaching out. We'll get back to you shortly.</p>
                  <button 
                    onClick={() => setStatus('idle')}
                    className="px-6 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Send Another Message
                  </button>
              </div>
          ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {status === 'error' && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-start text-sm">
                        <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-teal-400 outline-none" 
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-teal-400 outline-none" 
                    placeholder="you@school.edu"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                  <textarea 
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-teal-400 outline-none h-32 resize-none"
                    placeholder="How can we help?"
                  ></textarea>
                </div>
                <button 
                    type="submit"
                    disabled={status === 'sending'}
                    className={`w-full py-3 bg-teal-500 text-white rounded-xl font-bold hover:bg-teal-600 transition-colors flex items-center justify-center ${status === 'sending' ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    {status === 'sending' ? (
                        <><Loader size={20} className="mr-2 animate-spin" /> Sending...</>
                    ) : (
                        <><Send size={20} className="mr-2" /> Send Message</>
                    )}
                </button>
              </form>
          )}

          <div className="mt-8 text-center pt-6 border-t border-slate-100">
             <p className="text-slate-500">Or email us directly at:</p>
             <a href="mailto:info@theteachersroom.app" className="text-teal-600 font-bold hover:underline">info@theteachersroom.app</a>
          </div>
       </div>
    </div>
  );
};

export const Legal: React.FC<{type: 'terms' | 'privacy'}> = ({type}) => {
    return (
        <div className="max-w-4xl mx-auto px-4 py-20 prose">
            <h1 className="font-display text-3xl font-bold text-slate-800 capitalize">{type === 'terms' ? 'Terms of Service' : 'Privacy Policy'}</h1>
            <p className="text-slate-600">Last Updated: January 2025</p>
            {type === 'terms' ? (
                <>
                    <p>Welcome to The Teachers' Room. By accessing this website, you agree to be bound by these Terms and Conditions of Use, all applicable laws and regulations.</p>
                    <h3>1. Use License</h3>
                    <p>Permission is granted to temporarily download one copy of the materials (information or software) on The Teachers' Room's website for personal, non-commercial transitory viewing only.</p>
                    <h3>2. Content</h3>
                    <p>User-generated content remains the property of the creator but The Teachers' Room reserves the right to display public content in the community section.</p>
                </>
            ) : (
                 <>
                    <p>Your privacy is important to us. It is The Teachers' Room's policy to respect your privacy regarding any information we may collect from you across our website.</p>
                    <h3>1. Information We Collect</h3>
                    <p>We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent.</p>
                    <h3>2. Data Retention</h3>
                    <p>We only retain collected information for as long as necessary to provide you with your requested service.</p>
                </>
            )}
        </div>
    );
};
