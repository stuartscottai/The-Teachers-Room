import { translateInterfaceText as ui } from '../utils/interfaceLanguage';
import React from 'react';
import { GameTypeLandingPage, GameTypePageContent } from '../components/games/shared/GameTypeLandingPage';

const content: GameTypePageContent = {
  "slug": "millionaire-maker",
  "name": "Millionaire Maker",
  "intro": ui("How far can your class go? Talk through each answer, climb the prize ladder together and save a lifeline for that question you are not quite sure about."),
  "note": ui("Play together on one screen, or put a contestant in the hot seat. The prize money is just for fun."),
  "heroAlt": ui("Millionaire Maker question, answer choices, lifeline icons and prize ladder in an exploded 3D view"),
  "galleryIntro": ui("Every answer is a decision. Talk it through, make your choice and watch the next step light up."),
  "galleryNote": ui("A simple question can start a useful conversation. Ask students to explain why one answer fits and why the other three do not."),
  "screenshots": [
    {
      "name": "question-2",
      get "title"() { return ui("Is that your answer?"); },
      get "alt"() { return ui("Millionaire Maker second multiple-choice question about a hexagon beside the fifteen-step prize ladder"); },
      "text": ui("Four choices appear beside the prize ladder. A correct answer takes you up another step, with the next question waiting to test your confidence.")
    },
    {
      "name": "audience",
      get "title"() { return ui("A little help when you need it."); },
      get "alt"() { return ui("Millionaire Maker simulated audience vote showing bars for answers A, B, C and D"); },
      "text": ui("Ask the simulated audience to see how its votes are spread. You can also use 50:50 or phone a friend. Each lifeline works once, so choose your moment.")
    },
    {
      "name": "results",
      get "title"() { return ui("Know when to take a bow."); },
      get "alt"() { return ui("Millionaire Maker results showing the amount won after choosing to walk away"); },
      "text": ui("Keep going for the next prize or walk away with the amount you have reached. Safety milestones protect part of the score if a later answer goes wrong.")
    }
  ],
  "features": [
    [
      ui("Build a climb that makes sense"),
      ui("Write your own multiple-choice questions or have AI draft them. Start with approachable questions and work towards the ideas you want students to think hardest about.")
    ],
    [
      ui("Use the lifelines as talking points"),
      ui("Pause for a discussion before choosing a lifeline. Which answers can your students already rule out, and what would make them more certain?")
    ],
    [
      ui("Choose how your class plays"),
      ui("Let the whole class agree on an answer, invite a volunteer to the hot seat, or have groups discuss before you make the final selection on screen.")
    ]
  ],
  "uses": [
    [
      ui("Check understanding together"),
      ui("Bring back the key ideas from a unit and listen to the reasoning behind each choice. Wrong options can reveal a misconception worth exploring.")
    ],
    [
      ui("Build confidence step by step"),
      ui("Begin with something everyone recognises. As the questions grow harder, the shared progress gives students a reason to stay involved.")
    ],
    [
      ui("Make revision feel like an occasion"),
      ui("Use science, maths, history, literature or a mix of subjects. A familiar quiz-show rhythm can turn an ordinary review into a class event.")
    ]
  ],
  "closing": ui("How far will your class go?"),
  "closingText": ui("Bring your questions, a few brave guesses and a class ready to talk things through.")
};

export const MillionaireMakerPage = () => <GameTypeLandingPage content={content} />;
