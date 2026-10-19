import React from 'react';
import { GameTypeLandingPage, type GameTypePageContent } from '../components/games/shared/GameTypeLandingPage';

const content: GameTypePageContent = {
  slug: 'plinkemoji',
  name: 'Plinkemoji',
  intro: 'A good answer earns a drop. Pick your entry, release your emoji chip and watch it bounce through an electric board towards points and stars.',
  note: 'Bring up to six teams together around one screen. Your questions lead the game; every drop brings a new surprise.',
  heroAlt: 'A gold and purple Plinkemoji board with bouncing emoji chips, electric blue sides and golden prize boxes',
  galleryIntro: 'Answer together, time your drop and discover what your next bonus can do.',
  galleryNote: 'Every round changes the challenge. More pegs and prize boxes join the board, while pocket values rise and stars open up new bonus choices.',
  screenshots: [
    { name: 'board', title: 'One answer. A whole lot of bounce.',
      alt: 'Plinkemoji game board with ten entry points, electric sides, prize boxes and team scores',
      text: 'Choose one of ten entry points after a correct answer. Earn points from pegs, break open the prize-box tops and find out where your emoji lands.' },
    { name: 'question', title: 'Your lesson takes centre stage.',
      alt: 'A Plinkemoji question card with a classroom question and multiple-choice answers',
      text: 'The question card slides into view for the whole class. Discuss the answer, make your choice and check it together before returning to the board.' },
    { name: 'bonuses', title: 'Stars bring a new kind of turn.',
      alt: 'Plinkemoji character bonuses offered beside the board after collecting stars',
      text: 'Collect stars in the prize boxes to reveal random bonus choices next round. Pick one and send a dragon, lizard, tornado or another playful character into action.' },
  ],
  features: [
    ['Bring your own questions', 'Write your questions or ask AI to draft a set for your topic. Review and edit the content before your class plays.'],
    ['Choose the pace', 'Set the number of rounds, the points earned from pegs and how much the pocket values increase. Keep the question timer off or add a countdown.'],
    ['Give each team a personality', 'Choose from six emoji chips or let Random decide. Follow each team in the scoreboard as points and collected stars fly into place.'],
  ],
  uses: [
    ['Make revision a shared event', 'Turn vocabulary, calculations, science or history questions into a team challenge that everyone can follow on one screen.'],
    ['Leave room to explain', 'Let teams talk through their answers before earning a drop. Use the answer reveal to revisit a method or clear up a misconception.'],
    ['Finish with a little suspense', 'Use a few rounds as an end-of-lesson review. Bouncing chips, breakable boxes and character bonuses keep the class watching until the final tally.'],
  ],
  closing: 'Ready to make your lesson bounce?',
  closingText: 'Choose a topic, bring your teams together and give your questions a playful new home.',
};

export const PlinkemojiPage = () => <GameTypeLandingPage content={content} />;
