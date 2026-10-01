import { translateInterfaceText as ui } from '../utils/interfaceLanguage';
import React from 'react';
import { GameTypeLandingPage, GameTypePageContent } from '../components/games/shared/GameTypeLandingPage';

const content: GameTypePageContent = {
  "slug": "snakes-and-ladders",
  "name": "Snakes and Ladders",
  "intro": ui("A good answer, a lucky roll and perhaps a ladder when you need it. Bring your lesson questions onto the board and enjoy the journey with your class."),
  "note": ui("Gather around one shared screen. Roll the dice, answer together and follow your team across the board."),
  "heroAlt": ui("The real Snakes and Ladders board with coloured team pieces, dice, snakes and ladders lifting out in 3D"),
  "galleryIntro": ui("Take a turn, tackle a question and find out where the next roll will take you."),
  "galleryNote": ui("There is still room for a comeback. A ladder can change the race, and a snake gives the next team something to cheer about."),
  "screenshots": [
    {
      "name": "board",
      get "title"() { return ui("Everyone has a place on the board."); },
      get "alt"() { return ui("Snakes and Ladders three-dimensional board with coloured pieces and a dice ready to roll"); },
      "text": ui("Choose your teams and take turns rolling. The board keeps the journey visible, so everyone can follow who is ahead and who is catching up.")
    },
    {
      "name": "question",
      get "title"() { return ui("A question before you move."); },
      get "alt"() { return ui("Snakes and Ladders question card shown after rolling the dice"); },
      "text": ui("Answer the question to earn your move. Use the moment to compare ideas, explain an answer or revisit something your class found tricky.")
    },
    {
      "name": "answer",
      get "title"() { return ui("Check it together."); },
      get "alt"() { return ui("Snakes and Ladders answer revealed with controls to mark it correct or incorrect"); },
      "text": ui("Reveal the answer and decide whether the team got it right. Then return to the board, where snakes and ladders can change the journey.")
    }
  ],
  "features": [
    [
      ui("Put your lesson on the board"),
      ui("Add your own questions or ask AI to draft a set. Mix ideas from a unit, focus on one skill or bring several subjects into the same game.")
    ],
    [
      ui("Choose your level of surprise"),
      ui("Keep the familiar snakes-and-ladders rules or switch on bonus cards for extra twists. Choose the bonus types you want to include before you start.")
    ],
    [
      ui("Make space for discussion"),
      ui("Play with open questions or multiple-choice answers. Leave the timer off for thoughtful conversations, or add it when your class is ready for quicker turns.")
    ]
  ],
  "uses": [
    [
      ui("Give familiar practice a new setting"),
      ui("Revisit calculations, scientific ideas, historical events or reading questions. The board adds a shared journey to material your students already know.")
    ],
    [
      ui("Help teams support each other"),
      ui("Let students discuss the answer before committing. Each turn is a chance to explain a method, remember a detail or help a teammate.")
    ],
    [
      "Finish a unit together",
      ui("Bring a selection of lesson questions to a review session. The race gives the class a shared finish line while you hear what has stuck.")
    ]
  ],
  "closing": "Ready for one more roll?",
  "closingText": ui("Choose what you want to practise, bring your teams together and let the game begin.")
};

export const SnakesAndLaddersPage = () => <GameTypeLandingPage content={content} />;
