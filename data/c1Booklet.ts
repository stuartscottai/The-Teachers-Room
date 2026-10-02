import type { WorkbookExercise, WorkbookPage, WorkbookSection } from './classBooklets';

const ex = (id: string, number: number | string, prompt: string, kind: WorkbookExercise['kind'] = 'text', options?: string[]): WorkbookExercise => ({ id, number: String(number), prompt, kind, ...(options ? { options } : {}) });
const questions = (prefix: string, prompts: string[], kind: WorkbookExercise['kind'] = 'text', options?: string[]) => prompts.map((prompt, i) => ex(`${prefix}-${i + 1}`, i + 1, prompt, kind, options));
const section = (id: string, title: string, number: string, instructions: string, exercises: WorkbookExercise[] = []): WorkbookSection => ({ id, title, number, instructions, exercises });
const page = (id: string, sourcePage: number, title: string, sections: WorkbookSection[], reference = false): WorkbookPage => ({ id, sourcePage, title, instructions: reference ? 'Use these explanations and practice activities to support your lesson.' : 'Work through the activities with your teacher. Use the answer areas for your responses or speaking notes.', exercises: [], sections, reference });
const phrases = ['You’re having me on!', 'Really?', 'Why was that?', 'That’s true.', 'No way!', 'That sounds amazing.', 'Me too/neither.', 'You’re so lucky!', 'I know what you mean.', 'What a nightmare!', 'Like what?', 'That must have been lovely!'].map((text, i) => ({ letter: String.fromCharCode(65 + i), text }));
const strategies = ['1. Expressing your emotional response', '2. Expressing comprehension/agreement', '3. Asking for more detail or a follow-up question'];
const anecdotePhotos = [
  { label: 'A', text: '', photo: { src: '/assets/class/c1-anecdotes-source.png', alt: 'A man waving outdoors while holding a phone', region: [1045, 400, 135, 110] as [number, number, number, number], width: 1875, height: 1344 } },
  { label: 'B', text: '', photo: { src: '/assets/class/c1-anecdotes-source.png', alt: 'A woman beside a mannequin in a department store', region: [1238, 395, 134, 118] as [number, number, number, number], width: 1875, height: 1344 } },
  { label: 'C', text: '', photo: { src: '/assets/class/c1-anecdotes-source.png', alt: 'A customer being served at a drive-through window', region: [1035, 552, 143, 105] as [number, number, number, number], width: 1875, height: 1344 } },
  { label: 'D', text: '', photo: { src: '/assets/class/c1-anecdotes-source.png', alt: 'A teacher standing beside students in a classroom', region: [1233, 550, 141, 107] as [number, number, number, number], width: 1875, height: 1344 } }
];
const forum = `Topic of the day – EMBARRASSMENT
We all have those moments in life when we mess up. And we’re pretty sure you’ve had some too, moments that you wish you could erase from your memory. Tell us about yours.

@princesspeach
Everyone [1] … to the teacher when suddenly a phone [2] … ringing. When it stopped, I made a joke that all mobiles that ring in class should be confiscated by the teacher and then I looked around the room to see whose it was. It was only then that I noticed that the whole class [3] … at me. Then the penny dropped. It was my phone that [4] … ringing. I [5] … it off before coming into class!

@angelinaballerina
In a department store last week, I [6] … into someone and knocked them to the floor. I was mortified and started apologising profusely. It was only then that I realised I [7] … to a mannequin! And a headless one at that! I felt so ridiculous and went bright red, especially because a smiling sales assistant asked me if I thought we should call an ambulance. Am I the only person who [8] … this or does it happen all the time?

@derekthebeast95
Last year, I [9] … the US for the first time. One day, I decided to go to a drive-through restaurant for lunch. I drove up to the machine, wound down the window and placed my order. Or so I thought. After a while I [10] … a voice saying ‘Can you drive up to the speaker? You’re talking to the trash can!’ I felt like such an idiot. The thing is, I [11] … to a drive-through restaurant before, you see! I only went to this one because it felt like a typical American thing to do.

@geographyteachernigel
A few months ago, I called in sick for work. The previous night I [12] … really ill. I [13] … all night and obviously I [14] … a wink. However, after a few hours’ sleep I felt much better, so I decided to head down to the beach for a walk. I [15] … there about half an hour when I noticed someone [16] … at me. I waved back, but it wasn’t until they came closer that I realised it was one of the receptionists who works part-time in my school. In fact, it was her that I [17] … to when I called in sick that morning. I quickly tried to justify why I wasn’t in my bed, and to be fair, she was fairly understanding. But I felt terrible about what she might think of me. And I [18] … a day off since!`;
const forumChoices = [
  ['was listening', 'had been listening'], ['started', 'had started'], ['had been looking', 'was looking'], ['has been', 'had been'], ['didn’t turn', 'hadn’t turned'],
  ['bumped', 'was bumping'], ['have been talking', 'was talking'], ['has done', 'has been doing'], ['was visiting', 'had been visiting'], ['heard', 'was hearing'],
  ['’ve never been', '’d never been'], ['felt', 'had felt'], ['was vomiting', 'had been vomiting'], ['didn’t sleep', 'hadn’t slept'], ['was', 'had been'],
  ['has been waving', 'was waving'], ['had been speaking', 'had spoken'], ['haven’t been having', 'haven’t had']
];
const learnerIntroduction = 'Aureliano Verdi, 22, has spent much of his life studying languages for fun. He’s fluent in 16 of them, including Farsi, Arabic, Lithuanian and Korean, and here he describes the five principles he uses in order to master new vocabulary quickly and effectively in any language.';
const learner = `${learnerIntroduction}

Young children are often said to be the real experts when it comes to language learning. Up until the age of about seven, they are able to pick up the language they are exposed to, without the need for a teacher to explain the difference between the tenses, or between subject and object pronouns. Somehow, they just manage to get it, and they do so unconsciously, in other words without making any real effort. So perhaps it’s unsurprising that so many courses, apps and language teaching materials claim to get you learning a foreign language as an adult in the same way you acquired your first language as a child. But is that feasible? Or even desirable?
Adult learners should not be underestimated. It might take a child seven years to become reasonably proficient (albeit with a restricted vocabulary), whereas an adult can reach an advanced communicative ability in one year. That might sound like a bold claim, but I am living proof, having attained intermediate to advanced level in 16 of them – and most of those were as an adult. For me, the key to learning so many languages has been the ability to combine the unconscious methods we used as children with the conscious methods used by adults. We can achieve the best of both worlds by following my five principles, in order to become expert vocabulary learners, whatever the language.

1. [Heading]
A language such as English has something in the region of one million words. But who knows that many? Or, more to the point, who wants to know that many? The ability to filter out what you don’t need is a key skill for any language learner. If you don’t do this, and you try to look up every single word in a text, well, that’s like reading an entire newspaper just to get to the sports page! Don’t make this mistake. Opt instead for the most useful words in a language. Focus on what’s going to be of use for you. So, if you’re a doctor, you might need to know that another word for ‘skull’ is ‘cranium’. But if you’re not, odds are that you can get by without knowing this word, so go for a more useful one instead!

2. [Heading]
Identifying words to learn is key, but if you try to absorb these words out of context, you’ll have a hard time fitting them all in. So what I advise is that you connect new information in your head to existing information. Let’s say you already know the adjective confidential (meaning secret), and then one day you learn the multi-word verb keep something to yourself (meaning not share information): you could link these two items of vocabulary in your mind. You can think of keeping something to yourself as the same as what you would do with confidential information. Or the other way round: confidential information is something you would keep to yourself. The words fit together into a context like pieces of a puzzle.

3. [Heading]
In the 1880s, German psychologist Hermann Ebbinghaus established that when we learn something, we initially retain it quite well. But over time, that memory deteriorates: Ebbinghaus termed this phenomenon the forgetting curve. But he also discovered that this tendency to forget can be combatted. If you revisit newly learnt information at time intervals, it becomes less and less easy to forget. What this means for vocabulary learners is that each day, you should take another look at the words you learnt yesterday, the day before, and the day before that. That way, they should make it into your long-term memory.

4. [Heading]
The ancient Romans had a saying: ‘Verba volant sed scripta manent’ – ‘Spoken words fly away, but written words stay’. What they were trying to tell us is that you need to have a way of permanently recording words in order to retain them in memory. For some people, the physical act of writing something down aids their ability to remember it. Just scribbling it on the back of an envelope isn’t enough – it’s got to be in a place where you’ll be able to access it later, maybe on your phone or in a notebook.

5. [Heading]
Of course, having the words in your head so that you can think about them isn’t enough – you need to say them. But just saying them to yourself isn’t enough either, according to Boucher and Lafleur, two researchers at the University of Montreal. To effectively memorise new words, you’ve got to repeat them out loud to another person. When you’ve read a text and found some words to learn, try to summarise for a friend what you’ve read, making sure to incorporate the new words into your conversation. If you’re a learner of English yourself, why not try it with this text?
So, there you have it: the five principles which I have followed to learn several languages to a pretty decent level. But hey – there’s nothing special about me. You can do it too!`;
const futureDescriptions = ['A. expressing a future intention, desire or promise', 'B. making a prediction about the future', 'C. using the present simple to describe a scheduled event at a known time in the future', 'D. using the present simple to describe the conditions for a possible future outcome', 'E. using the present continuous to talk about a fixed plan or arrangement'];
const damian = `Hello Emma,
I’ve been learning English for ten years now. I’m making good progress, and I’m pleased about that. For example I can tell I’ve certainly got a much [1] … vocabulary now than I did a few years ago. But there are still a few areas that [2] ….
One [3] … is the grammar of articles – a and the. [4] … we don’t really have an equivalent article system in Polish, so it can be [5] … to choose a or the correctly. [6] … there seem to be so many rules about article use that it can be hard to know which one to apply.
[7] … I can tell that my ability to read and to listen have really come along [8] …. For example, I can watch films in English [9] … the subtitles. That’s something I [10] … a year or two ago.
Having said that, I’m aware that my accent is stronger than [11] …. So [12] … any help on how to improve my pronunciation.
Many thanks for the opportunity to tell you a bit about myself. I’m looking forward to our classes together over the coming year.
With best wishes,
Damian`;
const emailChoices = [
  ['a. richer', 'b. bigger'], ['a. I struggle with', 'b. are difficult'], ['a. area', 'b. of these'], ['a. This is tricky because', 'b. What makes this tricky is the fact that'],
  ['a. quite a challenge', 'b. difficult'], ['a. Also,', 'b. One reason for this is that'], ['a. Moreover,', 'b. As for my language skills,'], ['a. over the past year or so', 'b. this year'],
  ['a. and I don’t need to have', 'b. without resorting to'], ['a. probably couldn’t do', 'b. couldn’t have coped with'], ['a. the accent of my classmates', 'b. I’d ideally like it to be'], ['a. I would be grateful for', 'b. please give me']
];

