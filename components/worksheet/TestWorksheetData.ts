// Test data for worksheet editor development
export const TEST_WORKSHEET_CONTENT = `
<div class="ws-header" style="display: flex; justify-content: space-between; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #e2e8f0;">
  <div class="ws-field">Name: ___________________</div>
  <div class="ws-field">Date: ___________________</div>
</div>

<h1 class="ws-title" style="text-align: center; font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Sample Worksheet</h1>

<p class="ws-instructions" style="text-align: center; margin-bottom: 1.5rem;">Complete the following activities.</p>

<div class="ws-section" style="margin-bottom: 2rem;">
  <h3 class="ws-section-title" style="font-weight: bold; margin-bottom: 0.5rem;">Activity 1: Multiple Choice</h3>
  <p style="margin-bottom: 1rem;">Choose the correct answer for each question.</p>

  <p><strong>1.</strong> What is 2 + 2?</p>
  <ul style="list-style-type: none; padding-left: 1.5rem;">
    <li>☐ A) 3</li>
    <li>☐ B) 4</li>
    <li>☐ C) 5</li>
    <li>☐ D) 6</li>
  </ul>

  <p><strong>2.</strong> What is the capital of France?</p>
  <ul style="list-style-type: none; padding-left: 1.5rem;">
    <li>☐ A) London</li>
    <li>☐ B) Berlin</li>
    <li>☐ C) Paris</li>
    <li>☐ D) Madrid</li>
  </ul>
</div>

<div class="ws-section" style="margin-bottom: 2rem;">
  <h3 class="ws-section-title" style="font-weight: bold; margin-bottom: 0.5rem;">Activity 2: Fill in the Blanks</h3>
  <p style="margin-bottom: 1rem;">Complete the sentences with the correct word.</p>

  <p>1. The sky is _______________.</p>
  <p>2. A dog is an _______________.</p>
  <p>3. Water boils at _______________ degrees Celsius.</p>
</div>

<div class="ws-section">
  <h3 class="ws-section-title" style="font-weight: bold; margin-bottom: 0.5rem;">Activity 3: Short Answer</h3>
  <p style="margin-bottom: 1rem;">Answer the following questions in complete sentences.</p>

  <p><strong>1.</strong> What is your favorite subject and why?</p>
  <p style="margin-bottom: 2rem;">_________________________________________________________________</p>

  <p><strong>2.</strong> Describe your morning routine.</p>
  <p style="margin-bottom: 2rem;">_________________________________________________________________</p>
</div>
`;

export const TEST_WORKSHEET_WITH_ANSWER_KEY = {
  content: TEST_WORKSHEET_CONTENT,
  answerKey: `
<h3 style="font-weight: bold; margin-bottom: 1rem;">Answer Key</h3>

<div style="margin-bottom: 1rem;">
  <strong>Activity 1: Multiple Choice</strong>
  <ul>
    <li>1. B) 4</li>
    <li>2. C) Paris</li>
  </ul>
</div>

<div style="margin-bottom: 1rem;">
  <strong>Activity 2: Fill in the Blanks</strong>
  <ul>
    <li>1. blue</li>
    <li>2. animal</li>
    <li>3. 100</li>
  </ul>
</div>

<div>
  <strong>Activity 3: Short Answer</strong>
  <p style="font-style: italic; color: #64748b;">Answers will vary. Look for complete sentences and clear reasoning.</p>
</div>
  `
};
