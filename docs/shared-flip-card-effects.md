# Shared flip-card effects

The shared slide-up spring entrance, leaning slide-down exit and card audio are enabled in:

- Trivia
- Plinkemoji
- Jeopardy
- Darts
- Pub Quiz
- Snakes and Ladders
- Block Beaters
- Word Wheel
- Stop the Fire (round setup/category card)

Survey Showdown's individual answer tiles are a different interaction, so their reveal animation is unchanged. Time Bomb, Millionaire Maker and Live Quiz do not use this front/back question card.

`QuestionCardMotion` owns the existing Plinkemoji entrance/exit animation. `useFlipCardEffects` gives each additional game a mute-controlled card audio player, shared cue timing, hover sounds and a guarded close action. Game-specific updates run after the exit completes: dart throwing, token movement, tile ownership, next questions, next rounds and end-game transitions. Nested close actions (Pub Quiz written Continue followed by Next Question) execute once after the same exit. Colours, card faces, smooth flips and game rules stay with their existing games. Trivia and Plinkemoji also render through the shared motion component.

Browser verification covered question-to-board transitions in Jeopardy and Block Beaters; consecutive questions in Pub Quiz; Word Wheel answer/Continue; Darts question-to-throw; Snakes and Ladders question-to-movement; and Stop the Fire scoring/next-round setup. Mobile written-answer regressions checked Trivia, Plinkemoji and Pub Quiz with reduced motion, Continue persistence, duplicate-click protection and recorded card-in/flip/result/out cues. Production build and audio shuffle checks passed. All test browsers were closed.