export const c1Pages: WorkbookPage[] = [
  page('c1-p8', 8, 'Speaking · Making conversation', [
    section('c1-p8-speaking-1', 'Making conversation', '1', 'Work with a partner and interview each other using the questions below. Make notes about your partner’s answers.', questions('c1-p8-interview', [
      'How long have you been learning English?', 'What aspects of learning English do you find the most difficult/the easiest?', 'Have you ever been in a real world situation in which your English proved to be really useful?',
      'Tell me about a holiday you had that was memorable for some reason.', 'Tell me about the last film you watched in English. Did you watch it with or without subtitles?', 'Tell me about any hobbies or interests that you have.'
    ], 'long-text')),
    section('c1-p8-speaking-2', 'Share what you learnt', '2', 'Share what you learnt with the class.', [ex('c1-p8-share', 'Notes', 'What you learnt about your partner', 'long-text')]),
    { ...section('c1-p8-speaking-3', 'Active listening', '3', 'Look at the advice for maintaining successful conversations. Then match the conversation strategies (1–3) with the active listening phrases (A–L). Can you think of any more examples for each strategy?', [
      ...phrases.filter(phrase => phrase.letter !== 'K').map(phrase => ex(`c1-p8-strategy-${phrase.letter}`, phrase.letter, phrase.text, 'dropdown', strategies)),
      ...questions('c1-p8-extra', ['Another example for Strategy 1', 'Another example for Strategy 2', 'Another example for Strategy 3'])
    ]), paragraphs: ['A successful conversation is not just about how well you speak, but also how well you listen and support the other speaker. Show the other person that you are actively listening both with your body language (eye contact, nodding in agreement, etc.) and by saying things that show you are engaging with what they are saying. Here are three common active listening strategies:', 'Example: K. Like what? → Strategy 3.'],
      bullets: ['Strategy 1: Expressing your emotional response to what the other speaker is saying (surprise, relief, fear, etc.)', 'Strategy 2: Expressing comprehension of/agreement with the speaker’s situation/point', 'Strategy 3: Asking for more detail or a follow-up question'],
      table: { headings: ['Phrase', 'Example strategy', 'Example listening order'], rows: phrases.map(phrase => [`${phrase.letter}. ${phrase.text}`, phrase.letter === 'K' ? '3' : '', phrase.letter === 'K' ? '1' : '']) } },
    { ...section('c1-p8-speaking-4', 'Listening · Order of the phrases', '4 · Track 002', 'Listen to three conversations based on questions from Exercise 1. Complete the third column of the table by noting the order in which you hear each phrase.', phrases.filter(phrase => phrase.letter !== 'K').map(phrase => ex(`c1-p8-order-${phrase.letter}`, phrase.letter, phrase.text))), paragraphs: ['Your teacher will play the audio over Zoom. Example: K. Like what? → Order 1.'] },
    section('c1-p8-speaking-5', 'Keep the conversation going', '5', 'Work with a partner. Ask each other one of the questions from Exercise 1 and use the ideas in Exercise 3 or your own ideas to keep the conversation going.', [ex('c1-p8-conversation', 'Notes', 'Your conversation notes', 'long-text')])
  ]),
  page('c1-p9', 9, 'Grammar · Past and perfect tenses review', [
    { ...section('c1-p9-grammar-1', 'Anecdotes', '1', 'Answer the questions, then match the pictures with the anecdotes in the text.', [
      ...questions('c1-p9-anecdote', ['What is an anecdote?', 'What makes a good anecdote?'], 'long-text'),
      ...['@princesspeach', '@angelinaballerina', '@derekthebeast95', '@geographyteachernigel'].map((author, i) => ex(`c1-p9-photo-${i + 1}`, `3 · ${author}`, 'Matching picture', 'dropdown', ['A', 'B', 'C', 'D']))
    ]), cards: anecdotePhotos, referencePage: 198 },
    { ...section('c1-p9-grammar-2', 'Topic of the day · Embarrassment', '2', 'Choose the correct options to complete the forum posts.', forumChoices.map((options, i) => ex(`c1-p9-tense-${i + 1}`, i + 1, `Forum gap ${i + 1}`, 'radio', options))), reading: { id: 'c1-forum', title: 'Embarrassment · Forum posts', text: forum } },
    section('c1-p9-grammar-3', 'Grammar summaries', '3', 'Complete the grammar summaries with the names of the tenses.', questions('c1-p9-summary', [
      'The … often provides background information about the activities in progress when the events of the story begin, or expresses an action that was in progress in the past when another shorter past action interrupts it.',
      'Use the … to indicate that a completed past event occurs before another past event.',
      'You can use the … to ask questions about past experiences that may have happened at some point in a person’s life, to describe an action or state that started in the past and continues until now, or to talk about recent past events that have a present result.',
      'The … is less common in English and is used to talk about an extended activity that occurred and finished before another past event or situation happened.'
    ], 'dropdown', ['present perfect simple', 'past perfect continuous', 'past continuous', 'past perfect simple'])),
    section('c1-p9-grammar-4', 'Your funny anecdote', '4', 'Write notes about the key events of a funny anecdote of your own. Then work in groups and take turns to read your anecdotes out.', [ex('c1-p9-own-anecdote', 'Notes', 'Key events of your anecdote', 'long-text')])
  ]),
  page('c1-p10', 10, 'Vocabulary & reading · Language learning', [
    section('c1-p10-vocabulary-1', 'Vocabulary · Easily confused words', '1', 'Choose the correct word from each pair to complete the sentences.', [
      ['… going to English class today? Can you let the teacher know that I might be a little late?', ['whose', 'who’s']],
      ['He is one of the few professors … opinion actually matters to me.', ['whose', 'who’s']],
      ['You must give me the … for that curry you prepared for us last week – it was delicious!', ['recipe', 'receipt']],
      ['Shops generally will refuse to give you a refund for something you bought if you can’t provide the original ….', ['recipe', 'receipt']],
      ['I think it’s better if we go to see the teacher … rather than separately – she’s more likely to listen if we explain it to her collectively.', ['all together', 'altogether']],
      ['I can produce good English when I am not in a pressure situation. However, doing so in an exam is a different matter ….', ['all together', 'altogether']],
      ['I’m an actor, but I’m not working at the moment. Let’s just say I’m … jobs!', ['among', 'between']],
      ['You know you’re … good friends when they finish your sentences for you!', ['among', 'between']],
      ['I must … you on your accent. Where did you learn such good English?', ['complement', 'compliment']],
      ['I think her blue jeans and black leather jacket … each other perfectly. It’s a classic look!', ['complement', 'compliment']],
      ['I agree in … with your suggestion, but I am not sure it will actually work in reality.', ['principle', 'principal']],
      ['One of the … reasons I am learning English is to improve my job prospects.', ['principle', 'principal']]
    ].map(([prompt, options], i) => ex(`c1-p10-word-${i + 1}`, i + 1, prompt as string, 'dropdown', options as string[]))),
    { ...section('c1-p10-vocabulary-2', 'Listening · Remembering problem vocabulary', '2 · Track 003', 'Listen to four people talking about how they remember problem vocabulary. Which speaker(s) (A–D) mention(s) the following points?', questions('c1-p10-speakers', [
      'remembers some good advice from their school days', 'says that words can look similar in different languages but mean very different things', 'says that translating from their language into English can cause errors',
      'invents reasons for words to be spelled in certain ways', 'records their vocabulary in a way that helps them eliminate the error they talk about'
    ], 'checkbox', ['A', 'B', 'C', 'D'])), paragraphs: ['Your teacher will play the audio over Zoom.'] },
    section('c1-p10-vocabulary-3', 'Vocabulary · Discussion', '3', 'Work in groups and discuss the questions.', questions('c1-p10-vocabulary-discuss', [
      'Are there any words in English that you have problems with or mix up?', 'How useful do you find it to translate English into your language?', 'Do you have any techniques for recording and learning new vocabulary?'
    ], 'long-text')),
    section('c1-p10-reading-1', 'Reading · Language learning', '1', 'Work with a partner and discuss the statements about language learning. Do you agree or disagree with them? Give reasons or examples from your own experience.', questions('c1-p10-reading-discuss', [
      'Children are better at learning languages than adults.', 'You can’t learn a language well unless you learn the grammar.', 'Soon we won’t need English classes or English teachers. We will just learn through apps.',
      'To learn a language successfully, you have to be prepared to make mistakes and even to make a fool of yourself from time to time.', 'You learn a language much quicker if you can spend time in or live in a country where it is spoken.'
    ], 'long-text')),
    { ...section('c1-p10-reading-2', 'Predict Aureliano’s advice', '2', 'Quickly read the introduction to the blog post. What do you expect Aureliano’s five tips to be?', [ex('c1-p10-predictions', 'Notes', 'Your predictions', 'long-text')]), paragraphs: [learnerIntroduction] },
    { ...section('c1-p10-reading-3', 'Check your predictions', '3', 'Now read the text to see if you were right about Aureliano’s advice.', [ex('c1-p10-check', 'Notes', 'Were your predictions right?', 'long-text')]), relatedPage: 11 },
    { ...section('c1-p10-reading-4', 'Complete the blog headings', '4', 'Complete the blog post by putting the headings in the correct places (1–5).', questions('c1-p10-heading', ['Paragraph 1', 'Paragraph 2', 'Paragraph 3', 'Paragraph 4', 'Paragraph 5'], 'dropdown', ['Storage', 'Use', 'Association', 'Selection', 'Review'])), relatedPage: 11 }
  ]),
  page('c1-p11', 11, 'Reading · Becoming an expert language learner', [
    { id: 'c1-p11-article', title: 'Becoming an expert language learner', reading: { id: 'c1-learner', title: 'Aureliano’s five principles', text: learner }, relatedPage: 10 },
    section('c1-p11-reading-5', 'Find words in the text', '5', 'Find words in the text which mean:', questions('c1-p11-words', [
      'learn completely (introduction)', 'realistic (introduction)', 'achieved (introduction)', 'select (paragraph 1)', 'gets worse (paragraph 3)',
      'continue to keep (paragraph 4)', 'writing quickly and without care (paragraph 4)', 'make one thing become part of something else (paragraph 5)'
    ])),
    section('c1-p11-reading-6', 'Explain Aureliano’s point', '6', 'Decide what point Aureliano was making about effective language learning when he mentioned the following:', questions('c1-p11-meaning', [
      'children aged up to seven', 'his own success as a language learner', 'the sports page of a newspaper', 'the forgetting curve', 'an envelope', 'Boucher and Lafleur’s research'
    ], 'long-text'))
  ]),
  page('c1-p12', 12, 'Listening & grammar · Future prospects', [
    { ...section('c1-p12-listening-1', 'Listening · Future prospects', '1 · Track 004', 'Listen to three students describing how they think English will help them in the future. What do they give as the main reason for learning English?', questions('c1-p12-main-reason', ['Speaker 1', 'Speaker 2', 'Speaker 3'], 'dropdown', [
      'A. English will help me to travel abroad.', 'B. English will improve my job prospects.', 'C. English will enable me to reach a wider audience.'
    ])), paragraphs: ['Your teacher will play the audio over Zoom.'] },
    section('c1-p12-listening-2', 'Match the verbs and objects', '2', 'Match the verbs and objects from the recordings to make phrases.', questions('c1-p12-phrases', ['conquer', 'launch', 'run out of', 'enhance my', 'push'], 'dropdown', ['A. cash', 'B. myself', 'C. the world', 'D. a new blog', 'E. employability'])),
    section('c1-p12-listening-3', 'Your future prospects', '3', 'Work in groups and answer the questions.', questions('c1-p12-discuss', [
      'In terms of how you expect English to help you in the future, which speaker(s) are you most similar to?', 'What other motivations do you have for learning English?'
    ], 'long-text')),
    { ...section('c1-p12-grammar-1', 'Grammar · Future tenses', '1', 'Match the extracts from the listening (1–7) with the descriptions (A–E). There may be more than one answer.', questions('c1-p12-future-match', [
      '“I imagine that I’ll basically be on the road until I run out of cash.”', '“When I’m older, I’ll still continue to work on my English.”', '“I’m saving up money by spending a year working on an oil rig and that comes to an end next month.”',
      '“I’m going to work hard on my English, starting next week.”', '“My English is going to enhance my employability.”', '“In fact, I am taking the Cambridge Advanced exam in October.”',
      '“The idea is that if I get enough followers in the future, then I’ll be able to earn money from advertisers.”'
    ], 'checkbox', futureDescriptions)), referencePage: 199 },
    section('c1-p12-grammar-2', 'Correct the mistakes', '2', 'Correct the mistake in each of the sentences. There may be more than one possible answer.', questions('c1-p12-future-correct', [
      'Tomorrow it’s snowing, so I would imagine that classes are going to have to be cancelled.', 'I haven’t decided what I’m doing tomorrow. Perhaps I’m going to go cycling.',
      'A: “Will we go out this evening? We could try that new restaurant that got those rave reviews.”\nB: “Good idea – let’s give it a shot!”', 'I’ll drop you a line as soon as my plane will land in London.',
      'Both teams are evenly matched so when they play each other for the first time in December, I have no idea who is winning.', 'Unless he actually knuckles down and studies hard this year, I am sure he shan’t pass the course.'
    ])),
    section('c1-p12-grammar-3', 'Choose and explain', '3', 'Choose the correct options to complete the sentences. Can you explain your choice? Sometimes both options will be possible.', [
      ...[
        ['What are you … after your English lesson today?', ['doing', 'going to do']], ['In what ways do you hope your English … over the next year?', ['is improving', 'will improve']],
        ['Do you think you … English in ten years’ time?', ['will still be studying', 'are still studying']], ['Do you think that English … by humans 1000 years from now?', ['is still going to be spoken', 'is still going to speak']],
        ['Is it likely that another language … English as the world’s main international language? If so, which?', ['is going to replace', 'will replace']], ['Do you think your teacher … you homework at the end of today’s lesson?', ['shall give', 'will give']]
      ].map(([prompt, options], i) => ex(`c1-p12-future-options-${i + 1}`, i + 1, prompt as string, 'checkbox', options as string[])),
      ex('c1-p12-choice-reasons', 'Reasons', 'Explain your choices', 'long-text')
    ]),
    section('c1-p12-grammar-4', 'Speaking practice', '4', 'Work with a partner to ask and answer the questions in Exercise 3.', [ex('c1-p12-speaking', 'Notes', 'Your speaking notes', 'long-text')])
  ]),
  page('c1-p13', 13, 'Writing · Advanced English', [
    { ...section('c1-p13-writing-1', 'What does advanced English mean?', '1', 'Work with a partner. Discuss what you think it means to be able to communicate in English at an advanced level. You may use the following ideas to help you:', [ex('c1-p13-discussion', 'Notes', 'Your discussion notes', 'long-text')]),
      bullets: ['situations you need to be able to communicate in', 'grammar and vocabulary', 'accuracy (avoiding errors)', 'pronunciation', 'formal and informal English appropriacy'] },
    { ...section('c1-p13-writing-2', 'Damian’s email', '2', 'Quickly read Damian’s answer to the homework his new teacher has set him (ignoring the gaps). Identify his perceived strengths and weaknesses.', [
      ex('c1-p13-strengths', 'Strengths', 'Damian’s perceived strengths', 'long-text'), ex('c1-p13-weaknesses', 'Weaknesses', 'Damian’s perceived weaknesses', 'long-text')
    ]), paragraphs: ['In order for me to help you learn as effectively as possible on this course, I’d like to find out about you as a learner. What do you feel that you are good at with English, and what do you find hard? Please email me your answer and write about 200 words.'],
      reading: { id: 'c1-damian', title: 'Hello Emma · Damian’s reply', text: damian } },
    section('c1-p13-writing-3', 'Choose advanced language', '3', 'Look at the words and phrases which could fill the 12 gaps in Damian’s email. For each gap, both options can be considered correct. Which one should Damian, as an advanced learner, use in order to show what he is capable of? Give reasons.', [
      ...emailChoices.map((options, i) => ex(`c1-p13-email-choice-${i + 1}`, i + 1, `Email gap ${i + 1}`, 'radio', options)), ex('c1-p13-reasons', 'Reasons', 'Explain your language choices', 'long-text')
    ]),
    section('c1-p13-writing-4', 'Your email to your teacher', '4', 'Now write a similar email to your teacher, outlining your own strengths and weaknesses as a learner of English. Use advanced vocabulary and structures in order to show your teacher what you are capable of.', [{ ...ex('c1-p13-email', 'Email', 'Your email', 'long-text'), wordTarget: 'about 200 words' }])
  ]),
  page('c1-ref198', 198, 'Past and perfect tenses review', [
    { id: 'c1-ref198-past-simple', title: 'Past simple', paragraphs: ['The most commonly used tense to talk about the past is the past simple. We use it to describe:'], bullets: [
      'Actions or events in the past: The two music fan clubs established a close rapport after the big charity concert.', 'Actions or events which happened one after another: The student representative chaired the meeting about the environment.',
      'Things which happened over a long period in the past: In the time she was at university, she excelled in her chosen courses.'
    ] },
    { id: 'c1-ref198-past-continuous', title: 'Past continuous', paragraphs: ['We use the past continuous to describe:'], bullets: [
      'An action in progress at a moment in the past: It was 6 o’clock and the rain was falling hard.', 'An activity in progress in the past interrupted by another event in the past (past simple): The rapper was talking to the audience about his new album when the microphone inexplicably stopped working.'
    ] },
    { id: 'c1-ref198-past-perfect', title: 'Past perfect simple', paragraphs: [
      'We use the past perfect simple when we need to make it clear that one past event or action happened before another event or action in the past (we use the past simple for the more recent event):',
      'The local council fined the students because they had dumped their rubbish on the lawn in front of the hall of residence.'
    ] },
    { id: 'c1-ref198-past-perfect-continuous', title: 'Past perfect continuous', paragraphs: [
      'We use the past perfect continuous to describe something which happened before another event or action in the past, but the emphasis is on an extended, continuous or repeated activity:',
      'Steve and Louise had been having relationship problems for months, so it was no surprise when they finally split up.'
    ] },
    { id: 'c1-ref198-present-perfect', title: 'Present perfect simple and continuous', paragraphs: ['The present perfect simple and present perfect continuous are both used to describe past events or actions that affect the present.', 'The two tenses are often very similar in their usage, and in many situations both are possible. However, there are some differences:'],
      table: { headings: ['Present perfect simple', 'Present perfect continuous'], rows: [
        ['Emphasises the result: They’ve studied hard so they deserve to pass the exam.', 'Emphasises the action: They’ve been studying so hard. They must be exhausted.'],
        ['Often focuses on an activity being complete: I’ve done all the homework, so I’m going to see my friends.', 'Often emphasises that the action is incomplete: I’ve been doing homework all night but I still haven’t finished.'],
        ['May give the idea that something is permanent: He’s been a police officer all his life.', 'May give the idea that something is temporary: We have both been doing part-time jobs over the Christmas period, but we go back to university next week.'],
        ['Is used for repeated actions if we want to say how many times an action has been repeated: I’ve listened to that new album every day this week.', 'Is used for repeated actions without a specific duration: I’ve been listening to that album every day.']
      ] } },
    { id: 'c1-ref198-note', title: 'Note · State and emotion verbs', paragraphs: ['For all the above tenses, note that we generally don’t use the continuous form with verbs which describe states or emotions (e.g. know, hate, understand, want).'] },
    section('c1-ref198-practice-1', 'Practice', '1', 'Complete the gaps with verbs in the present or past perfect simple. Where a continuous version fits, use it instead of the simple form.', questions('c1-ref198-gap', [
      'She {{}} (copy) her friend’s work for over a year, before one of her teachers found out.', 'The tsunami completely destroyed the bungalow where they {{}} (stay) just two days before.',
      'It was only after she had arrived that she realised she {{}} (forget) to bring her phone charger.', 'You are looking very sweaty. {{}} (you do) exercise this morning?',
      'I {{}} (repair) the gears on my mountain bike, so I can’t come with you until I’ve had a shower.', 'They {{}} (drive) for most of the morning, when they decided to stop off and have a picnic lunch.',
      'They {{}} (go) backpacking to India twice this year. Each visit was a disaster because of the foul weather.'
    ], 'gaps'))
  ], true),
  page('c1-ref199', 199, 'Future tenses', [
    { id: 'c1-ref199-will', title: 'Will / shall', paragraphs: ['We use will to talk about:'], bullets: [
      'Decisions or offers made at the time of speaking and for promises about the future: The car is so filthy after that long trip. I’ll take it to the car wash later today. (future intention)',
      'Those cases must weigh a ton! I’ll carry them upstairs for you. (offer)', 'I don’t have time today, but I can assure you I will finish it tomorrow. (promise)',
      'Predictions about the future. These sentences often include words and phrases such as I think, probably, in all probability, maybe, perhaps, it’s likely that, there is little prospect of that, sure. I’m sure you will pass your driving test. Maybe they’ll arrive a little later tonight.'
    ] },
    { id: 'c1-ref199-shall', title: 'Using shall', paragraphs: [
      'We can also use shall for decisions, offers and promises but not for predictions.', 'Those cases must weigh a ton! Shall I carry them upstairs for you?', 'I’m sure you will pass your driving test. (NOT: I’m sure you shall pass your driving test.)',
      'We mainly use shall for offers to express the idea to the listener of Do you want to …? Compare the following:', 'Shall we go and see that new Marvel movie? (= Do you want to go and see that new Marvel movie?)',
      'Will we go and see that new Marvel movie? (= Do you think this will happen?)'
    ] },
    { id: 'c1-ref199-going-to', title: 'Be going to + infinitive', paragraphs: ['Use be going to to talk about:'], bullets: [
      'Future intentions or plans that have already been decided before we speak. This contrasts with will, which is used for future intentions decided at the moment of speaking. Compare: I’m going to have a staycation this summer. (= I had already decided this before I said it.)',
      'A: The new PlayStation is available to buy online. B: Oh, is it? I will get online and buy it this evening. (= I have just decided to go online and buy it.)',
      'Predictions, especially if we have evidence to support the prediction: It’s going to snow. It’s minus two degrees and the sky is completely overcast.'
    ] },
    { id: 'c1-ref199-gonna', title: 'Note · Informal spoken English', paragraphs: ['In informal spoken English you may hear people use gonna instead of going to. However, it should not be used when writing:'],
      table: { headings: ['Spoken informal form', 'Written form'], rows: [['I’m gonna order a delicious takeaway for us tonight.', 'I’m going to order a delicious takeaway for us tonight.']] } },
    { id: 'c1-ref199-present-continuous', title: 'Present continuous for the future', paragraphs: [
      'We use the present continuous to talk about future arrangements. This is similar to be going to for future plans and intentions, but generally indicates that something has been agreed with someone else.',
      'My mother is having major heart surgery next week.', 'My sister and I are heading to a music festival this weekend.'
    ] },
    { id: 'c1-ref199-present-simple', title: 'Present simple to talk about the future', paragraphs: ['We use the present simple to talk about:'], bullets: [
      'A scheduled or arranged event at a known time in the future: My flight leaves at 11.30 this morning. The university term starts at the beginning of October.',
      'The future after a time phrase, especially in conditional sentences: As soon as I graduate, I’ll definitely start applying for jobs.'
    ] },
    section('c1-ref199-practice-1', 'Practice · Choose the correct option', '1', 'Choose the correct option.', [
      ['The last flight this evening … shortly before midnight.', ['departs', 'is departing']], ['They … a reunion meal this evening. It’s been ten years since they were at university together.', ['are having', 'have']],
      ['I think quite a large group of people … in the cultural event on Saturday.', ['participates', 'is participating']], ['The premiere of the film … at eight, so we should get there well before that to see the stars on the red carpet.', ['starts', 'is starting']],
      ['What career are you going to pursue when you … university?', ['finish', 'are finishing']]
    ].map(([prompt, options], i) => ex(`c1-ref199-choice-${i + 1}`, i + 1, prompt as string, 'radio', options as string[]))),
    section('c1-ref199-practice-2', 'Practice · Check and correct', '2', 'Tick the correct sentences. Correct the sentences with mistakes.', [
      'I thought I heard a noise in the basement. Will I go and see what caused it?', 'I’m confident that we meet up again in the near future.', 'Shall you always love me even when I’m old and grey?',
      'A: I am so sorry. I dropped the salad bowl as I was taking it out of the cupboard and it smashed on the floor.\nB: No problem. I get a pan and brush to sweep up the pieces.',
      'It’s coming up to 10 o’clock. You are going to be late for the lecture.', 'Remember that the trains are on strike this week, so we’ll drive to work.'
    ].flatMap((sentence, i) => [ex(`c1-ref199-tick-${i + 1}`, i + 1, sentence, 'checkbox', ['This sentence is correct']), ex(`c1-ref199-correct-${i + 1}`, `${i + 1} correction`, 'Correction (if needed)')]))
  ], true)
];
