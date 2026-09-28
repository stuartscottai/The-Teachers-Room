import React from 'react';
import { GameTypeLandingPage, GameTypePageContent } from '../components/games/shared/GameTypeLandingPage';

const content: GameTypePageContent = {
  "slug": "stop-the-fire",
  "name": "Stop the Fire",
  "intro": "Give your class a quick-thinking challenge. With one letter and a handful of categories, teams race to find their answers before the fire catches up.",
  "note": "Put the categories on a shared screen and let students write their answers on paper or mini whiteboards.",
  "heroAlt": "Stop the Fire category cards and the letter P bursting forward above a fiery countdown",
  "galleryIntro": "Set up a round, compare the answers and see which team found something different.",
  "galleryNote": "You can keep the categories broad or make them fit your topic. Once the round starts, everyone works with the same letter and the fire timer begins.",
  "screenshots": [
    {
      "name": "setup",
      "title": "Set the challenge.",
      "alt": "Stop the Fire setup showing teams, difficulty, category choices, timer and a preview of the letter",
      "text": "Choose your teams, categories and round length. You can reroll the letter before the fire starts, then give everyone the same challenge."
    },
    {
      "name": "scoring",
      "title": "What did everyone find?",
      "alt": "Stop the Fire scoring screen comparing Foxes and Owls answers one category at a time",
      "text": "Read the answers together. Give two points for a unique valid answer, one for a shared answer and zero for an answer that does not fit."
    },
    {
      "name": "results",
      "title": "A little celebration.",
      "alt": "Stop the Fire final team scores with Foxes and Owls on the podium",
      "text": "Keep the scores across rounds, try a new letter and finish with a cheer for your teams. Sometimes the most unexpected answer is the one everyone remembers."
    }
  ],
  "features": [
    [
      "Pick categories that fit",
      "Use the built-in category bank, write your own list or ask AI to help. Keep it broad, or choose categories linked to the topic you are teaching."
    ],
    [
      "Set a comfortable pace",
      "Choose the number of categories and the round length. Start with fewer categories and more time, then turn up the challenge when everyone has the idea."
    ],
    [
      "Keep the discussion in your hands",
      "You decide whether an answer fits. Stop early to compare, or add time if the class needs another moment to finish their ideas."
    ]
  ],
  "uses": [
    [
      "Wake up a lesson",
      "Start with familiar categories for a lively warm-up. It gives everyone something to contribute before you move into the main lesson."
    ],
    [
      "Make connections across a topic",
      "Try places from geography, living things from science or people and objects from history. Adapt the categories so more than one sensible answer is possible."
    ],
    [
      "Celebrate original thinking",
      "Invite students to explain an unusual answer. Shared answers build confidence; different answers give the class something new to talk about."
    ]
  ],
  "closing": "What will your class think of?",
  "closingText": "Choose a few categories, gather your teams and give their ideas a little room to run."
};

export const StopTheFirePage = () => <GameTypeLandingPage content={content} />;
