import React from 'react';
import { GameTypeLandingPage, GameTypePageContent } from '../components/games/shared/GameTypeLandingPage';

const content: GameTypePageContent = {
  "slug": "snakes-and-ladders",
  "name": "Snakes and Ladders",
  "intro": "A good answer, a lucky roll and perhaps a ladder when you need it. Bring your lesson questions onto the board and enjoy the journey with your class.",
  "note": "Gather around one shared screen. Roll the dice, answer together and follow your team across the board.",
  "heroAlt": "The real Snakes and Ladders board with coloured team pieces, dice, snakes and ladders lifting out in 3D",
  "galleryIntro": "Take a turn, tackle a question and find out where the next roll will take you.",
  "galleryNote": "There is still room for a comeback. A ladder can change the race, and a snake gives the next team something to cheer about.",
  "screenshots": [
    {
      "name": "board",
      "title": "Everyone has a place on the board.",
      "alt": "Snakes and Ladders three-dimensional board with coloured pieces and a dice ready to roll",
      "text": "Choose your teams and take turns rolling. The board keeps the journey visible, so everyone can follow who is ahead and who is catching up."
    },
    {
      "name": "question",
      "title": "A question before you move.",
      "alt": "Snakes and Ladders question card shown after rolling the dice",
      "text": "Answer the question to earn your move. Use the moment to compare ideas, explain an answer or revisit something your class found tricky."
    },
    {
      "name": "answer",
      "title": "Check it together.",
      "alt": "Snakes and Ladders answer revealed with controls to mark it correct or incorrect",
      "text": "Reveal the answer and decide whether the team got it right. Then return to the board, where snakes and ladders can change the journey."
    }
  ],
  "features": [
    [
      "Put your lesson on the board",
      "Add your own questions or ask AI to draft a set. Mix ideas from a unit, focus on one skill or bring several subjects into the same game."
    ],
    [
      "Choose your level of surprise",
      "Keep the familiar snakes-and-ladders rules or switch on bonus cards for extra twists. Choose the bonus types you want to include before you start."
    ],
    [
      "Make space for discussion",
      "Play with open questions or multiple-choice answers. Leave the timer off for thoughtful conversations, or add it when your class is ready for quicker turns."
    ]
  ],
  "uses": [
    [
      "Give familiar practice a new setting",
      "Revisit calculations, scientific ideas, historical events or reading questions. The board adds a shared journey to material your students already know."
    ],
    [
      "Help teams support each other",
      "Let students discuss the answer before committing. Each turn is a chance to explain a method, remember a detail or help a teammate."
    ],
    [
      "Finish a unit together",
      "Bring a selection of lesson questions to a review session. The race gives the class a shared finish line while you hear what has stuck."
    ]
  ],
  "closing": "Ready for one more roll?",
  "closingText": "Choose what you want to practise, bring your teams together and let the game begin."
};

export const SnakesAndLaddersPage = () => <GameTypeLandingPage content={content} />;
