import type { WorkbookExercise, WorkbookPage, WorkbookSection } from './classBooklets';

const ex = (id: string, number: number | string, prompt: string, kind: WorkbookExercise['kind'] = 'text', options?: string[]): WorkbookExercise => ({ id, number: String(number), prompt, kind, ...(options ? { options } : {}) });
const questions = (prefix: string, prompts: string[], kind: WorkbookExercise['kind'] = 'text', options?: string[]) => prompts.map((prompt, i) => ex(`${prefix}-${i + 1}`, i + 1, prompt, kind, options));
const section = (id: string, title: string, number: string, instructions: string, exercises: WorkbookExercise[] = []): WorkbookSection => ({ id, title, number, instructions, exercises });
const page = (id: string, sourcePage: number, title: string, sections: WorkbookSection[], reference = false): WorkbookPage => ({ id, sourcePage, title, instructions: reference ? 'Use these explanations and practice activities to support your lesson.' : 'Work through the activities with your teacher. Use the answer areas for your responses or speaking notes.', exercises: [], sections, reference });
const classmates = [
  'Where are you from?', 'What’s your favourite subject?', 'What’s your favourite hobby?',
  'How many brothers and sisters do you have?', 'What’s your favourite part of the day?',
  'What do you like to do at weekends?', 'What job would you like to have in the future?',
  'What do you like most about your hometown?', 'What’s your favourite kind of food?', 'Who are the most important people in your life?'
];
const topics = ['Hobbies and interests', 'Daily life', 'Family and friends', 'Education and work', 'Where you’re from'];
const messages = [
  { label: 'A', text: 'We 🕺💃 all evening.\nIt was 👍.' },
  { label: 'B', text: 'Yes! I’ve just bought 👠. ❤️?' },
  { label: 'C', text: 'Thanks for the reminder. I 😮 they’ve been 💍 for 30 years!' },
  { label: 'D', text: 'I’ve been 🏃 all day.\nI’m so 😴!' },
  { label: 'E', text: '😡! I’ve lost my 🔑 and now I can’t get into my 🚙.' }
];
const miranda = `OK, I admit it. I’m a big fan of emojis. You can’t stop me! There’s hardly a text I send out or a comment I post on social media which doesn’t have a big smiley face, a stylish flamenco dancer or a cute little puppy!
Initially, I was a bit sceptical. When emojis appeared a few years ago, my best friend used them all the time. My first impression was that they were a bit, well, childish. Why was she putting pictures all over her messages to me instead of expressing herself in words like the rest of us? But then whenever I was looking through social media, I realised I was always looking at her posts first! These bright red broken love-hearts and freshly sliced cucumbers, or whatever emoji she used, were working because I was looking at them!

These days, I can’t stop using emojis! Why? I hear you ask. Can’t you express yourself in words? Of course I can! But when you’re writing messages or responding to comments on social media, emojis help you to get your message across much quicker than writing out full sentences. What’s more, they’re universal, meaning that people who speak different languages to me can still understand how I’m feeling. They also make your message seem friendlier. That’s true even when you’re giving bad news, like refusing an invitation to see friends. Somehow people don’t seem to mind when you cancel plans with an emoji of a bunch of flowers! It doesn’t mean that every word can be replaced by an emoji, though, so it’s important to find a balance between the two forms of communication.`;
const alice = `The funniest thing happened to me and my friend on a recent trip to Germany. We went to Berlin, which is the biggest city in Germany. Actually, it’s as big as my home city in terms of land area, but it has a smaller population.

After a few days of exploring the city, we wanted to take the train to Hannover, which is about an hour and a half away from Berlin. My friend is much more confident than me and actually speaks better German, so she went to the ticket office to buy two train tickets. We decided to take the express train as it was faster than the regional train. It was nicer and more relaxing, too. We sat down in our seats and the train departed. We chatted the whole way and admired the beautiful view from the train window.

After an hour and a half, we arrived at our final destination. Hamburg! We realised then that we had somehow got on the wrong train. I couldn’t believe it! We ended up having a great time, even though we had originally planned to visit Hannover.`;
// Preserve the deliberate spelling mistakes: identifying them is the exercise.
const suitcase = `While I was walking back home, I came across a brite blue suitcase just behind a café next to my house. It was quite large and had a pink ribbon on the side of it. I looked for a label to see who it belonged to but it didn’t have one. As I only lived next door, I desided to take it home, open it up and see if there was a name or adress, anything that would help me find the owner.
The first thing I noticed when I opened it was a gorgous green dress. It was beautiful. So beautiful, in fact, that I tried it on!
I went back out, still wearing the dress. I was just turning the corner when I bumped into an old frend, who I hadn’t seen for a while. She was in town visiting her sister.
“Hey, nice dress!” she said. “I have one just like that. Well, actualy, I had one just like that.”
“What do you mean?” I asked.
“I left my suitcase here about 15 minutes ago. I walked off and just simply fergot about it. I don’t know where it is!”
“I think I know where it might be,” I said, feeling extremely embarassed.`;

