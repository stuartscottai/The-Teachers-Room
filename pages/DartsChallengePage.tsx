import { translateInterfaceText as ui } from '../utils/interfaceLanguage';
import React from 'react';
import { GameTypeLandingPage, GameTypePageContent } from '../components/games/shared/GameTypeLandingPage';

const content: GameTypePageContent = {
  "slug": "darts-challenge",
  "name": "Darts Challenge",
  "intro": ui("Pick your spot and back your answer. Bring a little friendly rivalry to your lesson, with a dartboard, team scores and a question before every throw."),
  "note": ui("Play on one shared screen. Teams choose their target, answer the question and watch the dart fly."),
  "heroAlt": ui("A real-game dartboard with raised scoring rings and darts projecting towards the viewer"),
  "galleryIntro": ui("Will your team take the straightforward shot or try for something bigger?"),
  "galleryNote": ui("The board gives every turn a small decision to make. The question gives everyone a reason to think before the dart is thrown."),
  "screenshots": [
    {
      "name": "board",
      get "title"() { return ui("Choose your target."); },
      get "alt"() { return ui("Darts Challenge three-dimensional dartboard with team scores and an aiming target"); },
      "text": ui("Pick a scoring area on the board. Singles, doubles, trebles and the bullseye give teams different targets to aim for.")
    },
    {
      "name": "question",
      get "title"() { return ui("Earn your shot."); },
      get "alt"() { return ui("Darts Challenge question card asking which planet is known as the Red Planet"); },
      "text": ui("A question appears after you choose a target. Let the team talk it through, check the answer and mark the shot as a hit or a miss.")
    },
    {
      "name": "results",
      get "title"() { return ui("Every turn counts."); },
      get "alt"() { return ui("Darts Challenge end-of-game podium and team scores"); },
      "text": ui("Follow the scores as teams take their turns, then celebrate the result. A good answer and a well-chosen target can make all the difference.")
    }
  ],
  "features": [
    [
      "Bring your own questions",
      ui("Use questions from whatever you are teaching. Write them yourself or ask AI for a starting point, then review the answers before the game.")
    ],
    [
      ui("Pick your scoring challenge"),
      ui("Play for the highest score and choose how many turns each player gets, or try counting down from 301 and finishing on a double.")
    ],
    [
      "Give teams room to think",
      ui("Use open questions for discussion or multiple choice for a quicker decision. Add an answer timer when you want a faster pace.")
    ]
  ],
  "uses": [
    [
      "Keep revision moving",
      ui("Take turns revisiting the ideas that need another look. The change from choosing a target to answering a question gives the lesson a natural rhythm.")
    ],
    [
      ui("Encourage shared decisions"),
      ui("Ask teams to agree on both their target and their answer. Students can compare reasoning, weigh up the options and support one another.")
    ],
    [
      "Add a little number talk",
      ui("Doubles, trebles and changing totals make useful starting points for mental maths. You can keep the questions on another subject and still enjoy the arithmetic.")
    ]
  ],
  "closing": ui("Where will you aim first?"),
  "closingText": ui("Turn a set of lesson questions into a few rounds your class can enjoy together.")
};

export const DartsChallengePage = () => <GameTypeLandingPage content={content} />;
