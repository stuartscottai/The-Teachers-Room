import type { WorkbookExercise, WorkbookPage, WorkbookSection } from './classBooklets';

const ex = (id: string, number: number | string, prompt: string, kind: WorkbookExercise['kind'] = 'text', options?: string[]): WorkbookExercise => ({ id, number: String(number), prompt, kind, ...(options ? { options } : {}) });
const questions = (prefix: string, prompts: string[], kind: WorkbookExercise['kind'] = 'text', options?: string[]) => prompts.map((prompt, i) => ex(`${prefix}-${i + 1}`, i + 1, prompt, kind, options));
const section = (id: string, title: string, number: string, instructions: string, exercises: WorkbookExercise[] = []): WorkbookSection => ({ id, title, number, instructions, exercises });
const page = (id: string, sourcePage: number, title: string, sections: WorkbookSection[], reference = false): WorkbookPage => ({ id, sourcePage, title, instructions: reference ? 'Use these explanations and practice activities to support your lesson.' : 'Work through the activities with your teacher. Use the answer areas for your responses or speaking notes.', exercises: [], sections, reference });
const photo = (source: 'interests' | 'occupations', alt: string, region: [number, number, number, number]) => ({ src: `/assets/class/b1-${source}-source.png`, alt, region, width: source === 'interests' ? 1882 : 1888, height: source === 'interests' ? 1344 : 1341 });
// Show just the useful photo regions in SVG viewports; exercise text is real HTML.
const interestPhotos = [
  { label: 'A', text: '', photo: photo('interests', 'A person snorkelling underwater', [520, 35, 390, 405]) },
  { label: 'B', text: '', photo: photo('interests', 'Two travellers in the mountains', [525, 795, 400, 275]) },
  { label: 'C', text: '', photo: photo('interests', 'Hands shaping a clay pot', [50, 1120, 380, 140]) },
  { label: 'D', text: '', photo: photo('interests', 'A woman choosing clothes', [575, 1110, 350, 195]) }
];
const occupationPhotos = [
  { label: 'A', text: '', photo: photo('occupations', 'A person preparing food in a kitchen', [990, 310, 180, 180]) },
  { label: 'B', text: '', photo: photo('occupations', 'A person working on a car engine', [1190, 325, 169, 165]) },
  { label: 'C', text: '', photo: photo('occupations', 'A person working in a garden', [999, 545, 170, 165]) },
  { label: 'D', text: '', photo: photo('occupations', 'A uniformed person talking to a member of the public', [1185, 550, 172, 166]) },
  { label: 'E', text: '', photo: photo('occupations', 'A person serving a customer at a shop counter', [991, 765, 180, 162]) },
  { label: 'F', text: '', photo: photo('occupations', 'A person cutting and styling hair', [1190, 790, 166, 140]) }
];
const celebrityPhotos = [
  { label: 'A', text: '', photo: photo('occupations', 'A gymnast wearing a USA team leotard', [1595, 430, 237, 370]) },
  { label: 'B', text: '', photo: photo('occupations', 'A young man wearing a grey suit at a film premiere', [1428, 725, 174, 342]) }
];
const blogs = `Blogs. So many people write them and even more people read them, but why?
Some people write a blog just for their friends and family. Maybe they want to share stories about their hobbies, such as dancing or music. Other bloggers want more readers and choose popular topics. For example, travel blogs or blogs about sports and fitness are often interesting for a lot of people. For some writers, blogging is a full-time occupation. Many blogs, about fashion or cooking for example, appear quickly in online search results and really make money. Arts and crafts blogs can also be successful. If you can make things yourself, why not show other people how to do that? A blog is a great way to share your talents!`;
const martina = `Hello! I’m Martina, an IT student. I share a nice little flat [1] … some good friends, and I’m a blogger in my spare time.
Lectures at university usually start at nine o’clock, but I get up at five. I make a cup [2] … coffee and check my emails and all my other messages. Then I start to write. Why do I get up so early? I just love this quiet time. It’s half past five now, and I’m sitting at my desk and feeling very happy.
I have a shower and then have breakfast at about eight o’clock. Then I go to university and I forget about my blog until 5 p.m. A lot of young people hang out with their friends [3] … the evenings. Not me. I never go out during the week. I have to work! I read and write for the whole evening, but I don’t go to bed late.
My friends are always telling me I should go out more, but during the holidays, I’m out all the time. My blog is a travel blog and I go out [4] … day when I’m travelling.
It’s the autumn term now, and I’m not travelling. So what am I writing? I’m creating pages on my blog that give people useful tips. I want [5] … tell everyone how to have a wonderful holiday in [6] … favourite places. Eventually, I’d like to be a full-time blogger.`;
const interview = `Reporter: Joey, you’re 18 and you’ve just finished school. Are you a full-time blogger now?
Joey: Yes! I [1] … (write) about celebrity sports people.
Reporter: But it’s not really a job, is it? How [2] … (you/earn) money with your blogs?
Joey: It is a job, and I earn money when I recommend sports products, for example. At the moment I [3] … (not earn) a lot of money, but I have a plan. I [4] … (work) on an amazing new blog.
Reporter: Exciting! So, you write about sports celebrities. [5] … (you/interview) them?
Joey: It’s hard to get interviews. Some sports people [6] … (not/understand) that it’s good to talk to bloggers. The blogging world [7] … (get) bigger and popular blogs are really important nowadays.`;
const routines = ['eat out', 'get up', 'go to school/work/college', 'hang out with', 'have a shower/bath', 'have breakfast/lunch/dinner', 'make lunch/dinner', 'meet up', 'work out'];
const frequencies = ['always', 'hardly ever', 'never', 'often', 'rarely', 'sometimes', 'usually'];
const occupations = ['chef', 'gardener', 'hairdresser', 'mechanic', 'police officer', 'sales assistant'];
const descriptions = ['She tries to stop crime and make the streets safe.', 'He cuts and styles hair.', 'She cooks at a restaurant.', 'She works in a garden.', 'He repairs cars.', 'He works in a shop.'];
const smallTalk = ['your school/university/job', 'your problems', 'people you both know', 'music/TV shows/films that you like', 'politics', 'your hobbies'];
const partyExpressions = ['Nice to meet you.', 'How are you?', 'Where are you from?', 'Really?', 'Me too.', 'What do you do?', 'I agree.', 'Do you like …-ing?', 'That sounds interesting.'];