export const b2Pages: WorkbookPage[] = [
  page('b2-p8', 8, 'Speaking · Getting to know your classmates', [
    { ...section('p8-speaking-1', 'Getting to know your classmates', '1', 'Write the questions under the correct topics. The first one has been done for you.'),
      paragraphs: ['Example: 1. Where are you from? → 5. Where you’re from'],
      exercises: classmates.slice(1).map((prompt, i) => ex(`p8-sort-${i + 2}`, i + 2, prompt, 'dropdown', topics.map((topic, n) => `${n + 1}. ${topic}`))) },
    { id: 'p8-topics', title: 'Question topics', cards: topics.map((topic, i) => ({ label: String(i + 1), text: topic })) }
  ]),
  page('b2-p9', 9, 'Speaking & vocabulary · Emotions', [
    section('p9-speaking-2', 'Speaking · Answer phrases', '2', 'Look at the phrases below. Which questions in Exercise 1 are they answering?', questions('p9-phrase', [
      'I come from … which is in …', 'I have one … and two …', 'One of my favourite subjects is … because …',
      'One of the best times of the day is … because …', 'In my city, there is a … which I love because …',
      'I would really like to be a … in the future because …', 'On Saturdays, I usually …', 'I’m really interested in …',
      'My … is an important person in my life because …', 'One thing I love eating is …'
    ], 'dropdown', classmates.map((q, i) => `${i + 1}. ${q}`))),
    section('p9-speaking-3', 'Speaking · Your questions', '3', 'Add one question of your own to each topic. Then talk to your classmates and ask and answer at least one question from each category. Use the phrases in Exercise 2 to help you.', questions('p9-own', topics)),
    section('p9-vocabulary-1', 'Vocabulary · Adjectives to describe emotions', '1', 'Work in pairs and answer the questions.', questions('p9-emoji-discussion', [
      'How often do you use emojis? Do you have a favourite emoji?', 'What are the benefits of using emojis?'
    ], 'long-text')),
    { id: 'p9-fact', title: 'Did you know?', paragraphs: ['The word emoji comes from the Japanese e (meaning “picture”) and moji (meaning “character”).'] },
    { ...section('p9-vocabulary-2', 'Vocabulary · Emoji matching', '2', 'Match the emojis (1–6) with the adjectives (A–F).'),
      cards: [{ label: '1', text: '😨' }, { label: '2', text: '😱' }, { label: '3', text: '😞' }, { label: '4', text: '😢' }, { label: '5', text: '😠' }, { label: '6', text: '😁' }],
      exercises: ['A. annoyed', 'B. delighted', 'C. disappointed', 'D. shocked', 'E. upset', 'F. worried'].map((word, i) => ex(`p9-match-${i}`, String.fromCharCode(65 + i), word.slice(3), 'dropdown', ['1', '2', '3', '4', '5', '6'])) },
    { ...section('p9-vocabulary-3', 'Vocabulary · Talk about emotions', '3', 'Work with a partner. When was the last time you felt the emotions in Exercise 2? Explain what happened.', [ex('p9-emotion-notes', 'Notes', 'Your speaking notes', 'long-text')]),
      paragraphs: ['The last time I was annoyed was when I missed the bus. I arrived one hour late for my English lesson!'] }
  ]),
  page('b2-p10', 10, 'Reading · Emojis', [
    { ...section('p10-reading-1', 'Text messages', '1', 'Look at five text messages (A–E) that Miranda sent in reply to her friends’ questions (1–5). Match the questions with the text messages.', questions('p10-match', [
      'What have you been up to?', 'What did you do last night?', 'Is everything ok?', 'Have you been shopping?', 'It’s Mum and Dad’s wedding anniversary this weekend.'
    ], 'dropdown', ['A', 'B', 'C', 'D', 'E'])), cards: messages },
    section('p10-reading-2', 'Put the messages into words', '2', 'Look at the emojis (A–E) in Exercise 1 again. Replace the emojis in the answers with words.', messages.map(message => ex(`p10-words-${message.label}`, message.label, message.text, 'long-text'))),
    { ...section('p10-reading-3', 'Miranda’s blog post', '3', 'Read Miranda’s blog post about using emojis and choose the best summary.', [ex('p10-summary', 'Summary', 'Choose the best summary', 'radio', [
      '1. Using emojis has had a negative impact on our written communication.', '2. There are a lot of benefits to using emojis.', '3. It’s better to express yourself with emojis than with words.'
    ])]), reading: { id: 'b2-miranda', title: 'A new way of communicating', text: miranda } }
  ]),
  page('b2-p11', 11, 'Reading & grammar · Present perfect review', [
    { ...section('p11-reading-4', 'Reading · True or false', '4', 'Read the text again. Decide if the statements are true or false.', questions('p11-tf', [
      'At first, Miranda loved emojis and used them all the time.', 'Miranda didn’t understand why her friend used emojis instead of words.',
      'Miranda noticed her best friend’s social media posts because she used emojis.', 'Miranda thinks it’s harder for people who speak different languages to understand emojis.',
      'Miranda believes that emojis can make a message less friendly.', 'Miranda thinks that people should always use emojis instead of words.'
    ], 'radio', ['True', 'False'])), relatedPage: 10 },
    section('p11-reading-5', 'Reading · Discussion', '5', 'Work in pairs and answer the questions.', questions('p11-discuss', [
      'Do you agree with Miranda that emojis help to get your message across much quicker than writing out full sentences?', 'Do you think emojis have a negative impact on written communication? Why? / Why not?'
    ], 'long-text')),
    { ...section('p11-reading-6', 'Reading · Group task', '6', 'Work in groups and complete the task.', [ex('p11-message', 'Message', 'Your message using emojis', 'long-text'), ex('p11-meaning', 'Meaning', 'What does the other group’s message mean?', 'long-text')]),
      bullets: ['Think of a message in English, then decide how you could say this using emojis.', 'Write the message for one of the other groups.', 'Exchange your messages with other groups. Decide what the other group’s message means.'] },
    { ...section('p11-grammar-1', 'Grammar · Present perfect review', '1', 'Look at Miranda’s text messages (A–E) in Reading Exercise 1 on page 10 again. Match the rules with the correct messages.', questions('p11-rule', [
      'We use the past simple for completed actions in the past.', 'We use the present perfect simple to focus on the result of a recent event.',
      'We use the simple form (not continuous) with stative verbs.', 'We use the present perfect continuous to emphasise the action rather than the result.',
      'We use the present perfect with the phrases just, already and yet (UK English).'
    ], 'dropdown', ['A', 'B', 'C', 'D', 'E'])), cards: messages, referencePage: 204 },
    section('p11-grammar-2', 'Correct the verbs', '2', 'Find and correct the mistakes in the verbs in the following sentences.', questions('p11-correct', [
      'I’ve been knowing Richard for about ten years.', 'I’ve sent him a message yesterday.', 'A: You look really tired.\nB: Yes, I am. I’ve painted the flat all afternoon.',
      'I’ve got my first phone when I was eighteen years old.', 'I didn’t see the new film yet.', 'Have you watched the documentary on TV last night?',
      'I lived in London for the past five months.', 'I’ve already been drinking three cups of coffee this morning.'
    ])),
    section('p11-grammar-3', 'Similar meanings', '3', 'Change the second sentence so that it has a similar meaning to the first, using the word given.', questions('p11-transform', [
      'I moved here six months ago.\nLIVING\nI {{}} for six months.',
      'What have you been up to recently?\nDOING\nWhat {{}} recently?',
      'I’m eating sushi for the first time.\nEATEN\nI {{}} sushi before.',
      'It’s been two years since I saw Robert.\nEACH\nRobert and I haven’t {{}} two years.',
      'Paulo and Antonia are married. They got married in 2016.\nBEEN\nPaulo and Antonia {{}} since 2016.'
    ], 'gaps')),
    { ...section('p11-grammar-4', 'Make questions', '4', 'Make questions using the present perfect simple or present perfect continuous.', questions('p11-questions', [
      'how long / learn / English', 'ever / visit / another continent', 'how long / live / present home', 'blogs / read / recently', 'most exciting thing / ever / do', 'ever / meet / a famous person'
    ]).map((item, i) => ({ ...item, number: String(i + 2) }))), paragraphs: ['1. best film / ever / see\nWhat’s the best film you’ve ever seen?'] },
    section('p11-grammar-5', 'Speaking practice', '5', 'Work with a partner. Ask and answer the questions in Exercise 4.', [ex('p11-speaking-notes', 'Notes', 'Your speaking notes', 'long-text')])
  ]),
  page('b2-p12', 12, 'Listening & grammar · Communication', [
    { ...section('p12-listening-1', 'Listening · A breakdown in communication', '1', 'Read the information about Poland. How similar or different is Poland to your country?', [ex('p12-poland', 'Notes', 'Similarities and differences', 'long-text')]),
      table: { headings: ['Fact', 'Poland'], rows: [
        ['Name', 'Poland'], ['Capital city', 'Warsaw'], ['Population', 'approx. 38 million'], ['Land size', 'approx. 312,679 km²'],
        ['Average temperature in winter (Warsaw)', '−2 °C'], ['Highest peak in Poland', 'approx. 2,500 m (Rysy Mountain)'],
        ['Border countries', 'Russia, Lithuania, Belarus, Slovakia, Ukraine, Czech Republic and Germany'], ['National symbol', 'White eagle'],
        ['National sport', 'Football (other popular sports include basketball, volleyball, ice hockey and cross-country skiing)'], ['Fun fact', '30% of Poland is covered by forest.']
      ] } },
    { ...section('p12-listening-2', 'Listening · Buying a tram ticket', '2 · Track 002', 'Listen to Andrew talking about buying a tram ticket in Poland. Answer the questions.', [
      ex('p12-listen-1', 1, 'When Andrew was in Poland, he was', 'radio', ['A. living alone.', 'B. living with other people.']),
      ex('p12-listen-2', 2, 'Why didn’t he ask for help to buy a tram ticket?', 'radio', ['A. His flatmates were busy.', 'B. He didn’t need any help.']),
      ex('p12-listen-3', 3, 'Andrew thought the woman at the kiosk couldn’t understand him because', 'radio', ['A. she couldn’t hear very well.', 'B. he wasn’t saying the words correctly.']),
      ex('p12-listen-4', 4, 'How many items did the woman give to Andrew?', 'radio', ['A. Two', 'B. Three']),
      ex('p12-listen-5', 5, 'Why did Andrew laugh?', 'radio', ['A. because the woman gave him the wrong items', 'B. because the woman finally understood what he was saying'])
    ]), paragraphs: ['Your teacher will play the audio over Zoom.'] },
    section('p12-listening-3', 'Listening · Discussion', '3', 'Work with a partner. Ask and answer the questions.', questions('p12-discuss', [
      'Have you ever been in a similar situation to Andrew? What happened?', 'How would you communicate with someone if you couldn’t speak each other’s language?'
    ], 'long-text')),
    { ...section('p12-grammar-1', 'Grammar · Comparatives and superlatives', '1', 'Read about Alice’s experience of taking the train in Germany. Have you ever been in a similar situation to Alice?', [ex('p12-alice-notes', 'Notes', 'Your experience', 'long-text')]),
      reading: { id: 'b2-alice', title: 'Alice’s trip to Germany', text: alice }, referencePage: 205 },
    section('p12-grammar-2', 'Underline the adjectives', '2', 'Read the text again. Underline the comparative and superlative adjectives. Use the Underline tool in Alice’s text above.')
  ]),
  page('b2-p13', 13, 'Grammar & writing · A story', [
    { ...section('p13-grammar-3', 'Grammar · Match the rules', '3', 'Match the comparative and superlative adjectives you underlined in Exercise 2 with the rules (1–7) below.', questions('p13-rules', [
      'For one-syllable adjectives, add -er to form the comparative and -est to form the superlative. For example: {{}} and {{}}',
      'For one-syllable adjectives that end in the letter e, add -r to form the comparative and -st to form the superlative. For example: {{}}',
      'For two-syllable adjectives that end in the letter y, remove -y, and add -ier to form the comparative and -iest to form the superlative. For example: {{}}',
      'For adjectives that have two or more syllables (that don’t end in -y), add the word more before the adjective to form the comparative and add the words the most before the adjective to form the superlative. For example: {{}} and {{}}',
      'For one-syllable adjectives that end in a vowel (a, e, i, o and u) and one of the consonants -b, -d, -g, -m, -n, -p or -t, repeat the last consonant and add -er to form the comparative and -est to form the superlative. For example: {{}}',
      'Some adjectives have irregular comparative and superlative forms. For example:\nbad → worse → the worst\ngood → {{}} → the best',
      'We use as + adjective + as to compare two things that are the same. For example: {{}}'
    ], 'gaps')), referencePage: 205, relatedPage: 12 },
    section('p13-grammar-4', 'Correct the questions', '4', 'Correct the mistakes in each of the questions.', questions('p13-correct', [
      'What is the better film you have ever seen?', 'What is the difficultest thing about learning English?', 'Would you prefer to live in the coldest or hotest place on earth?',
      'Is it easyer to learn a musical instrument or learn a new language?', 'Do you think that nurses should be paid as much money than footballers?', 'What’s the more expensive thing you have ever bought?'
    ])),
    section('p13-grammar-5', 'Speaking practice', '5', 'Work in pairs. Ask and answer the questions in Exercise 4.', [ex('p13-speaking', 'Notes', 'Your speaking notes', 'long-text')]),
    { ...section('p13-writing-1', 'Writing · A story', '1', 'You are going to read Sarah’s story about a lost suitcase. Before you read, look at the four pictures. Put them in order and predict what you think happens in the story.', [
      ex('p13-picture-order', 'Order', 'Write the picture letters in story order'), ex('p13-prediction', 'Prediction', 'What do you think happens?', 'long-text')
    ]), cards: [
      { label: 'A · Top left', text: '☕ 👗 Two women talking outside a café; one is wearing a green dress.' },
      { label: 'B · Top right', text: '🧳 👗 A woman at home holding a green dress taken from a blue suitcase.' },
      { label: 'C · Bottom left', text: '🚪 🧳 A woman taking a blue suitcase towards a doorway.' },
      { label: 'D · Bottom right', text: '☕ 🧳 A blue suitcase left outside a café.' }
    ], paragraphs: ['The four picture scenes are represented here as labelled cards. Use their letters to give your order.'] },
    { ...section('p13-writing-2', 'Sarah’s story', '2', 'Read the story and check your predictions. Then find and correct the eight spelling mistakes.', Array.from({ length: 8 }, (_, i) => ex(`p13-spelling-${i + 1}`, i + 1, 'Misspelt word → correction'))),
      reading: { id: 'b2-suitcase', title: 'The lost suitcase', text: suitcase } },
    section('p13-writing-3', 'While and when', '3', 'Study how Sarah uses the highlighted words while and when. Complete the sentences below with the correct form of the verbs in brackets.', questions('p13-while', [
      'While I {{}} (watch) TV, the phone {{}} (ring).', 'I {{}} (sit) on the sofa when suddenly there {{}} (be) a knock at the door.',
      'When I {{}} (walk) into the shop, the sales assistant {{}} (talk) to a customer.', 'I {{}} (break) a plate while I {{}} (prepare) dinner.'
    ], 'gaps')),
    { ...section('p13-writing-4', 'Write your story', '4', 'Write a story using 140–190 words. It must begin with the sentence below.', [{ ...ex('p13-story', 'Story', 'Your story', 'long-text'), wordTarget: '140–190 words' }]),
      paragraphs: ['While I was walking down the street, I found a small, gold ring on the pavement.'] }
  ]),
  page('b2-ref204', 204, 'Present perfect simple and continuous', [
    { id: 'ref204-simple', title: 'Present perfect simple: have + past participle', table: { headings: ['Positive', 'Negative', 'Question'], rows: [[
      'I’ve read the article in a newspaper.', 'She hasn’t had lunch.', 'Have they arrived yet?'
    ]] } },
    { id: 'ref204-continuous', title: 'Present perfect continuous: have been + present participle', table: { headings: ['Positive', 'Negative', 'Question'], rows: [[
      'I’ve been watching the match.', 'She hasn’t been waiting long.', 'Have they been working with you?'
    ]] }, paragraphs: ['Both the present perfect simple and present perfect continuous talk about something which started in the past.'], bullets: [
      'The present perfect simple is a completed action which has a result in the present: She’s passed her driving test, so now she can take the children to the day care centre herself.',
      'The present perfect continuous is an action which is still happening now: They’ve been working hard on their presentation, but it isn’t finished yet.'
    ] },
    { id: 'ref204-compare', title: 'The two tenses are often very similar in their usage. However:', table: { headings: ['Present perfect simple', 'Present perfect continuous'], rows: [
      ['Emphasises the result: They’ve worked on the environmental project all week and they’re going to present the final version tomorrow.', 'Emphasises the action: They’ve been working on the environmental project all week, but they’ve still got some way to go.'],
      ['Focuses on how much of an activity is complete: I’ve listened to all of the audio novels you recommended.', 'Focuses on how long an activity has been in progress: I’ve been listening to the audio novels you recommended and I’ve still got two left.'],
      ['Focuses on how many times an action has been repeated: We’ve watched that programme about celebrities several times.', 'Focuses on the process of change over a period of time and that the changes are not finished: My use of grammar has been getting more accurate since I started testing myself.']
    ] } },
    { id: 'ref204-note', title: 'Note · Stative verbs', paragraphs: [
      'Some verbs are not used in the continuous form, e.g. know, hate, understand, want.',
      'I’ve known Guy for a long time. (NOT: I’ve been knowing Guy for a long time.)',
      'I’ve understood everything you’ve outlined. (NOT: I’ve been understanding everything you’ve outlined.)'
    ] },
    section('ref204-practice-1', 'Practice', '1', 'Complete the sentences with either the present perfect simple or continuous.', questions('ref204-gaps', [
      'I {{}} (prepare) my presentation on mammals all week, but I {{}} (not finish) it yet.', 'What {{}} (you do)? Your hands are covered in dirt.',
      'Your parents {{}} (look) exhausted recently. Have they {{}} (work) too much?', 'I {{}} (not complete) my essay yet, because I {{}} (chill out) in the garden for over an hour.',
      'Have you got a plaster? I {{}} (do) some work around the house and I {{}} (damage) the nail on my thumb quite badly.',
      'I {{}} (be) to Spain several times this year. Every visit was really outstanding.', 'Recently the government {{}} (become) more aware of the need to promote music education.',
      'I {{}} (change) a wheel on my car, so I’m not really in the mood to go out.'
    ], 'gaps')),
    section('ref204-practice-2', 'Correct sentences', '2', 'Tick the correct sentences. Correct the sentences with mistakes.', [
      'The surgeon has just finished a nine-hour operation, so he’s exhausted.', 'I have finally been learning how to use the passive in English. I feel over the moon that I can do it at last.',
      'I can see that he has eaten too much recently. He’s gained a lot of weight.', 'The rain has been pouring down all day, so I chose to stay indoors.',
      'They haven’t mastered Chinese, but they can communicate at a basic level. That’s an incredible achievement!',
      'They have browsed for jobs in sport management for over four hours and still haven’t found anything.', 'I have gone to the weight lifting session every weekend for years.'
    ].flatMap((sentence, i) => [ex(`ref204-tick-${i + 1}`, i + 1, sentence, 'checkbox', ['This sentence is correct']), ex(`ref204-correct-${i + 1}`, `${i + 1} correction`, 'Correct the sentence if needed')]))
  ], true),
  page('b2-ref205', 205, 'Comparatives and superlatives', [
    section('ref205-perfect-3', 'Present perfect · Practice continued', '3', 'Make sentences with either the present perfect simple or continuous.', questions('ref205-perfect', [
      'Scientists / discover / vaccines / to cure / many fatal illnesses', 'He / not put / his recent qualifications on his CV / yet', 'Wake up! You / sleep for / over two hours now.',
      'We all feel thirsty, / because / as usual / not / drink enough / during training.', 'She / know him / since / he was a small child.', 'It snow / heavily / all morning / and as a result / the roads / are slippery now.'
    ])),
    { id: 'ref205-intro', title: 'Comparatives and superlatives', paragraphs: ['The form of comparatives and superlatives depends on the number of syllables in the original adjective or adverb.'] },
    { id: 'ref205-one', title: 'One-syllable adjectives', table: { headings: ['Adjective', 'Comparative', 'Superlative'], rows: [['high', 'higher', 'highest'], ['small', 'smaller', 'smallest']] } },
    { id: 'ref205-consonant', title: 'Adjective ending in a single consonant', table: { headings: ['Adjective', 'Comparative', 'Superlative'], rows: [['fat', 'fatter', 'fattest'], ['sad', 'sadder', 'saddest']] } },
    { id: 'ref205-two', title: 'Adjectives with two syllables', table: { headings: ['Adjective', 'Comparative', 'Superlative'], rows: [['clever', 'cleverer / more clever', 'cleverest / most clever'], ['narrow', 'narrower / more narrow', 'narrowest / most narrow']] } },
    { id: 'ref205-three', title: 'Adjectives with three or more syllables', table: { headings: ['Adjective', 'Comparative', 'Superlative'], rows: [['experienced', 'more experienced', 'most experienced'], ['inconvenient', 'more inconvenient', 'most inconvenient']] } },
    { id: 'ref205-y', title: 'Note · Adjectives ending in -y', paragraphs: ['Adjectives with two syllables, ending in -y, replace the y with i:'], table: { headings: ['Adjective', 'Comparative', 'Superlative'], rows: [['easy', 'easier', 'easiest'], ['happy', 'happier', 'happiest']] } },
    { id: 'ref205-irregular', title: 'Irregular forms', paragraphs: ['These very common adjectives have irregular comparative and superlative forms.'], table: { headings: ['Adjective', 'Comparative', 'Superlative'], rows: [
      ['good', 'better', 'best'], ['bad', 'worse', 'worst'], ['little', 'less', 'least'], ['much', 'more', 'most'], ['far', 'further / farther', 'furthest / farthest']
    ] } },
    section('ref205-practice-1', 'Practice', '1', 'Complete the sentences with the correct comparative or superlative.', questions('ref205-gaps', [
      'Today is the {{}} (bad) day I’ve had this year.', 'You call in sick {{}} (often) than everybody else in the class.', 'This questionnaire about energy use is the {{}} (complicated) I’ve ever completed.',
      'The conference on tropical diseases was the {{}} (memorable) I’ve ever attended.', 'The ferry from Staten Island to Manhattan is the {{}} (cheap) in the world. It’s free!', 'This shape is much {{}} (irregular) than the other one.'
    ], 'gaps')),
    section('ref205-practice-2', 'Put the words in order', '2', 'Put the words in order to make sentences with the comparative or superlative.', questions('ref205-order', [
      'His ambition / than / has always / his brother’s. / greater / been /', 'was as accurate / the report / Her analysis / the financial situation / as / in the magazine. / of /',
      'The lecturer is / since she started / less / work on her / available to her students / thesis.', 'His skills / are not / as fast / as people predicted. / developing /',
      'My interest in / considerably / than / the project is / greater now / it was / at the beginning.', 'ideally want. / high / My motivation is / as / not quite / as I would /',
      'than / There are slightly / living in / fewer people / ten years ago. / the town /', 'more / than by train. / It’s / to travel by car / considerably / exhausting /'
    ]))
  ], true)
];
