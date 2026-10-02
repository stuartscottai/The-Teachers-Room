import type { WorkbookExercise, WorkbookPage, WorkbookSection } from './classBooklets';

const ex = (id: string, number: number | string, prompt: string, kind: WorkbookExercise['kind'] = 'text', options?: string[]): WorkbookExercise => ({ id, number: String(number), prompt, kind, ...(options ? { options } : {}) });
const questions = (prefix: string, prompts: string[], kind: WorkbookExercise['kind'] = 'text', options?: string[]) => prompts.map((prompt, i) => ex(`${prefix}-${i + 1}`, i + 1, prompt, kind, options));
const letters = (prefix: string, prompts: string[], kind: WorkbookExercise['kind'] = 'text') => prompts.map((prompt, i) => ex(`${prefix}-${String.fromCharCode(97 + i)}`, String.fromCharCode(97 + i), prompt, kind));
const section = (id: string, title: string, number: string, instructions: string, exercises: WorkbookExercise[] = []): WorkbookSection => ({ id, title, number, instructions, exercises });
const page = (id: string, sourcePage: number, title: string, sections: WorkbookSection[], reference = false): WorkbookPage => ({ id, sourcePage, title, instructions: reference ? 'Use these explanations to support your lesson.' : 'Work through the activities with your teacher. Use the answer areas for your responses or speaking notes.', exercises: [], sections, reference });
const moments = ['being made redundant', 'gaining media attention', 'meeting “Mr Right”', 'heading the wrong way', 'losing something special', 'stepping in for someone'];
const verbs = ['break', 'catch', 'cheer', 'come', 'cut', 'end', 'get', 'hang', 'help', 'jump', 'pay', 'run', 'settle', 'take', 'track', 'turn'];
const particles = ['around', 'at', 'back', 'down', 'in', 'off', 'on', 'out', 'up', 'with'];
const fengShui = `The ancient Chinese philosophers who considered feng (wind or air) and shui (water) to be the [1] … of mankind also understood that these were not the only supportive elements flowing through the [2] …. They perceived a subtler [3] …, calling it chi or ‘cosmic breath’. This life force is well-known to acupuncturists, who have [4] … elaborate maps of the ‘meridians’ or channels it uses to flow through the body. Kung Fu masters believe that chi can be concentrated in the human body, allowing someone to [5] … almost supernatural feats, such as the breaking of concrete blocks [6] … by using the edge of their hand. A real feng shui master is able to [7] … the flow of chi in a site, and may advise changes to the environment to [8] … health, wealth and good fortune.`;
const fengOptions = [
  ['A. sustainers', 'B. providers', 'C. keepers', 'D. promoters'], ['A. background', 'B. location', 'C. outlook', 'D. landscape'],
  ['A. vigour', 'B. weight', 'C. energy', 'D. stimulus'], ['A. shown up', 'B. built up', 'C. put up', 'D. laid up'],
  ['A. perform', 'B. play', 'C. act', 'D. conduct'], ['A. barely', 'B. merely', 'C. hardly', 'D. slightly'],
  ['A. suspect', 'B. realise', 'C. sense', 'D. endure'], ['A. set about', 'B. come about', 'C. go about', 'D. bring about']
];
const knit = `From knitted graffiti to guerrilla crocheting – needle crafts have exploded in ways entirely unforeseen by previous generations. Our grandmothers would no doubt approve of twenty-somethings knitting something similar to a tea cosy (which they used to cover their teapots), even when it is large enough to keep a London phonebox warm! This original item of knitwear has been made by Knit the City, a subversive group of knitters who also operate in other capital cities. In Berlin, for example, a woolly ‘Currywurst’ was created entirely out of yarn recently. For those not in the know, the Currywurst is a popular fast food item – over 800 million of the sausage treats are sold every year!`;
const pinkLady = `You may have come across the extravagantly dressed Pink Lady Flamingo, whose real name is Maryanne Kerr, busking on the underground in London. She auditioned for an official licence to perform her music, having experimented with many previous careers. “I’ve been busking since I broke a recording contract with a major record company,” said Maryanne, “because I refused to be dictated to.” She added that she became a busker more than forty years ago and announced that she is in her late seventies now and still busking.`;
const innovations = `Across the centuries, people’s daily lives [1] … (continually transform) by innovation. One of the most obvious characteristics of the 20th century was the rapid growth of technology, with individual quality of life [2] … (improve) immeasurably as a result. Basic labour-saving appliances such as washing machines, refrigerators and freezers were commonplace in the home by the 1960s and the demand for these and other ‘white goods’ [3] … (further stimulate) by the availability of cheap electricity and noticeable increases in personal wealth during that decade.

Personal computers first made their appearance in the home in the 1970s, but surely few people [4] … (be able to) imagine then that the home computer could evolve into the super-fast, super-sleek machines of today. Nor could they [5] … (even think) that handheld mobile gadgets would [6] … (use constantly) by all of us, in our desperation to keep up with everything from office correspondence to world news.

So what lies ahead of us? By 2025, will we [7] … (embrace) even more sophisticated technological aids – or will the world’s resources [8] … (deplete) by mankind to such an extent that there will be insufficient electricity to support these advances? Only time will tell.`;
const categories = ['commercial', 'environmental', 'physical', 'political', 'social', 'technological'];
const changePhotos = [
  { label: 'A · Transport', text: '', photo: { src: '/assets/class/c2-changes-source.png', alt: 'A busy waterway with boats and people', region: [8, 110, 319, 220] as [number, number, number, number], width: 1979, height: 1248 } },
  { label: 'B · Transport', text: '', photo: { src: '/assets/class/c2-changes-source.png', alt: 'A road with cars in the same setting', region: [142, 345, 314, 182] as [number, number, number, number], width: 1979, height: 1248 } },
  { label: 'C · Learning', text: '', photo: { src: '/assets/class/c2-changes-source.png', alt: 'Children using desktop computers in a library', region: [464, 101, 249, 219] as [number, number, number, number], width: 1979, height: 1248 } },
  { label: 'D · Learning', text: '', photo: { src: '/assets/class/c2-changes-source.png', alt: 'Children using a tablet in a classroom', region: [730, 176, 250, 225] as [number, number, number, number], width: 1979, height: 1248 } }
];
const wordBank = ['adventure', 'alternate', 'disaster', 'dispose', 'exhaust', 'experiment', 'flaw', 'hope', 'identify', 'mass', 'notice', 'philosophy', 'predict', 'speech', 'understand'];
const extracts = [
  'We pick up on health and social status from facial features, as shown by a recent research project where people were unconsciously attracted to healthy females and wealthy men, even when they only had a picture of a face (without make-up or jewellery) to judge them by.',
  'It was in 1856, while working in his tiny laboratory at home, that William Perkin produced, quite by chance, the colour mauve, which not only revolutionised the dye industry but also led to important innovations in perfume, photography and, most significantly for modern medicine, to the development of aspirin.',
  'Rather than burgers and fries being a product of the social changes seen over the last fifty years in America, the author suggests that fast food brands were to a large extent responsible for these changes, as they profoundly affected both lifestyle and diet.',
  'Tiny holes found in human teeth estimated to be over 8000 years old are now believed to be the earliest evidence of dentistry, for when these holes were examined with an electron microscope, researchers found their sides were too perfectly rounded to be caused by bacteria and have therefore proposed that they were drilled by prehistoric dentists.'
];
const summaries = [
  'a. Mauve not only radically changed the dye industry but also led to new discoveries of anything from perfume to aspirin.',
  'b. By cooking up mauve in his lab, Perkin pushed the dye industry forward and set the ball rolling in other industries too, such as perfume and photography and aspirin.',
  'c. In accidentally discovering mauve, Perkin transformed dyeing and many other areas, notably medicine.',
  'd. Perkin discovered a special pale purple colour and this discovery was revolutionary for the dye industry and also for the pharmaceutical industry, since it led to the innovation of aspirin.',
  'e. Aspirin owes its development to Perkin, who found mauve by chance in his laboratory at home.',
  'f. Commercially-speaking, Perkin’s chance discovery was very important, as other innovations followed, for example the development of aspirin.'
];

