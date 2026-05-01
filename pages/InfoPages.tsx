
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, AlertCircle, Send, Loader, ChevronDown, X, Search } from 'lucide-react';
import { sendContactMessage } from '../utils/gameUtils';
import { BrandName } from '../components/BrandName';
import { useAuth } from '../contexts/AuthContext';
import { AccountType } from '../types';
import { promptSignupForFree } from '../services/accountAccess';

export const Info: React.FC = () => {
  type SectionKey = 'story' | 'how-to' | 'prompt-guide' | 'faqs';
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    story: true,
    'how-to': false,
    'prompt-guide': false,
    faqs: false,
  });
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const faqs = [
    {
      question: 'Which game types are available right now?',
      answer: 'You can create Snakes and Ladders, Trivia Quiz, Jeopardy, Pub Quiz, Darts, Millionaire Maker, Time Bomb, Survey Showdown, Stop the Fire!, Word Wheel, and Live Quiz Challenge.'
    },
    {
      question: 'How does Live Quiz Challenge work?',
      answer: 'Live Quiz Challenge lets a teacher host a real-time quiz on the big screen while students join from their own devices using a code or QR link. It currently works with auto-scored multiple-choice questions, shows answer reveals, and finishes with a live leaderboard.'
    },
    {
      question: 'Can I create a game manually without AI?',
      answer: 'Yes. Most game modes let you choose Manual Creation and build from scratch in the editor. AI mode is for speed; manual mode is for full control.'
    },
    {
      question: 'Can I use my own AI tool to make a game?',
      answer: 'Yes. In manual game creation, use "Import from Another AI Tool" to copy our custom prompt template, paste it into your preferred LLM, then import the returned JSON here.'
    },
    {
      question: 'Can I upload a photo/PDF from my book and generate from that?',
      answer: 'Yes. In Games, you can upload source files (up to 3 files, 4MB each). The AI then uses those files to build content instead of guessing from thin air.'
    },
    {
      question: 'Can students play review games at home?',
      answer: 'Yes. Saved games can be shared with students by link or QR code, so they can open a review game outside class without needing to build anything themselves.'
    },
    {
      question: 'Do students need teacher accounts to use shared games?',
      answer: 'No. Student share links are designed for playing/reviewing a specific game. Teacher account features such as creating, saving, editing, and school admin tools stay separate.'
    },
    {
      question: 'Do students need accounts to join a live quiz?',
      answer: 'No. Students can join a Live Quiz Challenge with the code or QR link shown by the teacher. They do not need a teacher account to take part.'
    },
    {
      question: 'What do School accounts include?',
      answer: 'School accounts let admins manage teacher spots, invite or approve teachers, monitor teacher activity such as games created/played and AI generations, and use shared school document storage.'
    },
    {
      question: 'Can school admins see what teachers are doing?',
      answer: 'School admins can see school-level usage information such as teacher status, games created, game play activity, and AI generation counts. This is intended for account management and support, not student surveillance.'
    },
    {
      question: 'How does school document sharing work?',
      answer: 'School accounts include shared school storage where members can keep documents and resources for the school. Admins can organise and manage the shared space.'
    },
    {
      question: 'Do voice prompts work?',
      answer: 'Yes. The AI instructions box in Games has a mic button, and the Game AI Assistant chat also supports dictation.'
    },
    {
      question: 'How do images work in Games?',
      answer: 'When you enable images and choose auto-pick, the system picks stock images based on AI-generated question/answer keywords. You cannot currently art-direct the image style in the prompt; you can replace images later in the game editor.'
    },
    {
      question: 'Can I choose or upload my own game images?',
      answer: 'Yes. In the game editor you can pick stock images manually or upload your own image per question.'
    },
    {
      question: 'Can I edit everything after generation?',
      answer: 'Absolutely. You can edit questions, answers, options, images, rounds, activity settings, layout, and design elements before class use.'
    },
    {
      question: 'Why did my output feel generic or miss the point?',
      answer: 'Usually the brief was too broad. Add level, age, objective, question count, topic boundaries, and any must-include language points.'
    },
    {
      question: 'Can I save, reuse, and remix my best materials?',
      answer: 'Yes. Save to My Library, copy from Community into your own version, and reuse your strongest prompt structures as templates.'
    },
    {
      question: 'What should I do if generation fails or feels slow?',
      answer: 'Try a shorter prompt, reduce activity/question count, or regenerate once. If it keeps failing, include your prompt + source context when contacting support.'
    }
  ];

  const toggleSection = (section: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const searchableSections: Array<{ type: 'section'; section: SectionKey; title: string; body: string }> = [
    {
      type: 'section',
      section: 'story',
      title: 'Our Story',
      body: 'How The Teachers Room started, ESL teaching, classroom games, prep time, surprise lesson time, coursebook photos, quick game creation.'
    },
    {
      type: 'section',
      section: 'how-to',
      title: 'How to Use the Site',
      body: 'Create games, manual mode, AI mode, upload files, source materials, images, editor, save to library, student share links, QR codes, Live Quiz Challenge.'
    },
    {
      type: 'section',
      section: 'prompt-guide',
      title: 'Prompt Guide',
      body: 'Prompt writing, AI instructions, level, age, objective, question count, source files, image prompts, specific classroom needs.'
    },
    {
      type: 'section',
      section: 'faqs',
      title: 'FAQs',
      body: 'Frequently asked questions about games, school accounts, student accounts, live quiz, images, AI generation, editing, sharing, saving, remixing.'
    }
  ];

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const searchTerms = normalizedSearch.split(/\s+/).filter(Boolean);
  const searchResults = useMemo(() => {
    if (!searchTerms.length) return [];

    const matchesAllTerms = (text: string) => {
      const searchableText = text.toLowerCase();
      return searchTerms.every((term) => searchableText.includes(term));
    };

    const sectionResults = searchableSections
      .filter((entry) => matchesAllTerms(`${entry.title} ${entry.body}`))
      .map((entry) => ({
        type: entry.type,
        section: entry.section,
        title: entry.title,
        snippet: entry.body
      }));

    const faqResults = faqs
      .map((faq, index) => ({ faq, index }))
      .filter(({ faq }) => matchesAllTerms(`${faq.question} ${faq.answer}`))
      .map(({ faq, index }) => ({
        type: 'faq' as const,
        section: 'faqs' as SectionKey,
        faqIndex: index,
        title: faq.question,
        snippet: faq.answer
      }));

    return [...sectionResults, ...faqResults].slice(0, 8);
  }, [searchTerms.join('|')]);

  const handleSearchResultClick = (result: (typeof searchResults)[number]) => {
    setOpenSections((prev) => ({ ...prev, [result.section]: true }));
    if (result.type === 'faq') {
      setOpenFaq(result.faqIndex);
    }

    window.setTimeout(() => {
      document.getElementById(`info-${result.section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-20">
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl font-bold text-slate-800 mb-3">Info Hub</h1>
        <p className="text-slate-600 max-w-3xl mx-auto">
          Explore how to get the best from <BrandName />, from quick setup tips to detailed prompt strategy and practical FAQs.
        </p>
      </div>

      <div className="mb-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <label htmlFor="info-search" className="block text-sm font-bold text-slate-700 mb-2">
          Search the Info Hub
        </label>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            id="info-search"
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search live quiz, images, student links, school accounts..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-12 text-slate-800 outline-none transition focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-sky-100"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {normalizedSearch && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            {searchResults.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  {searchResults.length} result{searchResults.length === 1 ? '' : 's'}
                </p>
                {searchResults.map((result) => (
                  <button
                    key={`${result.type}-${result.title}`}
                    type="button"
                    onClick={() => handleSearchResultClick(result)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-brand-blue hover:bg-sky-50"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-800">{result.title}</span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                        {result.type === 'faq' ? 'FAQ' : 'Guide'}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{result.snippet}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No matching help topics found. Try a shorter search, or use the Contact page if you need a specific answer.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <button
            type="button"
            onClick={() => toggleSection('story')}
            className="w-full px-6 py-5 text-left flex items-center justify-between"
            aria-expanded={openSections.story}
            aria-controls="info-story"
          >
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-800">Our Story</h2>
              <p className="text-sm text-slate-500 mt-1">How <BrandName /> started and where we are today.</p>
            </div>
            <ChevronDown className={`text-slate-500 transition-transform ${openSections.story ? 'rotate-180' : ''}`} />
          </button>
          {openSections.story && (
            <div id="info-story" className="px-6 pb-6 pt-1 border-t border-slate-100 prose prose-slate max-w-none">
              <p>
                I am Stuart, an ESL teacher in Valencia, and I have spent around 20 years teaching pretty much every level and age group you can imagine.
                Over time, one thing became obvious: students come alive with games.
                Energy goes up, speaking improves, and revision suddenly stops feeling like punishment.
              </p>
              <p>
                The problem was prep time.
                Building quality games from scratch took forever, and many ready-made resources never matched what I was actually teaching that day.
                I wanted something flexible enough to follow real classroom life, not the other way around.
              </p>
              <p>
                Dream scenario: you discover you have a surprise 15 minutes at the end of class, snap a quick photo of the coursebook page, upload it, and boom, instant game.
                So that is what I built.
                <BrandName /> grew from that exact moment: a slightly sleep-deprived teacher dream, a lot of trial and error, and a stubborn belief that teachers deserve tools as fast and adaptable as their classrooms.
              </p>
              <p>
                The goal is simple: keep the joy, lose the admin drag, and make it easier to create engaging materials whenever inspiration (or panic) strikes.
              </p>
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <button
            type="button"
            onClick={() => toggleSection('how-to')}
            className="w-full px-6 py-5 text-left flex items-center justify-between"
            aria-expanded={openSections['how-to']}
            aria-controls="info-how-to"
          >
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-800">How to Use the Site</h2>
              <p className="text-sm text-slate-500 mt-1">The real workflow, with fewer headaches and more "nice, that actually worked".</p>
            </div>
            <ChevronDown className={`text-slate-500 transition-transform ${openSections['how-to'] ? 'rotate-180' : ''}`} />
          </button>
          {openSections['how-to'] && (
            <div id="info-how-to" className="px-6 pb-6 pt-1 border-t border-slate-100 text-slate-600">
              <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 mt-4">
                <h3 className="font-bold text-slate-800 mb-3">Games: from idea to classroom in minutes</h3>
                <ol className="list-decimal pl-5 space-y-2 text-sm">
                  <li>Open <strong>Games</strong> and pick a mode: Snakes & Ladders, Trivia, Jeopardy, Pub Quiz, Darts, Millionaire, Time Bomb, Survey Showdown, Stop the Fire, Word Wheel, or Live Quiz Challenge.</li>
                  <li>If you are not sure where to start, open the <strong>AI Assistant</strong>, explain your idea in plain English, and it will recommend suitable game types based on your class and goals.</li>
                  <li>Choose <strong>Manual</strong> (build from scratch) or <strong>AI</strong> (instant first draft).</li>
                  <li>In Manual mode, open <strong>Import from Another AI Tool</strong> if you want to use your own LLM. Copy the custom prompt template, paste it into your AI tool, then import the returned JSON.</li>
                  <li>In AI mode, add a topic and optional instructions. You can type or use the mic dictation button.</li>
                  <li>Optional but powerful: upload source files (PDF/images, max 3 files, 4MB each) so AI uses your actual material.</li>
                  <li>If you enable images, <strong>Auto-pick</strong> grabs stock visuals from question/answer keywords, or choose <strong>Pick later</strong> and add them manually in the editor.</li>
                  <li>Generate, then polish in the editor: fix wording, change answers, replace images, save to library, and hit Play.</li>
                  <li>For whole-class play, use <strong>Live Quiz Challenge</strong> so students can join with a code or QR link and answer from their own devices.</li>
                  <li>For independent review, share a saved game with students using a link or QR code so they can practise outside class.</li>
                </ol>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mt-4">
                <h3 className="font-bold text-slate-800 mb-3">School accounts: manage teachers and shared resources</h3>
                <ol className="list-decimal pl-5 space-y-2 text-sm">
                  <li>Create a <strong>School</strong> plan, add your school name, and open the School Admin dashboard.</li>
                  <li>Invite teachers or approve join requests, then manage teacher spots and active/inactive access.</li>
                  <li>Monitor useful school activity such as games created, game play activity, and AI generation usage.</li>
                  <li>Use shared school storage for documents and resources that school members need to access.</li>
                </ol>
              </div>
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <button
            type="button"
            onClick={() => toggleSection('prompt-guide')}
            className="w-full px-6 py-5 text-left flex items-center justify-between"
            aria-expanded={openSections['prompt-guide']}
            aria-controls="info-prompt-guide"
          >
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-800">Prompt Guide</h2>
              <p className="text-sm text-slate-500 mt-1">Friendly prompt coaching: less robot confusion, more classroom-ready wins.</p>
            </div>
            <ChevronDown className={`text-slate-500 transition-transform ${openSections['prompt-guide'] ? 'rotate-180' : ''}`} />
          </button>
          {openSections['prompt-guide'] && (
            <div id="info-prompt-guide" className="px-6 pb-6 pt-1 border-t border-slate-100 text-slate-600">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4">
                <h3 className="font-bold text-slate-800 mb-3">The Magic Prompt Recipe</h3>
                <p className="text-sm mb-3">AI is clever, but not psychic. Give it these ingredients:</p>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li><strong>Who:</strong> age + level (for example, "A2 teens").</li>
                  <li><strong>What:</strong> precise objective (for example, "past simple negatives").</li>
                  <li><strong>Format:</strong> game type, question count, and answer style.</li>
                  <li><strong>Boundaries:</strong> must include / must avoid.</li>
                  <li><strong>Practical limits:</strong> class time, difficulty, tone.</li>
                  <li><strong>Source anchor:</strong> if you uploaded files, explicitly tell AI to use them.</li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-4">
                <h3 className="font-bold text-slate-800 mb-2">Important Image Truth (so nobody gets surprised)</h3>
                <p className="text-sm">
                  In Games, image auto-pick uses question/answer keywords generated by AI. It does <strong>not</strong> currently take a separate art-direction prompt like
                  "make it watercolor in Pixar style." If you need a very specific visual, generate first, then replace images manually in the editor.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                  <h4 className="font-bold text-emerald-700 mb-2">Good Game Prompt</h4>
                  <p className="text-sm leading-relaxed">
                    "A2 ESL students (age 12-13). Use the attached book-page photo as the main source.
                    Create a 15-question Trivia game for a 15-minute end-of-class review.
                    Focus on food vocabulary + countable/uncountable nouns.
                    Keep questions short, classroom-safe, and include 4 multiple-choice options."
                  </p>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                  <h4 className="font-bold text-rose-700 mb-2">Weak Game Prompt</h4>
                  <p className="text-sm leading-relaxed">
                    "Make me a game from this."
                  </p>
                </div>
              </div>

            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <button
            type="button"
            onClick={() => toggleSection('faqs')}
            className="w-full px-6 py-5 text-left flex items-center justify-between"
            aria-expanded={openSections.faqs}
            aria-controls="info-faqs"
          >
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-800">FAQs</h2>
              <p className="text-sm text-slate-500 mt-1">Common questions from teachers using games, student review links, and school accounts.</p>
            </div>
            <ChevronDown className={`text-slate-500 transition-transform ${openSections.faqs ? 'rotate-180' : ''}`} />
          </button>
          {openSections.faqs && (
            <div id="info-faqs" className="px-6 pb-6 pt-1 border-t border-slate-100">
              <p className="text-sm text-slate-500 mt-4">Click each question to reveal its answer.</p>
              <div className="mt-4 space-y-3">
                {faqs.map((faq, index) => (
                  <div key={faq.question} className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaq((prev) => (prev === index ? null : index))}
                      className="w-full px-4 py-3 bg-slate-50 text-left flex items-center justify-between"
                      aria-expanded={openFaq === index}
                    >
                      <span className="font-semibold text-slate-800 text-sm md:text-base">{faq.question}</span>
                      <ChevronDown className={`text-slate-500 transition-transform flex-shrink-0 ml-3 ${openFaq === index ? 'rotate-180' : ''}`} size={18} />
                    </button>
                    {openFaq === index && (
                      <div className="px-4 py-4 text-sm text-slate-600 bg-white border-t border-slate-100">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handlePlanCta = (targetPlan: AccountType) => {
    if (!user) {
      promptSignupForFree(
        targetPlan === 'free'
          ? 'Create a free account on the Teacher Plan to save and share your classroom games.'
          : `Create a free account on the Teacher Plan first, then choose ${targetPlan === 'teacher' ? 'Teacher Plan' : 'School Plan'}.`
      );
      return;
    }

    navigate('/change-plan', { state: { targetPlan } });
  };

  return (
    <div className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="font-display text-4xl font-bold text-slate-800 mb-4">Early Access For Teachers</h1>
          <p className="text-slate-600">The Teacher Plan and School Plan are free during early access, and no credit card information is required to sign up.</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Free */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-display text-2xl font-bold text-slate-800 mb-2">Starter</h3>
            <p className="text-4xl font-bold text-teal-600 mb-6">$0<span className="text-sm text-slate-400 font-normal">/mo</span></p>
            <ul className="space-y-4 mb-8">
              {['Use all manual creation tools', 'Import games from your own LLM using our template', 'Save and share games', 'Community library browsing', 'Built-in AI generation not included'].map(item => (
                <li key={item} className="flex items-center text-slate-600">
                  {item.includes('not included') ? (
                    <X size={18} className="text-red-500 mr-2 shrink-0" />
                  ) : (
                    <Check size={18} className="text-teal-500 mr-2 shrink-0" />
                  )}
                  {item}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => handlePlanCta('free')}
              className="w-full py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:border-teal-500 hover:text-teal-600 transition-colors"
            >
              Sign Up Free
            </button>
          </div>

          {/* Pro */}
          <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-brand-yellow relative transform scale-105">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-yellow px-4 py-1 rounded-full text-xs font-bold text-slate-800 uppercase tracking-wide">Recommended</div>
            <h3 className="font-display text-2xl font-bold text-slate-800 mb-2">Teacher Plan</h3>
            <p className="text-4xl font-bold text-teal-600 mb-1">$0<span className="text-sm text-slate-400 font-normal">/mo</span></p>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-6">free during early access</p>
            <ul className="space-y-4 mb-8">
              {['Credits for approximately 50 AI-created games per month', 'Unlimited manual game creation', 'Unlimited private library storage', 'No credit card information required to sign up'].map(item => (
                <li key={item} className="flex items-center text-slate-800 font-medium">
                  <Check size={18} className="text-brand-accent mr-2 shrink-0" /> {item}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => handlePlanCta('teacher')}
              className="w-full py-3 bg-brand-yellow rounded-xl font-bold text-slate-800 hover:bg-yellow-300 transition-colors shadow-md"
            >
              Activate Teacher Plan
            </button>
          </div>

           {/* School */}
           <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-display text-2xl font-bold text-slate-800 mb-2">School Plan</h3>
            <p className="text-4xl font-bold text-teal-600 mb-1">$0<span className="text-sm text-slate-400 font-normal">/mo</span></p>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-6">free during early access</p>
            <ul className="space-y-4 mb-8">
              {['AI game credits for each teacher account', 'Minimum 5 teacher seats', 'School-level teacher spot allocation', 'School admin dashboard', 'Shared school resource management', '100 MB shared school storage'].map(item => (
                <li key={item} className="flex items-center text-slate-600">
                  <Check size={18} className="text-teal-500 mr-2 shrink-0" /> {item}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => handlePlanCta('school')}
              className="w-full py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:border-teal-500 hover:text-teal-600 transition-colors"
            >
              Set Up School Plan
            </button>
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

       </div>
    </div>
  );
};

export const Legal: React.FC<{type: 'terms' | 'privacy'}> = ({type}) => {
    const lastUpdated = 'February 27, 2026';

    if (type === 'terms') {
        return (
            <div className="max-w-4xl mx-auto px-4 py-20 prose prose-slate">
                <h1 className="font-display text-3xl font-bold text-slate-800">Terms of Service</h1>
                <p className="text-slate-600">Last Updated: {lastUpdated}</p>

                <p>
                    Welcome to <BrandName />. We built this platform to make classroom prep faster, better, and less stressful.
                    These Terms are the ground rules for using the site.
                    By accessing or using <BrandName />, you agree to these Terms and our Privacy Policy.
                </p>

                <h3>1. Who Can Use the Service</h3>
                <ul>
                    <li>You must be 18 years of age or older to create an account or directly use the service.</li>
                    <li>If you use the service for a school or company, you confirm you are allowed to accept these Terms on their behalf.</li>
                    <li>The platform is designed for teachers/professional users. Students under 18 should not directly use the platform account features.</li>
                </ul>

                <h3>2. Accounts and Security</h3>
                <ul>
                    <li>You are responsible for keeping your login credentials secure.</li>
                    <li>You are responsible for activity under your account unless required otherwise by law.</li>
                    <li>Please provide accurate information and keep it up to date.</li>
                    <li>We may suspend accounts that are compromised, abusive, or clearly fake.</li>
                </ul>

                <h3>3. What the Service Does</h3>
                <p>
                    <BrandName /> helps you create games using manual tools and AI-assisted generation.
                    Features may include saving content, publishing to community libraries, image search/selection, and optional voice dictation support.
                </p>

                <h3>4. Acceptable Use (Please Do Not Be a Villain)</h3>
                <p>You agree not to:</p>
                <ul>
                    <li>Break any law, regulation, or third-party right.</li>
                    <li>Upload or share content you do not have rights to use.</li>
                    <li>Upload personal/sensitive student data without proper legal basis, notice, and consent where required.</li>
                    <li>Use the service to create harmful, discriminatory, abusive, or illegal content.</li>
                    <li>Attempt to reverse engineer, disrupt, scrape, overload, or bypass service protections.</li>
                    <li>Upload malware, malicious code, or content that interferes with platform operation.</li>
                </ul>

                <h3>5. Your Content and Permissions</h3>
                <ul>
                    <li>You keep ownership of the content you create and upload.</li>
                    <li>You grant us a worldwide, non-exclusive, royalty-free license to host, store, process, reproduce, and display that content to operate and improve the service.</li>
                    <li>If you mark content as public/community, you allow us to display it and allow other users to view, copy, and remix it inside the platform.</li>
                    <li>You confirm you have all rights and permissions needed for anything you upload.</li>
                </ul>

                <h3>6. AI Outputs and Teacher Responsibility</h3>
                <ul>
                    <li>AI can be impressive and occasionally confidently wrong. Please review all generated content before classroom use.</li>
                    <li>You are responsible for checking factual accuracy, level appropriateness, and safety.</li>
                    <li>We do not guarantee generated content is unique, error-free, or infringement-free.</li>
                    <li>We may apply safety or quality controls to AI features at any time.</li>
                </ul>

                <h3>7. Third-Party Services</h3>
                <p>
                    Some features rely on third-party providers, including Supabase (auth/database/storage), Google Gemini API (AI generation),
                    and Pixabay (stock image search). Your use of those integrated services may also be subject to their terms and policies.
                </p>

                <h3>8. Intellectual Property</h3>
                <ul>
                    <li>The platform software, design, branding, and non-user content are owned by us or our licensors.</li>
                    <li>You may not copy, resell, or commercially exploit the platform itself except as expressly allowed in writing.</li>
                    <li><BrandName /> and related marks may not be used in ways that suggest endorsement without permission.</li>
                </ul>

                <h3>9. Community Content Moderation</h3>
                <p>
                    We may review, hide, or remove public content that we reasonably believe violates these Terms, legal requirements,
                    or the safety and quality standards of the platform.
                </p>

                <h3>10. Availability, Changes, and Experimental Features</h3>
                <ul>
                    <li>We may add, modify, pause, or remove features at any time.</li>
                    <li>We do not guarantee uninterrupted availability or error-free operation.</li>
                    <li>Some features may be marked as beta/experimental and may change quickly.</li>
                </ul>

                <h3>11. Paid Plans (Current or Future)</h3>
                <p>
                    If paid subscriptions, credits, or school plans are offered, additional pricing and billing terms may apply.
                    Unless required by law, fees are non-refundable after service is delivered.
                </p>

                <h3>12. Suspension and Termination</h3>
                <ul>
                    <li>You may stop using the service at any time.</li>
                    <li>We may suspend or terminate access for Terms violations, security risk, legal risk, or abuse.</li>
                    <li>After termination, some data may remain in backups or where legally required.</li>
                    <li>If you shared content publicly, copies/remixes created by others may remain available.</li>
                </ul>

                <h3>13. Disclaimers</h3>
                <p>
                    To the maximum extent permitted by law, the service is provided on an &quot;as is&quot; and &quot;as available&quot; basis.
                    We disclaim all implied warranties, including merchantability, fitness for a particular purpose, and non-infringement.
                </p>

                <h3>14. Limitation of Liability</h3>
                <p>
                    To the maximum extent permitted by law, we are not liable for indirect, incidental, special, consequential,
                    exemplary, or punitive damages, including loss of profits, revenue, data, goodwill, or business interruption.
                    Our total liability for claims related to the service is limited to the amount you paid us for the service in the
                    12 months before the event giving rise to liability (or EUR 0 if you used only free features).
                </p>

                <h3>15. Indemnity</h3>
                <p>
                    You agree to defend, indemnify, and hold us harmless from claims, liabilities, damages, losses, and costs
                    arising from your content, your misuse of the service, or your violation of these Terms or third-party rights.
                </p>

                <h3>16. Governing Law and Disputes</h3>
                <p>
                    These Terms are governed by the laws of Spain, without regard to conflict-of-law rules.
                    Courts located in Valencia, Spain will have exclusive jurisdiction, unless mandatory local consumer law says otherwise.
                </p>

                <h3>17. Changes to These Terms</h3>
                <p>
                    We may update these Terms from time to time.
                    When we do, we will post the updated version with a new &quot;Last Updated&quot; date.
                    Continued use of the service after an update means you accept the revised Terms.
                </p>

                <h3>18. Contact</h3>
                <p>
                    Questions about these Terms? Please contact us through the site Contact page.
                </p>

                <p className="text-sm text-slate-500">
                    Friendly note: this policy is written to be understandable, but it is still a legal agreement.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-20 prose prose-slate">
            <h1 className="font-display text-3xl font-bold text-slate-800">Privacy Policy</h1>
            <p className="text-slate-600">Last Updated: {lastUpdated}</p>

            <p>
                We care about privacy and classroom trust.
                This policy explains what data we collect, why we collect it, how we use it, and what choices you have.
                If anything is unclear, contact us and we will explain it in plain English.
            </p>

            <h3>1. What We Collect</h3>
            <ul>
                <li>
                    <strong>Account data:</strong> name, email, authentication identifiers, and optional avatar/profile details.
                </li>
                <li>
                    <strong>Content you create:</strong> games, prompts, instructions, uploads, edits, and library items.
                </li>
                <li>
                    <strong>Uploads:</strong> documents/images you attach for AI generation, plus game assets you choose to store.
                </li>
                <li>
                    <strong>Community visibility data:</strong> whether content is public or private, plus public author display fields.
                </li>
                <li>
                    <strong>Contact messages:</strong> name, email, and message text sent through the Contact form.
                </li>
                <li>
                    <strong>Technical data:</strong> basic logs, request metadata, and error diagnostics from the app and hosting stack.
                </li>
                <li>
                    <strong>Browser-local data (guest mode):</strong> games may be stored in your browser localStorage.
                </li>
                <li>
                    <strong>Voice input (optional):</strong> if you use dictation, microphone audio is processed by browser speech recognition and/or local Whisper Web transcription, depending on availability.
                </li>
            </ul>

            <h3>2. How We Use Data</h3>
            <ul>
                <li>To provide core features (account login, generation, editing, saving, sharing).</li>
                <li>To generate AI-assisted content based on your prompts and uploaded source material.</li>
                <li>To support community libraries and visibility settings.</li>
                <li>To operate, secure, troubleshoot, and improve reliability and safety of the service.</li>
                <li>To respond to support/contact requests and enforce legal terms.</li>
            </ul>

            <h3>3. Legal Bases (Where Applicable)</h3>
            <p>Depending on your location, we process data under one or more of these legal bases:</p>
            <ul>
                <li>Performance of a contract (providing the service you asked for).</li>
                <li>Legitimate interests (security, quality, abuse prevention, product operation).</li>
                <li>Consent (for optional actions like voice features where required).</li>
                <li>Legal obligations (compliance, dispute handling, lawful requests).</li>
            </ul>

            <h3>4. AI Providers and Gemini Data Handling</h3>
            <p>
                When you use AI features, prompts, uploaded source files, and related context are sent to Google Gemini API
                (either through our server endpoint or direct client-side integration where configured).
            </p>
            <p>
                Based on Google Gemini API documentation and terms currently published (including Google AI Studio terms effective December 18, 2025):
            </p>
            <ul>
                <li>For Google &quot;Paid Services,&quot; Google states prompts/responses are not used to improve Google products.</li>
                <li>For Google &quot;Unpaid Services,&quot; Google states prompts/responses may be used to improve its products and machine-learning technologies.</li>
                <li>Google may retain logs for abuse and safety monitoring under its own policies.</li>
            </ul>
            <p>
                Because provider plans and configuration can vary over time, do not submit highly sensitive personal data in prompts or uploads unless you are legally authorized and comfortable with provider-side processing terms.
            </p>

            <h3>5. Where Data Is Stored</h3>
            <ul>
                <li>Supabase is used for authentication, database storage, and file storage.</li>
                <li>AI generation requests are processed through Google Gemini API.</li>
                <li>Stock image search uses Pixabay via our API route/proxy.</li>
                <li>Hosting/infrastructure providers may process request logs needed to run the site.</li>
            </ul>

            <h3>6. How Long We Keep Data</h3>
            <ul>
                <li>Account and saved content are kept while your account remains active, unless deleted earlier.</li>
                <li>Guest localStorage content remains on your device until you delete it or clear browser data.</li>
                <li>Public community content may remain visible until removed by you or moderation action.</li>
                <li>Contact messages are retained as reasonably necessary for support and legal recordkeeping.</li>
                <li>Operational logs may be retained for security, abuse prevention, and diagnostics.</li>
            </ul>

            <h3>7. Data Sharing</h3>
            <p>We do not sell your personal data. We share data only when needed:</p>
            <ul>
                <li>With processors/service providers that run platform features (for example, Supabase, Google, Pixabay, hosting providers).</li>
                <li>With other users only for content you intentionally mark as public/community.</li>
                <li>When required by law, court order, or to protect rights, safety, and service integrity.</li>
                <li>As part of a merger, acquisition, or business transfer (with notice where required).</li>
            </ul>

            <h3>8. Cookies and Similar Technologies</h3>
            <ul>
                <li>We use essential browser storage and auth/session mechanisms to keep the app working.</li>
                <li>Guest-mode saved items use browser localStorage.</li>
                <li>At the time of this policy update, we do not run third-party ad tracking networks in the app.</li>
            </ul>

            <h3>9. Your Rights and Choices</h3>
            <p>Depending on your location, you may have rights to access, correct, delete, or export your personal data, and to object/restrict certain processing.</p>
            <ul>
                <li>You can update profile information from the Profile page.</li>
                <li>You can delete saved content from your library.</li>
                <li>You can contact us via the Contact page for privacy requests.</li>
                <li>You may have the right to complain to your local data protection authority.</li>
            </ul>

            <h3>10. Student Data and School Use</h3>
            <p>
                If you use the service in a school context, you are responsible for ensuring you have a valid legal basis for any personal data you submit,
                including appropriate notices/consents where required by law or school policy.
            </p>

            <h3>11. International Transfers</h3>
            <p>
                Your data may be processed in countries outside your own.
                Where required, we rely on lawful transfer mechanisms and contractual safeguards provided by our service providers.
            </p>

            <h3>12. Security</h3>
            <p>
                We use reasonable technical and organizational measures to protect data.
                No online service is perfectly secure, so we cannot guarantee absolute security.
                Please use strong passwords and avoid sharing account access.
            </p>

            <h3>13. Children</h3>
            <p>
                The service is intended for adult educators and is not directed to users under 18.
                If you believe someone under 18 has submitted personal information through direct account use, please contact us so we can review and remove it where appropriate.
            </p>

            <h3>14. Changes to This Policy</h3>
            <p>
                We may update this Privacy Policy as the service evolves or laws change.
                Updated versions will be posted here with a revised &quot;Last Updated&quot; date.
            </p>

            <h3>15. Contact</h3>
            <p>
                For privacy questions or data requests, please contact us through the Contact page on the site.
            </p>

            <p className="text-sm text-slate-500">
                Friendly note: this document is for transparency and legal clarity; it is not legal advice to you.
            </p>
        </div>
    );
};
