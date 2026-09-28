import React from 'react';
import { GameTypeLandingPage, GameTypePageContent } from '../components/games/shared/GameTypeLandingPage';

const content: GameTypePageContent = {
  "slug": "darts-challenge",
  "name": "Darts Challenge",
  "intro": "Pick your spot and back your answer. Bring a little friendly rivalry to your lesson, with a dartboard, team scores and a question before every throw.",
  "note": "Play on one shared screen. Teams choose their target, answer the question and watch the dart fly.",
  "heroAlt": "A real-game dartboard with raised scoring rings and darts projecting towards the viewer",
  "galleryIntro": "Will your team take the straightforward shot or try for something bigger?",
  "galleryNote": "The board gives every turn a small decision to make. The question gives everyone a reason to think before the dart is thrown.",
  "screenshots": [
    {
      "name": "board",
      "title": "Choose your target.",
      "alt": "Darts Challenge three-dimensional dartboard with team scores and an aiming target",
      "text": "Pick a scoring area on the board. Singles, doubles, trebles and the bullseye give teams different targets to aim for."
    },
    {
      "name": "question",
      "title": "Earn your shot.",
      "alt": "Darts Challenge question card asking which planet is known as the Red Planet",
      "text": "A question appears after you choose a target. Let the team talk it through, check the answer and mark the shot as a hit or a miss."
    },
    {
      "name": "results",
      "title": "Every turn counts.",
      "alt": "Darts Challenge end-of-game podium and team scores",
      "text": "Follow the scores as teams take their turns, then celebrate the result. A good answer and a well-chosen target can make all the difference."
    }
  ],
  "features": [
    [
      "Bring your own questions",
      "Use questions from whatever you are teaching. Write them yourself or ask AI for a starting point, then review the answers before the game."
    ],
    [
      "Pick your scoring challenge",
      "Play for the highest score and choose how many turns each player gets, or try counting down from 301 and finishing on a double."
    ],
    [
      "Give teams room to think",
      "Use open questions for discussion or multiple choice for a quicker decision. Add an answer timer when you want a faster pace."
    ]
  ],
  "uses": [
    [
      "Keep revision moving",
      "Take turns revisiting the ideas that need another look. The change from choosing a target to answering a question gives the lesson a natural rhythm."
    ],
    [
      "Encourage shared decisions",
      "Ask teams to agree on both their target and their answer. Students can compare reasoning, weigh up the options and support one another."
    ],
    [
      "Add a little number talk",
      "Doubles, trebles and changing totals make useful starting points for mental maths. You can keep the questions on another subject and still enjoy the arithmetic."
    ]
  ],
  "closing": "Where will you aim first?",
  "closingText": "Turn a set of lesson questions into a few rounds your class can enjoy together."
};

export const DartsChallengePage = () => <GameTypeLandingPage content={content} />;