export const c2Pages: WorkbookPage[] = [
  page('c2-p8', 8, '1.1 · Ring the changes', [
    section('c2-p8-speaking-1', 'Speaking · Changes in your life', '1', 'Everyone goes through changes, whether by choice or because of something outside their control. Talk about changes that have happened to you or might happen in the future, relating them to these phrases.', [
      ...questions('c2-p8-changes', ['a change for the better', 'the earliest change you can remember', 'a new location', 'a change of direction in your life', 'a change of heart'], 'long-text'),
      ex('c2-p8-idioms', 'Idioms', 'Which two phrases above are examples of idioms? Find a third idiom on this page.')
    ]),
    { ...section('c2-p8-idiom-spot', 'Idiom spot', 'Idiom spot', 'Choose the correct option (a or b) to complete each definition. These idioms are used in the Listening section.', [
      ex('c2-p8-idiom-1', 1, 'When things fall into place, events happen to …', 'radio', ['a. change the order of a list', 'b. produce the situation you want']),
      ex('c2-p8-idiom-2', 2, 'If something goes downhill, it …', 'radio', ['a. gradually becomes worse', 'b. picks up speed']),
      ex('c2-p8-idiom-3', 3, 'If something is on the cards, it is …', 'radio', ['a. likely to fail', 'b. likely to happen']),
      ex('c2-p8-idiom-4', 4, 'When you say the rest is history about a change in your life, you mean that …', 'radio', ['a. it happened a long time ago', 'b. you are sure that people know what happened next'])
    ]), paragraphs: ['At C2 level, you need to understand and use phrases and idioms where the meaning is not transparent. You will probably know the individual words used, but this may not help!', 'Example: If something happens out of the blue, it is a) unexpected b) creative. Answer: a.'] },
    { ...section('c2-p8-listening-2', 'Listening · Life-changing moments', '2 · Track 02', 'You will hear five different people talking about a key change in their lives. Tick each speaker’s life-changing moment. There is one extra that you will not need.', questions('c2-p8-speaker', ['Speaker 1', 'Speaker 2', 'Speaker 3', 'Speaker 4', 'Speaker 5'], 'dropdown', moments)), paragraphs: ['Your teacher will play the audio over Zoom.'] },
    section('c2-p8-listening-3', 'Describe a speaker’s experience', '3 · Track 02', 'Listen again to check your answers. Then choose one of the speakers and describe what happened to him or her.', [ex('c2-p8-description', 'Notes', 'Speaker and description', 'long-text')]),
    { ...section('c2-p8-vocabulary', 'Vocabulary · Phrasal verbs', '', 'How many phrasal verbs can you come up with from the recording in Exercise 2? Remember that some contain two particles rather than one (an adverb and a preposition), as in the last example.', [ex('c2-p8-phrasal-notes', 'Notes', 'Phrasal verbs you heard', 'long-text')]),
      paragraphs: ['You will already have come across many phrasal verbs, but now you need to add to this knowledge. If there are gaps in your learning, try to fill them in.'], relatedPage: 9 },
    { id: 'c2-p8-exam-spot', title: 'Exam spot · Phrasal verbs', paragraphs: ['Phrasal verbs are tested in Parts 1, 2 and 4 of Reading and Use of English. Remember that their use is generally informal, so they should be used with care in Writing, where the tasks mostly require a more neutral or formal register.'] }
  ]),
  page('c2-p9', 9, '1.1 · Phrasal verbs & feng shui', [
    { ...section('c2-p9-vocabulary-4', 'Match verbs and particles', '4', 'Match the verbs to the correct particle(s) to form phrasal verbs that were used by Speakers 1–5. Four of them are three-part phrasal verbs. Example: break up (3).', verbs.filter(verb => verb !== 'break').map(verb => ex(`c2-p9-verb-${verb}`, verb, `Complete the phrasal verb beginning with ${verb} and note the speaker number`))),
      table: { headings: ['Verbs', 'Particles'], rows: [[verbs.join(' · '), particles.join(' · ')]] }, relatedPage: 8 },
    { ...section('c2-p9-vocabulary-5', 'Complete the phrasal verbs', '5', 'Complete the sentences using a phrasal verb from Exercise 4 in a suitable tense. Sometimes the passive form will be needed.', letters('c2-p9-phrasal', [
      'Their lives changed completely once the loan {{}} as it meant they could treat themselves to meals out and weekends away.',
      'An old school friend {{}} me {{}} on the Internet and we met up recently to compare our life stories.',
      'The company offered Maria a post in the New York branch and she {{}} the chance.',
      'During the last recession, local businesses {{}} recruitment and no graduate trainees {{}} as a result.',
      'Jeff explained that shortly after they bought the house together, he and his wife {{}} and she moved to another town.',
      'People often manage to advance their careers by {{}} the right people and telling them what they want to hear.',
      'Everything fell into place – she was offered the scholarship at Harvard, the flight was booked and her missing passport {{}} just in time!',
      'My brother has had a change of heart and is willing to {{}} me {{}} with decorating the flat after all.'
    ], 'gaps')), paragraphs: ['Example: The whole family moved to Switzerland last month and their two children are settling in well at school there.'] },
    { ...section('c2-p9-reading-6', 'Reading · Feng shui', '6', 'Read this introduction to a book on feng shui. Decide which answer (A, B, C or D) best fits each gap.', fengOptions.map((options, i) => ex(`c2-p9-feng-${i + 1}`, i + 1, `Feng shui gap ${i + 1}`, 'radio', options))), reading: { id: 'c2-feng', title: 'Feng shui · Introduction', text: fengShui } },
    { id: 'c2-p9-exam-spot', title: 'Exam spot · Reading and Use of English, Part 1', paragraphs: ['Part 1 is a short text with eight gaps. Don’t panic if you find unfamiliar words in options A–D. Try the other words in the gap first. If you’re sure they don’t fit, choose the word you don’t know.'] }
  ]),
  page('c2-p10', 10, '1.2 · Grammar clinic', [
    { ...section('c2-p10-grammar-1', 'A life less ordinary', '1', 'Read these short texts about alternative ways of approaching city life. The highlighted parts illustrate some of the grammar areas that C2 learners continue to have problems with. What are they?', [ex('c2-p10-grammar-areas', 'Notes', 'Grammar areas illustrated by the highlighted parts', 'long-text')]), relatedPage: 11 },
    { id: 'c2-p10-knit', title: 'Knit the City', reading: { id: 'c2-knit', title: 'Knit the City', text: knit, emphasis: ['have exploded', 'has been made by', 'who also operate', 'was created', 'are sold'] } },
    { id: 'c2-p10-pink', title: 'Pink Lady Flamingo', reading: { id: 'c2-pink', title: 'Pink Lady Flamingo', text: pinkLady, emphasis: ['whose real name is', 'I’ve been busking', 'She added that she became', 'announced that she is'] } },
    section('c2-p10-grammar-2', 'Your grammar priorities', '2', 'Tick any grammar areas below that you feel you need to work on. Add your main grammar problem if it is not listed.', [
      ex('c2-p10-priorities', 'Areas', 'Grammar areas to work on', 'checkbox', ['Modal verbs', 'Passives', 'Conditionals', 'Perfect tenses', 'Relative clauses', 'Reported speech', 'Uncountable nouns']),
      ex('c2-p10-other', 'Other', 'Your main grammar problem (if not listed)')
    ]),
    { ...section('c2-p10-corpus', 'Corpus spot · Perfect tenses', 'Corpus spot', 'Correct the errors in perfect tenses in these sentences, which were written by exam candidates.', letters('c2-p10-corpus', [
      'Three years ago I have been to Germany on a cultural exchange.', 'Tourism is a word that is being used for the last 50 years.',
      'In England last year, I was able to appreciate things I have never seen in my entire life.', 'The noise levels have been measured in our suburb the other day and are twice the acceptable level.',
      'All these years I’m practising basketball, I’m trying to become a better player.', 'When you will have bought your train tickets, you should take one each and put it into the machine.',
      'Supposing they would have got married, wouldn’t the day have come when they got bored with each other?', 'Nowadays, almost every disease has a cure and people have been caring more about their health.'
    ])), referencePage: 178 }
  ]),
  page('c2-p11', 11, '1.2 · Perfect tenses & innovation', [
    { ...section('c2-p11-grammar-3', 'How tense choice changes meaning', '3', 'Explain how tense choice alters the meaning in these sentences. In which two sentences is there no change in meaning?', letters('c2-p11-meaning', [
      'Mirek has gone / went to Gdansk on business.', 'Our society has been suffering / was suffering from high unemployment for decades.', 'We were given / have been given more time to complete the task.',
      'The government ministers have been dealing / have dealt with the problem.', 'Matt and James have played / have been playing golf all day.', 'I’ve thought / been thinking about what you said.',
      'Is there anything else we could have done / will have done?', 'Come October, we will have lived / will have been living here for eleven years.'
    ], 'long-text')), referencePage: 178 },
    { ...section('c2-p11-grammar-4', 'Perfect tenses · Your own answers', '4', 'Answer these questions so that they are true for you, using perfect tenses.', letters('c2-p11-personal', [
      'How long have you been learning English?', 'What have you never done that you would like to do?', 'What change has been made to your town or city recently that you don’t approve of?',
      'Which single change would most improve your quality of life at home?', 'What may have changed in your life by this time next year?'
    ], 'long-text')), referencePage: 178 },
    { ...section('c2-p11-grammar-5', 'Innovation in our lives', '5', 'Complete the text, using the words in brackets in such a way that they fit the space grammatically.', questions('c2-p11-innovation', [
      'continually transform', 'improve', 'further stimulate', 'be able to', 'even think', 'use constantly', 'embrace', 'deplete'
    ])), reading: { id: 'c2-innovation', title: 'Innovation in our lives', text: innovations } }
  ]),
  page('c2-p12', 12, '1.3 · Word formation', [
    { ...section('c2-p12-speaking-1', 'Changes in the world around you', '1', 'What changes do you notice in the world around you? Identify the changes shown in the pictures and categorise them, choosing from the adjectives below. Then suggest other changes that could be classified under these categories.', [
      ex('c2-p12-transport', 'A–B', 'Changes shown in the transport pictures', 'long-text'), ex('c2-p12-transport-category', 'A–B categories', 'Categories for the transport changes', 'checkbox', categories),
      ex('c2-p12-learning', 'C–D', 'Changes shown in the learning pictures', 'long-text'), ex('c2-p12-learning-category', 'C–D categories', 'Categories for the learning changes', 'checkbox', categories),
      ...questions('c2-p12-other-changes', categories.map(category => `Another ${category} change`))
    ]), cards: changePhotos },
    section('c2-p12-vocabulary-2', 'Vocabulary · Word formation', '2', 'Explain the formation rules and give the examples requested.', questions('c2-p12-formation', [
      'The adjectives above are formed from nouns. Generally, -al is added to the noun, as in environmental. Explain the formation rules for commercial and technological.',
      'The suffixes -able and -ive frequently combine with verbs to form adjectives, as in favourable and supportive. Explain the formation rules for creative and variable.',
      'The suffix -ous combines with nouns, as in courageous. Give two more examples.', 'Other common adjectival suffixes added to nouns are -ful and -less, as in meaningful and harmless. Give two more examples of each.'
    ], 'long-text')),
    { ...section('c2-p12-vocabulary-3', 'Form a single adjective', '3', 'For sentences a–j, replace the target words shown beneath each sentence with a single adjective formed from one of the verbs or nouns in the word bank. What adjectives are formed from the four remaining words?', [
      ...[
        ['My boss’s response to my plea for changes to my job description was exactly what I was expecting.', 'exactly what I was expecting'],
        ['If the weather is unfavourable, do you have any other suggestions to replace our original plans?', 'other suggestions to replace our original plans'],
        ['Both sides in the conflict are expressing their optimism that the ceasefire will hold.', 'expressing their optimism'],
        ['Jeremy seems to have calmly accepted the news about the break-in.', 'have calmly accepted the news'],
        ['That play I went to see last night was trying something new in its use of dialect.', 'trying something new'],
        ['I was incapable of any reply when Ella told me she had quit her job.', 'incapable of any reply'],
        ['It’s really easy to see how much fitter Liam has become since he started swimming regularly.', 'really easy to see'],
        ['Your last piece of writing was without any mistakes whatsoever.', 'without any mistakes whatsoever'],
        ['Many of today’s products are used only once and then thrown away, which is having an impact on the environment.', 'used only once and then thrown away'],
        ['The updating of the university’s computer system has had extremely bad and far-reaching consequences.', 'extremely bad and far-reaching']
      ].map(([prompt, target], i) => ({ ...ex(`c2-p12-adjective-${String.fromCharCode(97 + i)}`, String.fromCharCode(97 + i), prompt), example: `Replace: ${target}` })),
      ...questions('c2-p12-remaining', ['First remaining word and its adjective', 'Second remaining word and its adjective', 'Third remaining word and its adjective', 'Fourth remaining word and its adjective'])
    ]), paragraphs: [`Word bank: ${wordBank.join(' · ')}`, 'Example: I’ve been given this very lengthy and complete list of all the repairs needed in the flat. → Exhaustive.'] }
  ]),
  page('c2-p13', 13, '1.3 · Summarising ideas', [
    { id: 'c2-p13-exam', title: 'Exam spot · Writing, Part 1', paragraphs: ['In the Writing, Part 1 compulsory task, you will read two short texts in order to summarise and evaluate them. You will need to reproduce different ideas concisely, using your own words wherever possible.'] },
    section('c2-p13-writing-4', 'Identify the important information', '4', 'In extracts 1 and 2, important information has been underlined. Do the same in 3 and 4. Then answer questions 1–3 below the texts.'),
    ...extracts.map((text, i) => ({ id: `c2-p13-extract-${i + 1}`, title: `Extract ${i + 1}`, reading: { id: `c2-extract-${i + 1}`, title: `Text ${i + 1}`, text,
      ...(i === 0 ? { underlined: ['social status', 'facial features', 'unconsciously attracted'] } : i === 1 ? { underlined: ['William Perkin produced', 'by chance', 'revolutionised the', 'dye industry', 'important innovations', 'most significantly', 'modern medicine', 'aspirin'] } : {})
    } })),
    section('c2-p13-writing-4-questions', 'Questions about extracts 1 and 2', '4', 'Answer the questions about the underlined information.', questions('c2-p13-extract-question', [
      'Which information in text 1 is summarised in “People form opinions of others by looking at their faces”? What has been omitted?',
      'Which phrase in text 1 could be replaced by the verbs assess or evaluate?', 'Which underlined words in text 2 could be replaced by others?'
    ], 'long-text')),
    section('c2-p13-writing-5', 'Choose the best summary', '5', 'Choose from a–f the best summary sentence for text 2, judging by the inclusion of information, use of alternative words, choice of register and conciseness. Say why the remaining sentences are less successful.', [
      ex('c2-p13-best-summary', 'Choice', 'Best summary for text 2', 'radio', summaries), ex('c2-p13-summary-reasons', 'Reasons', 'Why the other sentences are less successful', 'long-text')
    ]),
    section('c2-p13-writing-6', 'Write your summary sentences', '6', 'Write summary sentences for texts 3 and 4, referring to the parts you have underlined and using between 12 and 20 words for each. Use your own words wherever possible.', [
      { ...ex('c2-p13-summary-3', 3, 'Summary of text 3', 'long-text'), wordTarget: '12–20 words' }, { ...ex('c2-p13-summary-4', 4, 'Summary of text 4', 'long-text'), wordTarget: '12–20 words' }
    ])
  ]),
  page('c2-ref178', 178, 'Perfect tenses', [
    { id: 'c2-ref178-intro', title: 'Unit 1 · Perfect tenses', paragraphs: ['The perfect tenses are used in English in a number of ways.'] },
    { id: 'c2-ref178-present-simple', title: 'Present perfect simple tense', bullets: [
      'When talking about events or situations that started in the past and are still true: Amelia Kenton has lived in the same house all her life.',
      'When thinking about the present effects of something that happened in the past: I’ve lost my purse so I need some money for the bus.',
      'When talking about a recent event or situation: Jack has just phoned to wish you good luck.',
      'When referring to something that will happen at some time in the future: As soon as I have settled in, come and stay!'
    ] },
    { id: 'c2-ref178-present-continuous', title: 'Present perfect continuous tense', paragraphs: ['This can sometimes be used instead of the present perfect simple tense. So, in the first example above, you could also say Amelia Kenton has been living in the same house all her life.', 'Main uses of the present perfect continuous tense are:'], bullets: [
      'To stress the period of time involved: I’ve been sitting at this computer all day!', 'To refer to a situation that continues: Membership numbers at this club have been falling year by year.',
      'To focus on the present effects of a recent event: You can tell it’s been raining – the seats are still damp.', 'To refer to something that has recently stopped: Have you been crying?'
    ] },
    { id: 'c2-ref178-stative', title: 'Note · Stative verbs', paragraphs: ['Stative verbs such as be, know, seem are not usually used in continuous tenses. For example, you would not say I’ve been knowing Jim since he was 15, but I’ve known Jim since he was 15.'] },
    { id: 'c2-ref178-past-simple', title: 'Past perfect simple tense', paragraphs: ['This tense is generally used to clarify the timing of an event. It is used to refer to an event which took place before something else:', 'Sailing towards the harbour, I remembered how it had looked on my first visit, ten years earlier.', 'Sometimes this involves using words like already or just: I had just stepped into the bath when the phone rang.'] },
    { id: 'c2-ref178-past-continuous', title: 'Past perfect continuous tense', paragraphs: ['This tense is used to stress the continuity of an event at an earlier point in time:', 'Their cat had been missing for over a week when a neighbour spotted it in the local park.', 'See also the note about stative verbs above.'] },
    { id: 'c2-ref178-future-simple', title: 'Future perfect simple tense', paragraphs: ['This tense is used to refer to events which have not yet happened, but will definitely do so at a given time in the future:', 'By the end of September, I will have started that course in London.'] },
    { id: 'c2-ref178-future-continuous', title: 'Future perfect continuous tense', paragraphs: ['This tense is used to indicate duration at a specified time in the future:', 'Come next Saturday, we’ll have been going out together for a whole year!'] },
    { id: 'c2-ref178-modals', title: 'Other modal verbs', paragraphs: ['To express regret about the past, should or ought to is combined with a perfect tense form:', 'We should never have bought Alex that drum kit!', 'I’m sorry, I ought to have remembered that you can’t eat strawberries.'] }
  ], true)
];
