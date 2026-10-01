import { translateInterfaceText as ui, useInterfaceLanguage as useUiLanguage } from '../utils/interfaceLanguage';

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, AlertCircle, Send, Loader, ChevronDown, X, Search } from 'lucide-react';
import { sendContactMessage } from '../utils/gameUtils';
import { BrandName } from '../components/BrandName';
import { useAuth } from '../contexts/AuthContext';
import { AccountType } from '../types';
import { promptSignupForFree } from '../services/accountAccess';

export const Info: React.FC = () => {
  const { language } = useUiLanguage();
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
      answer: 'Yes. In manual game creation, use "Import from Another AI Tool" to copy a ready-made request. Paste it into your preferred AI tool, then bring its response back into the game editor.'
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
  ].map(faq => ({ ...faq, question: ui(faq.question), answer: ui(faq.answer) }));

  const toggleSection = (section: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const openSection = (section: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [section]: true }));
    window.setTimeout(() => document.getElementById(`info-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const searchableSections: Array<{ type: 'section'; section: SectionKey; title: string; body: string }> = [
    {
      type: 'section',
      section: 'story',
      get title() { return ui("Our Story"); },
      body: 'How The Teachers Room started, ESL teaching, classroom games, prep time, surprise lesson time, coursebook photos, quick game creation.'
    },
    {
      type: 'section',
      section: 'how-to',
      get title() { return ui("How to Use the Site"); },
      body: 'Create games, manual mode, AI mode, upload files, source materials, images, editor, save to library, student share links, QR codes, Live Quiz Challenge.'
    },
    {
      type: 'section',
      section: 'prompt-guide',
      get title() { return ui("Prompt Guide"); },
      body: 'Prompt writing, AI instructions, level, age, objective, question count, source files, image prompts, specific classroom needs.'
    },
    {
      type: 'section',
      section: 'faqs',
      get title() { return ui("FAQs"); },
      body: 'Frequently asked questions about games, school accounts, student accounts, live quiz, images, AI generation, editing, sharing, saving, remixing.'
    }
  ].map(entry => ({ ...entry, type: 'section' as const, section: entry.section as SectionKey, body: ui(entry.body) }));

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
  }, [searchTerms.join('|'), language]);

  const handleSearchResultClick = (result: (typeof searchResults)[number]) => {
    setOpenSections((prev) => ({ ...prev, [result.section]: true }));
    if (result.type === 'faq') {
      setOpenFaq(result.faqIndex);
    }

    window.setTimeout(() => {
      const targetId = result.type === 'faq' ? `info-faq-${result.faqIndex}` : `info-${result.section}`;
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div className="info-page max-w-5xl mx-auto px-4 py-12 sm:py-16">
      <div className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-blue">{ui("Guides & answers")}</p>
        <h1 className="font-display text-4xl font-bold text-slate-800 mb-3">{ui("Help with ")}<BrandName /></h1>
        <p className="text-slate-600 max-w-2xl">
          {ui("Find your way around the games, get better results from AI, and answer common questions.")}</p>
      </div>

      <nav aria-label={ui("Information topics")} className="info-topic-nav mb-8 flex flex-wrap gap-2">
        {([['story', 'Our story'], ['how-to', 'Using the site'], ['prompt-guide', 'Writing a good brief'], ['faqs', 'Questions & answers']] as const).map(([section, label]) => (
          <button key={section} type="button" onClick={() => openSection(section)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-blue hover:text-brand-blue">
            {ui(label)}
          </button>
        ))}
      </nav>

      <div className="mb-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <label htmlFor="info-search" className="block text-sm font-bold text-slate-700 mb-2">
          {ui("Search help topics")}</label>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            id="info-search"
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={ui("Search live quiz, images, student links, school accounts...")}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-12 text-slate-800 outline-none transition focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-sky-100"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label={ui("Clear search")}
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
                  {searchResults.length} {ui(" result")}{searchResults.length === 1 ? '' : 's'}
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
                        {result.type === 'faq' ? ui("FAQ") : ui("Guide")}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{result.snippet}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                {ui("No matching help topics found. Try a shorter search, or use the Contact page if you need a specific answer.")}</div>
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
              <h2 className="font-display text-2xl font-bold text-slate-800">{ui("Our Story")}</h2>
              <p className="text-sm text-slate-500 mt-1">{ui("How ")}<BrandName /> {ui(" started and where we are today.")}</p>
            </div>
            <ChevronDown className={`text-slate-500 transition-transform ${openSections.story ? 'rotate-180' : ''}`} />
          </button>
          {openSections.story && (
            <div id="info-story" className="px-6 pb-6 pt-1 border-t border-slate-100 prose prose-slate max-w-none">
              <p>
                {ui("I am Stuart, an ESL teacher in Valencia, and I have spent around 20 years teaching pretty much every level and age group you can imagine. Over time, one thing became obvious: students come alive with games. Energy goes up, speaking improves, and revision suddenly stops feeling like punishment.")}</p>
              <p>
                {ui("The problem was prep time. Building quality games from scratch took forever, and many ready-made resources never matched what I was actually teaching that day. I wanted something flexible enough to follow real classroom life, not the other way around.")}</p>
              <p>
                {ui("Imagine finding a spare 15 minutes at the end of class: photograph the coursebook page, upload it, and make a game that fits the lesson. So that is what I built.")}<BrandName /> {ui(" grew from that exact moment: a slightly sleep-deprived teacher dream, a lot of trial and error, and a stubborn belief that teachers deserve tools as fast and adaptable as their classrooms.")}</p>
              <p>
                {ui("The goal is simple: keep the joy, lose the admin drag, and make it easier to create engaging materials whenever inspiration (or panic) strikes.")}</p>
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
              <h2 className="font-display text-2xl font-bold text-slate-800">{ui("How to Use the Site")}</h2>
              <p className="text-sm text-slate-500 mt-1">{ui("From an idea or source file to a game ready for class.")}</p>
            </div>
            <ChevronDown className={`text-slate-500 transition-transform ${openSections['how-to'] ? 'rotate-180' : ''}`} />
          </button>
          {openSections['how-to'] && (
            <div id="info-how-to" className="px-6 pb-6 pt-1 border-t border-slate-100 text-slate-600">
              <div className="info-guide-block border-l-2 border-brand-blue pl-4 mt-5">
                <h3 className="font-bold text-slate-800 mb-3">{ui("Games: from idea to classroom in minutes")}</h3>
                <ol className="list-decimal pl-5 space-y-2 text-sm">
                  <li>{ui("Open ")}<strong>{ui("Games")}</strong> {ui(" and pick a mode: Snakes & Ladders, Trivia, Jeopardy, Pub Quiz, Darts, Millionaire, Time Bomb, Survey Showdown, Stop the Fire, Word Wheel, or Live Quiz Challenge.")}</li>
                  <li>{ui("If you are not sure where to start, open the ")}<strong>{ui("AI Assistant")}</strong>{ui(", explain your idea in plain English, and it will recommend suitable game types based on your class and goals.")}</li>
                  <li>{ui("Choose ")}<strong>{ui("Manual")}</strong> {ui(" (build from scratch) or ")}<strong>{ui("AI")}</strong> {ui(" (instant first draft).")}</li>
                  <li>{ui("In Manual mode, open ")}<strong>{ui("Import from Another AI Tool")}</strong> {ui(" if you want to use your own AI tool. Copy the ready-made request, paste it into that tool, then bring its response back into the editor.")}</li>
                  <li>{ui("In AI mode, add a topic and optional instructions. You can type or use the mic dictation button.")}</li>
                  <li>{ui("Optional but powerful: upload source files (PDF/images, max 3 files, 4MB each) so AI uses your actual material.")}</li>
                  <li>{ui("If you enable images, ")}<strong>{ui("Auto-pick")}</strong> {ui(" grabs stock visuals from question/answer keywords, or choose ")}<strong>{ui("Pick later")}</strong> {ui(" and add them manually in the editor.")}</li>
                  <li>{ui("Generate, then polish in the editor: fix wording, change answers, replace images, save to library, and hit Play.")}</li>
                  <li>{ui("For whole-class play, use ")}<strong>{ui("Live Quiz Challenge")}</strong> {ui(" so students can join with a code or QR link and answer from their own devices.")}</li>
                  <li>{ui("For independent review, share a saved game with students using a link or QR code so they can practise outside class.")}</li>
                </ol>
              </div>

              <div className="info-guide-block border-l-2 border-slate-300 pl-4 mt-6">
                <h3 className="font-bold text-slate-800 mb-3">{ui("School accounts: manage teachers and shared resources")}</h3>
                <ol className="list-decimal pl-5 space-y-2 text-sm">
                  <li>{ui("Create a ")}<strong>{ui("School")}</strong> {ui(" plan, add your school name, and open the School Admin dashboard.")}</li>
                  <li>{ui("Invite teachers or approve join requests, then manage teacher spots and active/inactive access.")}</li>
                  <li>{ui("Monitor useful school activity such as games created, game play activity, and AI generation usage.")}</li>
                  <li>{ui("Use shared school storage for documents and resources that school members need to access.")}</li>
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
              <h2 className="font-display text-2xl font-bold text-slate-800">{ui("Prompt Guide")}</h2>
              <p className="text-sm text-slate-500 mt-1">{ui("What to include when you ask AI to make a game.")}</p>
            </div>
            <ChevronDown className={`text-slate-500 transition-transform ${openSections['prompt-guide'] ? 'rotate-180' : ''}`} />
          </button>
          {openSections['prompt-guide'] && (
            <div id="info-prompt-guide" className="px-6 pb-6 pt-1 border-t border-slate-100 text-slate-600">
              <div className="info-guide-block border-l-2 border-brand-blue pl-4 mt-5">
                <h3 className="font-bold text-slate-800 mb-3">{ui("Start with the essentials")}</h3>
                <p className="text-sm mb-3">{ui("A useful brief tells the tool who the game is for and what it should cover:")}</p>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li><strong>{ui("Who:")}</strong> {ui(" age + level (for example, \"A2 teens\").")}</li>
                  <li><strong>{ui("What:")}</strong> {ui(" precise objective (for example, \"past simple negatives\").")}</li>
                  <li><strong>{ui("Format:")}</strong> {ui(" game type, question count, and answer style.")}</li>
                  <li><strong>{ui("Boundaries:")}</strong> {ui(" must include / must avoid.")}</li>
                  <li><strong>{ui("Practical limits:")}</strong> {ui(" class time, difficulty, tone.")}</li>
                  <li><strong>{ui("Source anchor:")}</strong> {ui(" if you uploaded files, explicitly tell AI to use them.")}</li>
                </ul>
              </div>

              <div className="info-guide-block border-l-2 border-slate-300 pl-4 mt-6">
                <h3 className="font-bold text-slate-800 mb-2">{ui("How game images are chosen")}</h3>
                <p className="text-sm">
                  {ui("In Games, image auto-pick uses question/answer keywords generated by AI. It does ")}<strong>{ui("not")}</strong> {ui(" currently take a separate art-direction prompt like \"make it look like a watercolor painting.\" If you need a specific visual style, generate the game first, then replace images in the editor.")}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="info-example border border-slate-200 rounded-xl p-4">
                  <h4 className="font-bold text-slate-800 mb-2">{ui("A useful brief")}</h4>
                  <p className="text-sm leading-relaxed">
                    {ui("\"A2 ESL students (age 12-13). Use the attached book-page photo as the main source. Create a 15-question Trivia game for a 15-minute end-of-class review. Focus on food vocabulary + countable/uncountable nouns. Keep questions short, classroom-safe, and include 4 multiple-choice options.\"")}</p>
                </div>
                <div className="info-example border border-slate-200 rounded-xl p-4">
                  <h4 className="font-bold text-slate-800 mb-2">{ui("Too broad to be useful")}</h4>
                  <p className="text-sm leading-relaxed">
                    {ui("\"Make me a game from this.\"")}</p>
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
              <h2 className="font-display text-2xl font-bold text-slate-800">{ui("FAQs")}</h2>
              <p className="text-sm text-slate-500 mt-1">{ui("Common questions from teachers using games, student review links, and school accounts.")}</p>
            </div>
            <ChevronDown className={`text-slate-500 transition-transform ${openSections.faqs ? 'rotate-180' : ''}`} />
          </button>
          {openSections.faqs && (
            <div id="info-faqs" className="px-6 pb-6 pt-1 border-t border-slate-100">
              <p className="text-sm text-slate-500 mt-4">{ui("Click each question to reveal its answer.")}</p>
              <div className="mt-4 space-y-3">
                {faqs.map((faq, index) => (
                  <div id={`info-faq-${index}`} key={faq.question} className="border border-slate-200 rounded-xl overflow-hidden">
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
  useUiLanguage();
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
          <h1 className="font-display text-4xl font-bold text-slate-800 mb-4">{ui("Early Access For Teachers")}</h1>
          <p className="text-slate-600">{ui("The Teacher Plan and School Plan are free during early access, and no credit card information is required to sign up.")}</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Free */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-display text-2xl font-bold text-slate-800 mb-2">{ui("Starter")}</h3>
            <p className="text-4xl font-bold text-teal-600 mb-6">$0<span className="text-sm text-slate-400 font-normal">{ui("/mo")}</span></p>
            <ul className="space-y-4 mb-8">
              {['Use all manual creation tools', 'Import games from your own LLM using our template', 'Save and share games', 'Community library browsing', 'Built-in AI generation not included'].map(item => (
                <li key={item} className="flex items-center text-slate-600">
                  {item.includes('not included') ? (
                    <X size={18} className="text-red-500 mr-2 shrink-0" />
                  ) : (
                    <Check size={18} className="text-teal-500 mr-2 shrink-0" />
                  )}
                  {ui(item)}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => handlePlanCta('free')}
              className="w-full py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:border-teal-500 hover:text-teal-600 transition-colors"
            >
              {ui("Sign Up Free")}</button>
          </div>

          {/* Pro */}
          <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-brand-yellow relative transform scale-105">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-yellow px-4 py-1 rounded-full text-xs font-bold text-slate-800 uppercase tracking-wide">{ui("Recommended")}</div>
            <h3 className="font-display text-2xl font-bold text-slate-800 mb-2">{ui("Teacher Plan")}</h3>
            <p className="text-4xl font-bold text-teal-600 mb-1">$0<span className="text-sm text-slate-400 font-normal">{ui("/mo")}</span></p>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-6">{ui("free during early access")}</p>
            <ul className="space-y-4 mb-8">
              {['Credits for approximately 50 AI-created games per month', 'Unlimited manual game creation', 'Unlimited private library storage', 'No credit card information required to sign up'].map(item => (
                <li key={item} className="flex items-center text-slate-800 font-medium">
                  <Check size={18} className="text-brand-accent mr-2 shrink-0" /> {ui(item)}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => handlePlanCta('teacher')}
              className="w-full py-3 bg-brand-yellow rounded-xl font-bold text-slate-800 hover:bg-yellow-300 transition-colors shadow-md"
            >
              {ui("Activate Teacher Plan")}</button>
          </div>

           {/* School */}
           <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-display text-2xl font-bold text-slate-800 mb-2">{ui("School Plan")}</h3>
            <p className="text-4xl font-bold text-teal-600 mb-1">$0<span className="text-sm text-slate-400 font-normal">{ui("/mo")}</span></p>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-6">{ui("free during early access")}</p>
            <ul className="space-y-4 mb-8">
              {['AI game credits for each teacher account', 'Minimum 5 teacher seats', 'School-level teacher spot allocation', 'School admin dashboard', 'Shared school resource management', '100 MB shared school storage'].map(item => (
                <li key={item} className="flex items-center text-slate-600">
                  <Check size={18} className="text-teal-500 mr-2 shrink-0" /> {ui(item)}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => handlePlanCta('school')}
              className="w-full py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:border-teal-500 hover:text-teal-600 transition-colors"
            >
              {ui("Set Up School Plan")}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Contact: React.FC = () => {
  useUiLanguage();
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
       <h1 className="font-display text-4xl font-bold text-slate-800 mb-8 text-center">{ui("Get in Touch")}</h1>
       <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100 relative overflow-hidden">
          
          {status === 'success' ? (
              <div className="text-center py-12 animate-fade-in">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Check size={40} className="text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">{ui("Message Sent!")}</h2>
                  <p className="text-slate-500 mb-8">{ui("Thanks for reaching out. We'll get back to you shortly.")}</p>
                  <button 
                    onClick={() => setStatus('idle')}
                    className="px-6 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    {ui("Send Another Message")}</button>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">{ui("Name")}</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-400 outline-none"
                    placeholder={ui("Your name")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{ui("Email")}</label>
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-400 outline-none"
                    placeholder={ui("you@school.edu")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{ui("Message")}</label>
                  <textarea 
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-400 outline-none h-32 resize-none"
                    placeholder={ui("How can we help?")}
                  ></textarea>
                </div>
                <button 
                    type="submit"
                    disabled={status === 'sending'}
                    className={`w-full py-3 bg-brand-blue text-white rounded-xl font-bold hover:bg-sky-600 transition-colors flex items-center justify-center ${status === 'sending' ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    {status === 'sending' ? (
                        <><Loader size={20} className="mr-2 animate-spin" /> {ui(" Sending...")}</>
                    ) : (
                        <><Send size={20} className="mr-2" /> {ui(" Send Message")}</>
                    )}
                </button>
              </form>
          )}

       </div>
    </div>
  );
};