export const b1Pages: WorkbookPage[] = [
  page('b1-p8', 8, 'Vocabulary · Personal interests', [
    { ...section('b1-p8-vocabulary-1', 'Personal interests · Photos', '1', 'Look at the photos. What interests and activities do they show?', interestPhotos.map(card => ex(`b1-p8-photo-${card.label}`, card.label, 'Interest or activity'))), cards: interestPhotos },
    { ...section('b1-p8-vocabulary-2', 'Telling your stories, sharing your talents', '2', 'Read the article and match the topic words with the photos.', ['travel', 'sports', 'fashion', 'arts and crafts'].map(word => ex(`b1-p8-match-${word}`, word, 'Choose a photo', 'dropdown', ['A', 'B', 'C', 'D']))),
      paragraphs: ['Topic words from the article: travel · sports · fashion · arts and crafts'], reading: { id: 'b1-blogs', title: 'Telling your stories, sharing your talents', text: blogs } },
    section('b1-p8-vocabulary-3', 'Your interests and hobbies', '3', 'Work in groups and write down as many personal interests and hobbies as you can in two minutes.', [ex('b1-p8-hobbies', 'Notes', 'Personal interests and hobbies', 'long-text')]),
    { ...section('b1-p8-vocabulary-4', 'Talking about activities', '4', 'Read the sentence and complete the rule.', [ex('b1-p8-rule', 'Rule', 'To say how we feel about an activity, we can use like/love/enjoy, etc. and a verb with {{}}.', 'gaps')]), paragraphs: ['I really enjoy listening to music, but I don’t like dancing.'] },
    section('b1-p8-vocabulary-5', 'Your favourite blogs', '5', 'What types of blog are you interested in and why?', [ex('b1-p8-blog-notes', 'Notes', 'Your answer', 'long-text')])
  ]),
  page('b1-p9', 9, 'Reading & vocabulary · Habits and routines', [
    { ...section('b1-p9-reading-1', 'Reading · A day in the life of a blogger', '1', 'Read the blog entry and write the word which best fits in the gap.', questions('b1-p9-blog-gap', ['Gap 1', 'Gap 2', 'Gap 3', 'Gap 4', 'Gap 5', 'Gap 6'], 'dropdown', ['every', 'in', 'my', 'of', 'to', 'with'])),
      paragraphs: ['Word bank: every · in · my · of · to · with'], reading: { id: 'b1-martina', title: 'A day in the life of a blogger', text: martina } },
    section('b1-p9-reading-2', 'Reading · Discussion', '2', 'Work in groups and discuss the questions.', questions('b1-p9-discuss', ['Do you think Martina’s life is unusual?', 'Would you like to have her life?'], 'long-text')),
    { ...section('b1-p9-vocabulary-1', 'Vocabulary · Habits and routines', '1', 'Look at the vocabulary. Put the words in the correct columns for you.', routines.filter(word => !['eat out', 'get up', 'go to school/work/college'].includes(word)).map(word => ex(`b1-p9-routine-${word}`, word, 'How often?', 'dropdown', ['Every day', 'Most days', 'Sometimes']))),
      paragraphs: [routines.join(' · ')], table: { headings: ['Every day', 'Most days', 'Sometimes'], rows: [['get up', 'go to college', 'eat out']] } },
    section('b1-p9-vocabulary-2', 'Complete the routines', '2', 'Complete the sentences with the correct form of the phrasal verbs and collocations from Exercise 1. You don’t need to use all the words.', questions('b1-p9-routine-gap', [
      'George cooks a lot at home, but he {{}} when he’s on holiday.', 'I sometimes wake up early, but I never {{}} before nine o’clock.',
      'Julie {{}} her friends all day every Saturday.', 'Let’s {{}} on Friday afternoon. We could go to the cinema or just have a coffee together.', 'Lou and Fiona {{}} at the gym three times a week.'
    ], 'gaps')),
    { ...section('b1-p9-vocabulary-3', 'Three facts about your routine', '3', 'Now tell your classmates three “facts” about your daily or weekly routine. One of them is not true.', questions('b1-p9-facts', ['Fact 1', 'Fact 2', 'Fact 3'])),
      paragraphs: ['I usually get up at five o’clock in the morning.', 'I eat out with my friends on Friday evenings.', 'I play ice hockey every weekend.', 'Your classmates ask questions until they can guess which “fact” is not true.', 'Why do you get up so early? · What restaurant do you go to? · Where do you play ice hockey?'] }
  ]),
  page('b1-p10', 10, 'Grammar · Present simple and present continuous', [
    { ...section('b1-p10-grammar-1', 'Match the sentences and complete the rules', '1', 'Match the sentences (1–3) with the descriptions (a–c), then complete the rules.', [
      ...questions('b1-p10-match', ['Martina gets up early.', 'She’s creating information pages for her blog.', 'She’s sitting at her desk and feeling very happy.'], 'dropdown', ['a. It’s happening right now.', 'b. It’s a temporary activity.', 'c. It’s a habit.']),
      ex('b1-p10-rule-1', 'Rule 1', 'We use the present {{}} to talk about habits and things that are generally true.', 'gaps'),
      ex('b1-p10-rule-2', 'Rule 2', 'We use the present {{}} to talk about things that are happening now or around now.', 'gaps'),
      ex('b1-p10-rule-3', 'Rule 3', 'We use the present {{}} to talk about a temporary activity.', 'gaps')
    ]), referencePage: 196 },
    { ...section('b1-p10-grammar-2', 'Questions in the two tenses', '2', 'Look at Martina’s blog on page 9. Find a question in the present simple and a question in the present continuous. Complete the rules.', [
      ex('b1-p10-simple-question', 'Present simple', 'Question from Martina’s blog'), ex('b1-p10-continuous-question', 'Present continuous', 'Question from Martina’s blog'),
      ex('b1-p10-question-rule', 'Rule', 'For questions in the present simple, we use {{}} or {{}} + the subject + the main verb.\nFor questions in the present continuous, we use a form of the verb {{}} + the subject + the main verb with -ing.', 'gaps')
    ]), relatedPage: 9 },
    section('b1-p10-grammar-3', 'Complete the questions', '3', 'Complete the questions. Use the present simple or present continuous and the verb in brackets.', questions('b1-p10-question-gap', [
      'What {{}} you {{}}? (do)\nI’m a student.', 'Where {{}} Toby {{}}? (work)\nIn an office in the city centre.',
      'It’s Sunday. Why {{}} Sue {{}} today? (work)\nBecause she’s preparing for a meeting tomorrow.', 'Who {{}} Emma {{}} coffee with? (have)\nShe’s having coffee with friends.'
    ], 'gaps')),
    { ...section('b1-p10-grammar-4', 'Negative sentences', '4', 'Look at Martina’s blog again. Find a negative sentence in the present simple and a negative sentence in the present continuous. Complete these sentences with isn’t or doesn’t.', questions('b1-p10-negative', ['Martina {{}} go to bed late.', 'She {{}} travelling at the moment.'], 'gaps')),
      relatedPage: 9, referencePage: 196, paragraphs: ['In the present simple, we use don’t or doesn’t to make negative sentences.', 'In the present continuous, we use isn’t and aren’t to make negative sentences.'] },
    { ...section('b1-p10-grammar-5', 'An interview with another blogger', '5', 'Complete the interview with another blogger. Use the present simple or present continuous.', questions('b1-p10-interview', [
      'I {{}} (write) about celebrity sports people.', 'How {{}} (you/earn) money with your blogs?', 'At the moment I {{}} (not earn) a lot of money, but I have a plan.',
      'I {{}} (work) on an amazing new blog.', '{{}} (you/interview) them?', 'Some sports people {{}} (not/understand) that it’s good to talk to bloggers.', 'The blogging world {{}} (get) bigger and popular blogs are really important nowadays.'
    ], 'gaps')), reading: { id: 'b1-joey', title: 'Reporter and Joey', text: interview } },
    section('b1-p10-grammar-6', 'Is blogging a real job?', '6', 'Discuss in pairs. Is blogging a real job? Do you know anyone who writes a blog?', [ex('b1-p10-discuss', 'Notes', 'Your discussion notes', 'long-text')])
  ]),
  page('b1-p11', 11, 'Vocabulary & listening · Occupations', [
    { ...section('b1-p11-vocabulary-1', 'Vocabulary · Occupations', '1', 'Match each photo (A–F) with an occupation in the box and the description of what the person does (1–6).', occupationPhotos.flatMap(card => [
      ex(`b1-p11-occupation-${card.label}`, card.label, 'Occupation', 'dropdown', occupations),
      ex(`b1-p11-description-${card.label}`, `${card.label} description`, 'What does the person do?', 'dropdown', descriptions.map((text, i) => `${i + 1}. ${text}`))
    ])), cards: occupationPhotos, paragraphs: [occupations.join(' · ')], table: { headings: ['Number', 'Description'], rows: descriptions.map((text, i) => [String(i + 1), text]) } },
    { ...section('b1-p11-vocabulary-2', 'Listening · A day at work', '2 · Track 002', 'Listen to a man talking about his day at work. What do you think his job is?', [ex('b1-p11-job', 'Job', 'What is his job?')]), paragraphs: ['Your teacher will play the audio over Zoom.'] },
    section('b1-p11-vocabulary-3', 'Guess the job', '3', 'Now think of a job. Make some notes and then tell your classmates about your day. They guess your job.', [ex('b1-p11-job-notes', 'Notes', 'Notes about your working day', 'long-text')]),
    { ...section('b1-p11-listening-1', 'Listening · Celebrity names', '1 · Track 003', 'Look at the photos below. Do you know who these people are? Listen and write the first name and surname of the celebrity in each information panel.', celebrityPhotos.flatMap(card => [
      ex(`b1-p11-${card.label}-first`, `${card.label} · 1`, 'First name'), ex(`b1-p11-${card.label}-surname`, `${card.label} · 2`, 'Surname')
    ])), cards: celebrityPhotos, paragraphs: ['Your teacher will play the audio over Zoom.'] },
    { ...section('b1-p11-listening-2', 'Spelling the names', '2', 'Can you spell the names? Check with your partner and then with the teacher.'), paragraphs: ['How do you spell …? · I think it’s …'] },
    { ...section('b1-p11-listening-3', 'Listening · Celebrity profiles', '3 · Track 004', 'Now listen to the profile of each celebrity and write the information in the panels. Listen again and check.', [
      ...['Occupation', 'Date of birth', 'Place of birth', 'Nationality', 'Siblings', 'Interests'].map((label, i) => ex(`b1-p11-A-profile-${i + 3}`, `A · ${i + 3}`, label === 'Nationality' ? 'Nationality: Belizean and …' : label === 'Occupation' ? 'Occupation: gymnast (given)' : label)),
      ...['Occupation', 'Nationality', 'Date of birth', 'Place of birth', 'Siblings', 'Interests'].map((label, i) => ex(`b1-p11-B-profile-${i + 3}`, `B · ${i + 3}`, label))
    ].filter(item => item.id !== 'b1-p11-A-profile-3')), paragraphs: ['A · 3. Occupation: gymnast (given). A · 6. Nationality: Belizean and …', 'First names and surnames are entered in Exercise 1 above. Your teacher will play the audio over Zoom.'] },
    section('b1-p11-listening-4', 'A celebrity from your country', '4', 'Work in pairs. Write a short profile of a celebrity from your country. Read it to your partner, but don’t say the person’s name. Can they guess who the celebrity is?', [ex('b1-p11-celebrity-profile', 'Profile', 'Your celebrity profile', 'long-text')])
  ]),
  page('b1-p12', 12, 'Grammar & writing · Habits and a personal profile', [
    { ...section('b1-p12-grammar-1', 'Grammar · Adverbs of frequency', '1', 'Look at these sentences and answer the questions.', questions('b1-p12-frequency-rule', ['Where does the adverb of frequency usually go in a sentence?', 'Where does it go if the verb is be?'])),
      paragraphs: ['Lectures at university usually start at nine o’clock.', 'I never tell reporters about my plans.', 'A blogger’s life is sometimes hard.'], referencePage: 197 },
    { ...section('b1-p12-grammar-2', 'Order the adverbs', '2', 'Put the words in the box on the line in the correct order.', questions('b1-p12-frequency-order', ['Position 1 (upper left)', 'Position 2 (upper right)', 'Position 3 (lower left)', 'Position 4 (lower right)'], 'dropdown', frequencies)),
      paragraphs: [frequencies.join(' · '), 'The line runs from NEVER (0%) to ALWAYS (100%). SOMETIMES is already in the middle.'], table: { headings: ['From 0% to 100%'], rows: [['NEVER → [3] → [1] → SOMETIMES → [4] → [2] → ALWAYS']] } },
    section('b1-p12-grammar-3', 'What’s true for you?', '3', 'What’s true for you? Complete the sentences with adverbs of frequency.', questions('b1-p12-frequency-gap', [
      'I {{}} get up before six o’clock.', 'I {{}} have breakfast before I go out.', 'I {{}} go to school/university/work by bus.',
      'I {{}} have time to relax in the afternoons.', 'My friends {{}} visit me at home.', 'We {{}} hang out together in the evenings.'
    ], 'gaps')),
    { ...section('b1-p12-grammar-4', 'Ask about your partner’s habits', '4', 'Work in pairs. Ask three questions each about your partner’s habits. Use How often …? or When … usually …?', questions('b1-p12-habits', ['Question and answer 1', 'Question and answer 2', 'Question and answer 3'], 'long-text')),
      paragraphs: ['How often do you usually go to the cinema? · I hardly ever go to the cinema.'] },
    { ...section('b1-p12-grammar-5', 'Present continuous with always', '5', 'Read the sentences and complete the rule.', [ex('b1-p12-always-rule', 'Rule', 'To say that something happens too often, and that we don’t like it, we can use the present {{}} with always. We put always between be and the {{}} with -ing.', 'gaps')]),
      paragraphs: ['Mark is always talking about himself.', 'My friends are always telling me I should go out more.'], referencePage: 197 },
    section('b1-p12-grammar-6', 'Write sentences with always', '6', 'Write sentences using the present continuous and always.', questions('b1-p12-always', [
      'I / always / forget / my telephone number.', 'My sister / always / take / my phone.', 'Our teacher / always / give / us extra homework.', 'He / always / complain / about my work.'
    ])),
    { ...section('b1-p12-grammar-7', 'Something you don’t like', '7', 'Tell the class about a person who is always doing something that you don’t like.', [ex('b1-p12-complaint', 'Notes', 'Your speaking notes', 'long-text')]), paragraphs: ['My brother is always complaining about food.'] },
    { ...section('b1-p12-writing-1', 'Writing · A personal profile', '1', 'Imagine you are starting to write your own blog. You need to write a short profile of yourself on the About Me page.', [ex('b1-p12-profile', 'Profile', 'Your personal profile', 'long-text')]),
      bullets: ['your name, age, nationality and occupation', 'some information about your everyday routines', 'some information about your interests and things you love doing'], paragraphs: ['Begin like this: Hello! My name … Welcome to my blog.'] }
  ]),
  page('b1-p13', 13, 'Speaking · Introducing yourself', [
    { ...section('b1-p13-speaking-1', 'Introducing yourself', '1', 'Work in pairs and discuss the questions.', questions('b1-p13-introductions', [
      'When do you introduce yourself with your first name only?', 'When do you tell people your first name and your surname?', 'When do you say “Nice to meet you”?', 'What are some simple answers to “How are you”?'
    ], 'long-text')), referencePage: 198 },
    section('b1-p13-speaking-2', 'Small talk', '2', 'Choose the topics you think are good for small talk when you meet a new person.', [ex('b1-p13-topics', 'Topics', 'Good topics for small talk', 'checkbox', smallTalk)]),
    { ...section('b1-p13-speaking-3', 'Listening · A conversation at a party', '3 · Track 005', 'Listen to two women talking at a party and tick the expressions that you hear.', [ex('b1-p13-expressions', 'Expressions', 'Expressions you hear', 'checkbox', partyExpressions)]), paragraphs: ['Your teacher will play the audio over Zoom.'] },
    { ...section('b1-p13-speaking-4', 'Intonation · Sounding interested', '4 · Track 006', 'You will hear three short dialogues twice. In which dialogue does the second speaker, Sam, sound interested? Tick a or b.', questions('b1-p13-intonation', [
      'Karen: I go swimming every morning.\nSam: Really?', 'Karen: I think everyone should have a hobby.\nSam: I agree.', 'Karen: I love watching winter sports on TV.\nSam: Me too.'
    ], 'radio', ['a', 'b'])), paragraphs: ['Intonation is the way our voices go up and down when we speak. If your intonation is very flat, you don’t sound interested.', 'Your teacher will play the audio over Zoom.'] },
    { ...section('b1-p13-speaking-5', 'Role-play · At a party', '5', 'Work in pairs. You and your partner are at a party. You don’t know each other, but you want to start talking. Role-play the conversation. Begin like this:', [ex('b1-p13-roleplay', 'Notes', 'Your conversation notes', 'long-text')]), paragraphs: ['Hi! I’m … What’s your name?'] }
  ]),
  page('b1-ref196', 196, 'Present simple and present continuous', [
    { id: 'b1-ref196-simple-forms', title: 'Present simple · Positive and negative forms', table: { headings: ['Subject', 'Positive', 'Negative'], rows: [
      ['I / You / We / They', 'take photos.', 'don’t take photos.'], ['He / She / It', 'takes photos.', 'doesn’t take photos.']
    ] } },
    { id: 'b1-ref196-simple-questions', title: 'Present simple · Questions and short answers', table: { headings: ['Question', 'Yes', 'No'], rows: [
      ['Do I / you / we / they take photos?', 'Yes, I / you / we / they do.', 'No, I / you / we / they don’t.'], ['Does he / she / it take photos?', 'Yes, he / she / it does.', 'No, he / she / it doesn’t.']
    ] }, bullets: ['We can use the present simple to talk about something that happens regularly (and habits and routines): I play tennis every Tuesday.', 'Something that is generally true and permanent at the present time: My brother lives in France.', 'Something that is a fact or always true: The sun rises in the east.'] },
    { id: 'b1-ref196-continuous-forms', title: 'Present continuous · Positive and negative forms', table: { headings: ['Subject', 'Positive', 'Negative'], rows: [
      ['I', 'am / ’m working at the moment.', 'am / ’m not working at the moment.'], ['You / We / They', 'are / ’re working at the moment.', 'are not / aren’t / ’re not working at the moment.'], ['He / She / It', 'is / ’s working at the moment.', 'is not / isn’t / ’s not working at the moment.']
    ] } },
    { id: 'b1-ref196-continuous-questions', title: 'Present continuous · Questions and short answers', table: { headings: ['Question', 'Yes', 'No'], rows: [
      ['Am I working at the moment?', 'Yes, I am.', 'No, I am / ’m not.'], ['Are you / we / they working at the moment?', 'Yes, you / we / they are.', 'No, you / we / they are not / aren’t.'], ['Is he / she / it working at the moment?', 'Yes, he / she / it is.', 'No, he / she / it is not / isn’t.']
    ] }, bullets: ['We can use the present continuous to talk about something happening now: They’re living with friends while their house is being decorated.', 'A temporary situation which is true now: He’s doing his homework in his bedroom.', 'A temporary situation in the present but not necessarily at the moment: My sister’s studying art.'] },
    { ...section('b1-ref196-practice-1', 'Practice · Cycling', '1', 'Choose the correct options to complete the text. Sometimes there may be more than one possible answer.', [
      ['take up', 'are taking up'], ['helps', 'is helping'], ['use up', 'are using up'], ['walk', 'are walking'], ['go', 'am going'], ['train', '’m training'], ['spend', '’m spending']
    ].map((options, i) => ex(`b1-ref196-choice-${i + 1}`, i + 1, `Choose the option(s) for gap ${i + 1}`, 'checkbox', options))),
      reading: { id: 'b1-cycling', title: 'Cycling', text: 'Many people [1] … cycling these days. Cycling is great because it [2] … our general fitness. When we cycle, we [3] … more energy than when we [4] …. I [5] … cycling regularly, but only on small roads where there aren’t many cars. At the moment, I [6] … for a race, so I [7] … a lot of time on my bike.' } }
  ], true),
  page('b1-ref197', 197, 'Adverbs of frequency and question words', [
    { id: 'b1-ref197-frequency', title: 'Adverbs of frequency', paragraphs: [
      'always (100%) → usually → often → sometimes → occasionally → hardly ever → rarely → never (0%)',
      'We usually put frequency adverbs before the main verb.', 'I usually/sometimes/rarely/never go to college in the evening.', 'I don’t often go to college at the weekend.',
      'We don’t use never, rarely, hardly ever and always at the beginning or end of sentences, but we can use sometimes and occasionally at the beginning or end of sentences.', 'Sometimes, it snows in April.',
      'We put frequency adverbs after the verb be.', 'I am often ill in the winter.', 'She is usually at college at eight o’clock.',
      'There are other expressions that we can use to talk about frequency. These expressions are used at the beginning or end of sentences, not in the middle.', 'On Fridays, I go to college by bike.', 'I see my best friend once a week.'
    ], bullets: ['every day, every week, every month, every year …', 'once a day, twice a week, three times a month, four times a year …', 'on Fridays, at weekends …', 'most days, most nights, most weeks …'] },
    section('b1-ref197-frequency-practice', 'Practice · Adverbs of frequency', '1', 'Put the words in order to make sentences.', questions('b1-ref197-frequency-order', [
      'a / go / gym / I / the / to / twice / week.', 'an / hour / I / more / hardly ever / spend / than / there.', 'an / for / half / hour. / I / run / sometimes',
      'I / I’m / listen / music / running. / to / usually / while', 'always / exhausted. / gets / home / he’s / when / he', 'every / Friday. / friends / go / we / our / out / with', 'rarely / watch / TV / you / the / week. / during'
    ])),
    { id: 'b1-ref197-always', title: 'Present continuous with always', paragraphs: [
      'We usually use adverbs of frequency with the present simple. But we can use always with the present continuous to say that something we don’t like happens repeatedly or frequently.',
      'We put always between be and the verb with -ing.', 'John is always complaining about work.', 'My parents are always telling me I shouldn’t drink too much coffee.'
    ] },
    section('b1-ref197-always-practice', 'Practice · Present continuous with always', '1', 'Write sentences with the present continuous. Put always in the correct part of the sentence.', questions('b1-ref197-always', [
      'He / forget / my birthday.', 'My friends / ring / me late at night.', 'Our tennis trainer / tell / us to train hard.', 'She / talk / about her job.', 'They / eat / crisps.'
    ])),
    { id: 'b1-ref197-wh', title: 'Wh- question words', paragraphs: ['We use question words to ask certain types of questions.', 'We call these words Wh- words because they contain the letters w and h (Why, What, How).'], referencePage: 198,
      table: { headings: ['Question word', 'Use', 'Example'], rows: [
        ['What', 'asking for information', 'What is your name?'], ['What … for', 'asking why', 'What did you do that for?'], ['When', 'asking about time', 'When did she arrive?'],
        ['Where', 'asking about place', 'Where do you live?'], ['Which', 'asking about choice', 'Which size do you want?'], ['Who', 'asking which person', 'Who opened the door?'],
        ['Whose', 'asking about ownership', 'Whose is this bag?'], ['Why', 'asking for a reason', 'Why did you do that?'], ['How', 'asking about manner or quality', 'How is the cake?'],
        ['How far', 'asking about distance', 'How far is your college from here?'], ['How long', 'asking about length', 'How long is the journey?'], ['How many', 'asking about quantity (countable)', 'How many people are there?'],
        ['How much', 'asking about quantity (uncountable)', 'How much sugar do you like in your tea?'], ['How old', 'asking about age', 'How old is she?']
      ] } }
  ], true),
  page('b1-ref198', 198, 'Wh- questions, yes/no questions and short answers', [
    { ...section('b1-ref198-wh-practice-1', 'Practice · Question words', '1', 'Complete the questions with the correct question words.', questions('b1-ref198-wh', [
      '{{}} do you live?\nI live in New York.', '{{}} is that man?\nHe’s my father.', '{{}} do you go to work?\nBy car.', '{{}} does the supermarket open?\nAt eight o’clock.', '{{}} are you wearing that coat?\nBecause it’s cold!'
    ], 'gaps')), relatedPage: 197 },
    { ...section('b1-ref198-wh-practice-2', 'Practice · Questions about specific words', '2', 'Complete the questions about the target words.', questions('b1-ref198-target', [
      'He drank water. (Target: water)\n{{}} did he drink?', 'They went to London. (Target: London)\n{{}} did they go?', 'She writes computer programs. (Target: computer programs)\n{{}} does she write?',
      'The town hall is next to the theatre. (Target: next to the theatre)\n{{}} is the town hall?', 'My new bike was very expensive. (Target: very expensive)\n{{}} did it cost?', 'She’s only 22 years old. (Target: 22 years)\n{{}} old is she?'
    ], 'gaps')), relatedPage: 197 },
    { id: 'b1-ref198-yesno', title: 'Yes/no questions', paragraphs: ['We call questions that need either a yes or a no answer yes/no questions.', 'Do you like milk in your coffee? (answer: yes or no)', 'Have you ever been to Dubai? (answer: yes or no)'],
      table: { headings: ['Examples', 'More examples'], rows: [
        ['Is she Polish?', 'Were you in London last week?'], ['Does that taste good?', 'Did you eat out at the weekend?'], ['Has he seen that film?', 'Had they visited New York before?'], ['Modal: Could you help me move the sofa?', 'Should I start work now?']
      ] } },
    { id: 'b1-ref198-short', title: 'Short answers to yes/no questions', paragraphs: [
      'It is more polite to answer a yes/no question with more than just Yes or No! That’s why short answers are often used.',
      'To form a short answer, we use the first word from the question, which is either an auxiliary verb or part of the verb be.'
    ], table: { headings: ['Question', 'Positive', 'Negative'], rows: [
      ['Do we know them?', 'Yes, we do.', 'No, we don’t.'], ['Can he see us?', 'Yes, he can.', 'No, he can’t.'], ['Have they seen the film?', 'Yes, they have.', 'No, they haven’t.'], ['Is she here?', 'Yes, she is.', 'No, she isn’t.']
    ] } },
    { id: 'b1-ref198-short-note', title: 'Note · You in short answers', paragraphs: ['If the question starts with Are you, we answer I am if you refers to one person, or we are if it refers to two.'], table: { headings: ['Question', 'Positive', 'Negative'], rows: [
      ['Do you know them?', 'Yes, I / we do.', 'No, I / we don’t.'], ['Are you thirsty? (one person)', 'Yes, I am.', 'No, I’m not.'], ['Are you thirsty? (two people)', 'Yes, we are.', 'No, we aren’t.']
    ] } },
    section('b1-ref198-yesno-practice-1', 'Practice · Yes/no questions', '1', 'Put the words in order to make yes/no questions.', questions('b1-ref198-yesno-order', [
      'at / living / she / moment? / England / is / in / the', 'a / he / bank / now? / does / work / in', 'project? / could / help / you / me / with / my', 'they / moment? / holiday / are / on / at / the', 'the / do / soup? / like / of / you / taste / the'
    ])),
    section('b1-ref198-yesno-practice-2', 'Practice · Short answers', '2', 'Complete the possible short answers.', questions('b1-ref198-short-gap', [
      'Are you from Italy, Franco?\nYes, {{}}. No, {{}}.', 'Are Jack and Peter your friends?\nYes, {{}}. No, {{}}.', 'Has your brother got a flat in town?\nYes, {{}}. No, {{}}.',
      'Can he play chess?\nYes, {{}}. No, {{}}.', 'Is she coming by train?\nYes, {{}}. No, {{}}.', 'Did you see him at the party?\nYes, {{}}. No, {{}}.'
    ], 'gaps'))
  ], true)
];
