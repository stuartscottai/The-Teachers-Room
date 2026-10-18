import { GameType, type GeneratedGame, type GeneratedQuestion } from '../types';

// Authored only for the local recording route. Each board has real, varied content.
type Entry = [string, string, string, string, string];
const discoveries: Entry[] = [
  ['Which ocean is the largest?', 'Pacific', 'Atlantic', 'Indian', 'Arctic'],
  ['How many sides does a hexagon have?', 'Six', 'Five', 'Seven', 'Eight'],
  ['Which country is home to the pyramids of Giza?', 'Egypt', 'Greece', 'India', 'Mexico'],
  ['What do bees collect from flowers?', 'Nectar', 'Sand', 'Salt', 'Snow'],
  ['Which animal can change colour to blend in?', 'Chameleon', 'Zebra', 'Penguin', 'Elephant'],
  ['What is twelve multiplied by eight?', '96', '86', '108', '88'],
  ['Which instrument has keys and pedals?', 'Piano', 'Violin', 'Trumpet', 'Drum'],
  ['Which gas do plants absorb for photosynthesis?', 'Carbon dioxide', 'Helium', 'Hydrogen', 'Neon'],
  ['Which two colours mix to make purple?', 'Red and blue', 'Red and yellow', 'Blue and green', 'Yellow and green'],
  ['What is the capital city of Japan?', 'Tokyo', 'Seoul', 'Beijing', 'Bangkok'],
  ['How many minutes are in a quarter of an hour?', '15', '20', '25', '30'],
  ['Which part of a plant takes in water?', 'Roots', 'Flowers', 'Petals', 'Fruit'],
  ['What is the past tense of swim?', 'Swam', 'Swimmed', 'Swum', 'Swimming'],
  ['Which shape has three sides?', 'Triangle', 'Square', 'Pentagon', 'Circle'],
  ['Which bird is famous for its colourful tail?', 'Peacock', 'Sparrow', 'Crow', 'Robin'],
  ['Which planet has the most prominent rings?', 'Saturn', 'Mercury', 'Earth', 'Venus'],
  ['What is the opposite of enormous?', 'Tiny', 'Tall', 'Wide', 'Heavy'],
  ['How many legs does a spider have?', 'Eight', 'Six', 'Ten', 'Four'],
  ['Which season comes after summer?', 'Autumn', 'Winter', 'Spring', 'Summer'],
  ['Which material is attracted to a magnet?', 'Iron', 'Wood', 'Glass', 'Paper'],
  ['What is the largest land animal?', 'Elephant', 'Giraffe', 'Lion', 'Rhino'],
  ['Which sport uses a racket and a shuttlecock?', 'Badminton', 'Tennis', 'Cricket', 'Hockey'],
  ['Which fraction is equal to one half?', 'Two quarters', 'One quarter', 'Three quarters', 'One third'],
  ['What do we call water in its solid state?', 'Ice', 'Steam', 'Rain', 'Mist'],
  ['Which organ pumps blood around the body?', 'Heart', 'Lungs', 'Stomach', 'Brain'],
];
const wordClues: Array<[string, string]> = [
  ['A person who travels into space.', 'Astronaut'], ['A vehicle with two wheels and pedals.', 'Bicycle'],
  ['A person who prepares food in a restaurant.', 'Chef'],
  ['A musical instrument you hit with sticks.', 'Drum'], ['A very large animal with a trunk.', 'Elephant'],
  ['A story that is not based on real events.', 'Fiction'], ['A place where flowers and vegetables grow.', 'Garden'],
  ['A building where sick people receive care.', 'Hospital'], ['Frozen water.', 'Ice'],
  ['A sweet spread made from fruit.', 'Jam'], ['You use this to open a locked door.', 'Key'],
  ['A place where you can borrow books.', 'Library'], ['A drawing that shows roads and places.', 'Map'],
  ['The time of day when it is dark.', 'Night'], ['A very large area of salt water.', 'Ocean'],
  ['A person who paints pictures.', 'Painter'], ['The wife of a king can have this title.', 'Queen'],
  ['A colourful arc in the sky after rain.', 'Rainbow'], ['The closest star to Earth.', 'Sun'],
  ['A vehicle that travels on railway tracks.', 'Train'], ['Something that keeps you dry in the rain.', 'Umbrella'],
  ['A mountain that can erupt with lava.', 'Volcano'], ['A timepiece worn on your wrist.', 'Watch'],
  ['An instrument with wooden bars you strike.', 'Xylophone'], ['A colour shared by lemons and bananas.', 'Yellow'],
];
const offsets: Partial<Record<GameType, number>> = {
  [GameType.JEOPARDY]: 0, [GameType.MILLIONAIRE]: 1, [GameType.PUB_QUIZ]: 2,
  [GameType.DARTS]: 3, [GameType.SNAKES_LADDERS]: 4, [GameType.TIME_BOMB]: 5,
  [GameType.TRIVIA]: 6, [GameType.BLOCK_BEATERS]: 7,
};
const make = (entry: Entry, id: number, points = 100): GeneratedQuestion => ({
  id, question: entry[0], answer: entry[1], options: entry.slice(1), points, isBonus: false,
});
export const preparePromoGame = (game: GeneratedGame): GeneratedGame => {
  const offset = offsets[game.config.type] || 0;
  const questions = Array.from({ length: 24 }, (_, i) => make(discoveries[(i + offset) % discoveries.length], i + 1));
  const next: GeneratedGame = {
    ...game, title: 'The discovery challenge',
    config: { ...game.config, topic: 'Classroom discovery', questionCount: 24 }, questions,
    jeopardyBoard: ['Our world', 'Think it through', 'Nature', 'Word power', 'Discovery'].map((name, col) => ({
      name, questions: Array.from({ length: 5 }, (_, row) => make(discoveries[col * 5 + row], 101 + col * 5 + row, (row + 1) * 100)),
    })),
    pubQuizRounds: ['Around the world', 'Brilliant science', 'Words and wonders', 'The final challenge'].map((name, round) => ({
      name, questions: questions.slice(round * 6, round * 6 + 6),
    })),
  };
  if (game.config.type === GameType.WORD_WHEEL) {
    // X and Z use 'contains', matching the game's contains-hard letter rule.
    const words: Array<[string, string]> = [...wordClues, ['A black-and-white striped animal.', 'Zebra']];
    next.title = 'A world of words';
    next.questions = words.map(([question, answer], i) => ({ id:i+1, question, answer,
      letter: String.fromCharCode(65+i), points:100, isBonus:false, answerAliases:[] }));
    next.config.questionCount = next.questions.length;
  }
  if (game.config.type === GameType.TIME_BOMB) {
    // This mode advances immediately after a correct answer. Give its entire
    // filmed sequence a separate maths pool so follow-on cards cannot repeat
    // another mode's featured question.
    next.title = 'Beat the maths clock';
    next.questions = Array.from({ length:24 }, (_, i) => {
      const a=i===0 ? 12 : i+3;
      const b=i===0 ? 8 : (i%6)+2;
      const answer=a*b;
      return make([`What is ${a} multiplied by ${b}?`,String(answer),String(answer+3),String(answer-2),String(answer+10)],i+1);
    });
  }
  if (game.config.type === GameType.SURVEY_SHOWDOWN) {
    next.title = 'A day at the park';
    next.questions = [{ id:1, question:'Name something you might see in a park.', answer:'Trees', points:100, isBonus:false,
      surveyAnswers: [
        {text:'Trees',score:25,alts:['tree']}, {text:'Dogs',score:20,alts:['dog']},
        {text:'Flowers',score:15,alts:['flower']}, {text:'Children',score:10,alts:['kids']},
        {text:'Benches',score:8,alts:['bench']}, {text:'Birds',score:7,alts:['bird']},
        {text:'Grass',score:5,alts:[]}, {text:'A playground',score:4,alts:['playground']},
        {text:'Bicycles',score:3,alts:['bikes']}, {text:'A fountain',score:3,alts:['fountain']},
      ] }];
    next.config.questionCount = 1;
  }
  return next;
};