export const Legal: React.FC<{type: 'terms' | 'privacy'}> = ({type}) => {
  useUiLanguage();
    const lastUpdated = 'August 5, 2026';

    if (type === 'terms') {
        return (
            <div className="max-w-4xl mx-auto px-4 py-20 prose prose-slate">
                <h1 className="font-display text-3xl font-bold text-slate-800">{ui("Terms of Service")}</h1>
                <p className="text-slate-600">{ui("Last Updated: ")}{lastUpdated}</p>

                <p>
                    {ui("Welcome to ")}<BrandName />{ui(". We built this platform to make classroom prep faster, better, and less stressful. These Terms are the ground rules for using the site. By accessing or using ")}<BrandName />{ui(", you agree to these Terms and our Privacy Policy.")}</p>
                <p>
                    {ui("The service is currently operated as a non-charging beta side project by ")}<strong>Stuart Scott</strong> {ui(" in Spain.")}</p>

                <h3>{ui("1. Who Can Use the Service")}</h3>
                <ul>
                    <li>{ui("You must be 18 years of age or older to create an account or directly use the service.")}</li>
                    <li>{ui("If you use the service for a school or company, you confirm you are allowed to accept these Terms on their behalf.")}</li>
                    <li>{ui("The platform is designed for teachers/professional users. Students under 18 should not directly use the platform account features.")}</li>
                </ul>

                <h3>{ui("2. Accounts and Security")}</h3>
                <ul>
                    <li>{ui("You are responsible for keeping your login credentials secure.")}</li>
                    <li>{ui("You are responsible for activity under your account unless required otherwise by law.")}</li>
                    <li>{ui("Please provide accurate information and keep it up to date.")}</li>
                    <li>{ui("We may suspend accounts that are compromised, abusive, or clearly fake.")}</li>
                </ul>

                <h3>{ui("3. What the Service Does")}</h3>
                <p>
                    <BrandName /> {ui(" helps you create games using manual tools and AI-assisted generation. Features may include saving content, publishing to community libraries, image search/selection, and optional voice dictation support.")}</p>

                <h3>{ui("4. Acceptable Use (Please Do Not Be a Villain)")}</h3>
                <p>{ui("You agree not to:")}</p>
                <ul>
                    <li>{ui("Break any law, regulation, or third-party right.")}</li>
                    <li>{ui("Upload or share content you do not have rights to use.")}</li>
                    <li>{ui("Upload personal/sensitive student data without proper legal basis, notice, and consent where required.")}</li>
                    <li>{ui("Use the service to create harmful, discriminatory, abusive, or illegal content.")}</li>
                    <li>{ui("Attempt to reverse engineer, disrupt, scrape, overload, or bypass service protections.")}</li>
                    <li>{ui("Upload malware, malicious code, or content that interferes with platform operation.")}</li>
                </ul>

                <h3>{ui("5. Your Content and Permissions")}</h3>
                <ul>
                    <li>{ui("You keep ownership of the content you create and upload.")}</li>
                    <li>{ui("You grant us a worldwide, non-exclusive, royalty-free license to host, store, process, reproduce, and display that content to operate and improve the service.")}</li>
                    <li>{ui("If you mark content as public/community, you allow us to display it and allow other users to view, copy, and remix it inside the platform.")}</li>
                    <li>{ui("You confirm you have all rights and permissions needed for anything you upload.")}</li>
                </ul>

                <h3>{ui("6. AI Outputs and Teacher Responsibility")}</h3>
                <ul>
                    <li>{ui("AI can be impressive and occasionally confidently wrong. Please review all generated content before classroom use.")}</li>
                    <li>{ui("You are responsible for checking factual accuracy, level appropriateness, and safety.")}</li>
                    <li>{ui("We do not guarantee generated content is unique, error-free, or infringement-free.")}</li>
                    <li>{ui("We may apply safety or quality controls to AI features at any time.")}</li>
                </ul>

                <h3>{ui("7. Third-Party Services")}</h3>
                <p>
                    {ui("Some features rely on third-party providers, including Supabase (auth/database/storage), Google Gemini API and OpenAI API (AI generation), and Pixabay (stock image search). Your use of those integrated services may also be subject to their terms and policies.")}</p>

                <h3>{ui("8. Intellectual Property")}</h3>
                <ul>
                    <li>{ui("The platform software, design, branding, and non-user content are owned by us or our licensors.")}</li>
                    <li>{ui("You may not copy, resell, or commercially exploit the platform itself except as expressly allowed in writing.")}</li>
                    <li><BrandName /> {ui(" and related marks may not be used in ways that suggest endorsement without permission.")}</li>
                </ul>

                <h3>{ui("9. Community Content Moderation")}</h3>
                <p>
                    {ui("We may review, hide, or remove public content that we reasonably believe violates these Terms, legal requirements, or the safety and quality standards of the platform.")}</p>

                <h3>{ui("10. Availability, Changes, and Experimental Features")}</h3>
                <ul>
                    <li>{ui("We may add, modify, pause, or remove features at any time.")}</li>
                    <li>{ui("We do not guarantee uninterrupted availability or error-free operation.")}</li>
                    <li>{ui("Some features may be marked as beta/experimental and may change quickly.")}</li>
                </ul>

                <h3>{ui("11. Paid Plans (Current or Future)")}</h3>
                <p>
                    {ui("Subscription and school-plan features are currently in beta and no subscription fees are being charged. If paid subscriptions, credits, or school plans are introduced, additional pricing and billing terms may apply. Unless required by law, fees are non-refundable after service is delivered.")}</p>

                <h3>{ui("12. Suspension and Termination")}</h3>
                <ul>
                    <li>{ui("You may stop using the service at any time.")}</li>
                    <li>{ui("We may suspend or terminate access for Terms violations, security risk, legal risk, or abuse.")}</li>
                    <li>{ui("After termination, some data may remain in backups or where legally required.")}</li>
                    <li>{ui("If you shared content publicly, copies/remixes created by others may remain available.")}</li>
                </ul>

                <h3>{ui("13. Disclaimers")}</h3>
                <p>
                    {ui("To the maximum extent permitted by law, the service is provided on an \"as is\" and \"as available\" basis. We disclaim all implied warranties, including merchantability, fitness for a particular purpose, and non-infringement.")}</p>

                <h3>{ui("14. Limitation of Liability")}</h3>
                <p>
                    {ui("To the maximum extent permitted by law, we are not liable for indirect, incidental, special, consequential, exemplary, or punitive damages, including loss of profits, revenue, data, goodwill, or business interruption. Our total liability for claims related to the service is limited to the amount you paid us for the service in the 12 months before the event giving rise to liability (or EUR 0 if you used only free features).")}</p>

                <h3>{ui("15. Indemnity")}</h3>
                <p>
                    {ui("You agree to defend, indemnify, and hold us harmless from claims, liabilities, damages, losses, and costs arising from your content, your misuse of the service, or your violation of these Terms or third-party rights.")}</p>

                <h3>{ui("16. Governing Law and Disputes")}</h3>
                <p>
                    {ui("These Terms are governed by the laws of Spain, without regard to conflict-of-law rules. Courts located in Valencia, Spain will have exclusive jurisdiction, unless mandatory local consumer law says otherwise.")}</p>

                <h3>{ui("17. Changes to These Terms")}</h3>
                <p>
                    {ui("We may update these Terms from time to time. When we do, we will post the updated version with a new \"Last Updated\" date. Continued use of the service after an update means you accept the revised Terms.")}</p>

                <h3>{ui("18. Contact")}</h3>
                <p>
                    {ui("Questions about these Terms? Email Stuart Scott at")}{' '}
                    <a href="mailto:stuartscottai@gmail.com">{ui("stuartscottai@gmail.com")}</a> {ui(" or use the site Contact page.")}</p>

                <p className="text-sm text-slate-500">
                    {ui("Friendly note: this policy is written to be understandable, but it is still a legal agreement.")}</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-20 prose prose-slate">
            <h1 className="font-display text-3xl font-bold text-slate-800">{ui("Privacy Policy")}</h1>
            <p className="text-slate-600">{ui("Last Updated: ")}{lastUpdated}</p>

            <p>
                {ui("We care about privacy and classroom trust. This policy explains what data we collect, why we collect it, how we use it, and what choices you have. If anything is unclear, contact us and we will explain it in plain English.")}</p>

            <h3>{ui("Data Controller")}</h3>
            <p>
                <strong>Stuart Scott</strong>{ui(", based in Spain, is responsible for deciding how personal data is used for The Teachers' Room. For privacy questions or requests, email")}{' '}
                <a href="mailto:stuartscottai@gmail.com">{ui("stuartscottai@gmail.com")}</a>{ui(". The service is currently a non-charging beta side project.")}</p>

            <h3>{ui("1. What We Collect")}</h3>
            <ul>
                <li>
                    <strong>{ui("Account data:")}</strong> {ui(" name, email, authentication identifiers, and optional avatar/profile details.")}</li>
                <li>
                    <strong>{ui("Content you create:")}</strong> {ui(" games, prompts, instructions, uploads, edits, and library items.")}</li>
                <li>
                    <strong>{ui("Uploads:")}</strong> {ui(" documents/images you attach for AI generation, plus game assets you choose to store.")}</li>
                <li>
                    <strong>{ui("Community visibility data:")}</strong> {ui(" whether content is public or private, plus public author display fields.")}</li>
                <li>
                    <strong>{ui("Contact messages:")}</strong> {ui(" name, email, and message text sent through the Contact form.")}</li>
                <li>
                    <strong>{ui("Technical data:")}</strong> {ui(" basic logs, request metadata, and error diagnostics from the app and hosting stack.")}</li>
                <li>
                    <strong>{ui("Browser-local data (guest mode):")}</strong> {ui(" games may be stored in your browser localStorage.")}</li>
                <li>
                    <strong>{ui("Voice input (optional):")}</strong> {ui(" if you use dictation, microphone audio is processed by browser speech recognition and/or local Whisper Web transcription, depending on availability.")}</li>
                <li>
                    <strong>{ui("Live quiz data:")}</strong> {ui(" a nickname, first name, or team label, avatar choice, answers, scores, response times, and quiz participation timestamps.")}</li>
                <li>
                    <strong>{ui("Take-home student practice:")}</strong> {ui("nicknames, answers, and scores remain on the student's device and are not saved to an account or sent to the teacher. We record only an anonymous increase to the game's total play count.")}</li>
                <li>
                    <strong>{ui("School account data:")}</strong> {ui(" school name, teacher invitations and memberships, account roles, shared-school files, and limited teacher activity totals shown to authorised school administrators.")}</li>
            </ul>

            <h3>{ui("2. How We Use Data")}</h3>
            <ul>
                <li>{ui("To provide core features (account login, generation, editing, saving, sharing).")}</li>
                <li>{ui("To generate AI-assisted content based on your prompts and uploaded source material.")}</li>
                <li>{ui("To support community libraries and visibility settings.")}</li>
                <li>{ui("To run live classroom quizzes, display the temporary leaderboard, and return feedback to participants.")}</li>
                <li>{ui("To provide school administration, shared storage, account allocation, security, and limited usage reporting.")}</li>
                <li>{ui("To operate, secure, troubleshoot, and improve reliability and safety of the service.")}</li>
                <li>{ui("To respond to support/contact requests and enforce legal terms.")}</li>
            </ul>

            <h3>{ui("3. Legal Bases (Where Applicable)")}</h3>
            <p>{ui("For people in the EU/EEA, the legal basis depends on the particular use:")}</p>
            <ul>
                <li><strong>{ui("Contract:")}</strong> {ui(" creating and managing adult teacher accounts and providing requested account features.")}</li>
                <li><strong>{ui("Legitimate interests:")}</strong> {ui(" service security, fraud and abuse prevention, reliability, support, and proportionate product-operation records. We balance these interests against the rights of affected people.")}</li>
                <li><strong>{ui("School instructions or applicable educational legal basis:")}</strong> {ui(" where a school asks us to process teacher or student data on its behalf, the school determines and documents the appropriate legal basis and we act under a data-processing agreement.")}</li>
                <li><strong>{ui("Consent:")}</strong> {ui(" optional device permissions such as microphone access, where consent is the appropriate basis. Permission can be withdrawn through browser controls.")}</li>
                <li><strong>{ui("Legal obligation:")}</strong> {ui(" records required for compliance, dispute handling, and lawful requests.")}</li>
            </ul>

            <h3>{ui("4. AI Providers and Data Handling")}</h3>
            <p>
                {ui("When you use AI features, prompts, uploaded source files, and related context are sent through our server to the AI provider selected for the site: either Google Gemini API or OpenAI API. Provider API keys are not sent to your browser.")}</p>
            <p>
                {ui("Based on Google Gemini API documentation and terms currently published (including Google AI Studio terms effective December 18, 2025):")}</p>
            <ul>
                <li>{ui("For Google &quot;Paid Services,&quot; Google states prompts/responses are not used to improve Google products.")}</li>
                <li>{ui("For Google &quot;Unpaid Services,&quot; Google states prompts/responses may be used to improve its products and machine-learning technologies.")}</li>
                <li>{ui("Google may retain logs for abuse and safety monitoring under its own policies.")}</li>
                <li>{ui("When OpenAI is selected, requests are processed under OpenAI&apos;s API data-usage and retention policies.")}</li>
            </ul>
            <p>
                {ui("Because provider plans and configuration can vary over time, do not submit highly sensitive personal data in prompts or uploads unless you are legally authorized and comfortable with provider-side processing terms.")}</p>

            <h3>{ui("5. Where Data Is Stored")}</h3>
            <ul>
                <li>{ui("Supabase is used for authentication, database storage, and file storage.")}</li>
                <li>{ui("AI generation requests are processed through the selected provider: Google Gemini API or OpenAI API.")}</li>
                <li>{ui("Stock image search uses Pexels and may use Pixabay as a fallback, through our server-side API route/proxy.")}</li>
                <li>{ui("Vercel provides website hosting and server infrastructure and may process request and security logs.")}</li>
                <li>{ui("Cloudflare Turnstile provides human-verification checks on account and login forms.")}</li>
                <li>{ui("Google Fonts supplies the site fonts and receives the normal network information required to deliver those files.")}</li>
            </ul>

            <h3>{ui("6. How Long We Keep Data")}</h3>
            <ul>
                <li>{ui("Account and saved content are kept while your account remains active, unless deleted earlier.")}</li>
                <li>{ui("Live quiz sessions, participant labels, answers, scores, and response times are automatically removed after they reach 24 hours old.")}</li>
                <li>{ui("AI generation usage records used for security, quota management, and cost control are kept for no more than 12 months.")}</li>
                <li>{ui("Guest localStorage content remains on your device until you delete it or clear browser data.")}</li>
                <li>{ui("Public community content may remain visible until removed by you or moderation action.")}</li>
                <li>{ui("Contact messages are kept for no more than 24 months, unless a longer period is required for an active dispute or legal obligation.")}</li>
                <li>{ui("Expired school invitation records are removed after a short 30-day administration and security window.")}</li>
                <li>{ui("Operational logs may be retained for security, abuse prevention, and diagnostics.")}</li>
            </ul>

            <h3>{ui("7. Data Sharing")}</h3>
            <p>{ui("We do not sell your personal data. We share data only when needed:")}</p>
            <ul>
                <li>{ui("With processors/service providers that run platform features (for example, Supabase, Google, OpenAI, Pixabay, hosting providers).")}</li>
                <li>{ui("With other users only for content you intentionally mark as public/community.")}</li>
                <li>{ui("During a live quiz, with the teacher hosting the quiz and with other participants to the limited extent needed for names/team labels and leaderboard scores.")}</li>
                <li>{ui("With authorised school administrators for school membership, allocation, security, and the limited activity information described in the school interface.")}</li>
                <li>{ui("When required by law, court order, or to protect rights, safety, and service integrity.")}</li>
                <li>{ui("As part of a merger, acquisition, or business transfer (with notice where required).")}</li>
            </ul>

            <h3>{ui("8. Cookies and Similar Technologies")}</h3>
            <ul>
                <li>{ui("We use essential browser storage and auth/session mechanisms to keep the app working.")}</li>
                <li>{ui("Guest-mode saved items use browser localStorage.")}</li>
                <li>{ui("Cloudflare Turnstile may use strictly necessary security storage when a login or account form is opened.")}</li>
                <li>{ui("At the time of this policy update, we do not use advertising cookies, behavioural advertising, or third-party analytics trackers.")}</li>
                <li>{ui("Because the current storage is necessary for requested features or security rather than advertising or analytics, the site does not currently display a consent banner. We will add consent controls before introducing any optional tracking.")}</li>
            </ul>

            <h3>{ui("9. Your Rights and Choices")}</h3>
            <p>{ui("Depending on your location, you may have rights to access, correct, delete, or export your personal data, and to object/restrict certain processing.")}</p>
            <ul>
                <li>{ui("You can update profile information from the Profile page.")}</li>
                <li>{ui("You can delete saved content from your library.")}</li>
                <li>{ui("You can permanently delete your account and associated personal uploads from the Profile page.")}</li>
                <li>{ui("You can contact us via the Contact page for privacy requests.")}</li>
                <li>{ui("You may have the right to complain to your local data protection authority.")}</li>
            </ul>

            <h3>{ui("10. Student Data and School Use")}</h3>
            <p>
                {ui("A school is normally responsible for deciding why student and staff information is used. When we process that information on the school's instructions, we act as its processor under a data-processing agreement. Schools must provide their own required notices and establish an appropriate legal basis. Teachers should ask participants to use a first name, nickname, or team name and must not upload unnecessary or sensitive student information.")}</p>

            <h3>{ui("11. International Transfers")}</h3>
            <p>
                {ui("Some service providers may process data outside the EU/EEA. Where an adequacy decision does not cover the destination, we require an applicable transfer safeguard, such as the European Commission's Standard Contractual Clauses, and assess the provider's relevant protections. Information about the applicable safeguard can be requested through the Contact page.")}</p>

            <h3>{ui("12. Security")}</h3>
            <p>
                {ui("We use reasonable technical and organizational measures to protect data. No online service is perfectly secure, so we cannot guarantee absolute security. Please use strong passwords and avoid sharing account access.")}</p>

            <h3>{ui("13. Children")}</h3>
            <p>
                {ui("Account creation and teacher tools are intended for adults aged 18 or over. Students, including children, may use a teacher-started live quiz without creating an account. The join screen asks students to use a first name, nickname, or team name and explains what the class can see and that quiz participation records are removed after they reach 24 hours old. Schools and teachers remain responsible for providing any additional notice required for their educational use. If a child has created an account or unnecessary personal information has been submitted, contact us so it can be reviewed and removed.")}</p>

            <h3>{ui("14. Changes to This Policy")}</h3>
            <p>
                {ui("We may update this Privacy Policy as the service evolves or laws change. Updated versions will be posted here with a revised \"Last Updated\" date.")}</p>

            <h3>{ui("15. Contact")}</h3>
            <p>
                {ui("For privacy questions or data requests, email")}{' '}
                <a href="mailto:stuartscottai@gmail.com">{ui("stuartscottai@gmail.com")}</a> {ui(" or use the Contact page on the site.")}</p>

            <p className="text-sm text-slate-500">
                {ui("Friendly note: this document is for transparency and legal clarity; it is not legal advice to you.")}</p>
        </div>
    );
};
