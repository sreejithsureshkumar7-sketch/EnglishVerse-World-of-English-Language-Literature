import test from 'node:test';
import assert from 'node:assert/strict';
import { filterQuestions, calculateQuizScore, getGradeLabel, Question } from './quiz-logic';

const mockQuestions: Question[] = [
  {
    id: 1,
    category: 'literature',
    difficulty: 'easy',
    question: 'Who wrote Hamlet?',
    options: ['Shakespeare', 'Milton', 'Chaucer', 'Dickens'],
    correctIndex: 0,
    explanation: 'William Shakespeare wrote Hamlet around 1600.'
  },
  {
    id: 2,
    category: 'grammar',
    difficulty: 'easy',
    question: 'Which is an adverb?',
    options: ['Quickly', 'Fast', 'Run', 'Book'],
    correctIndex: 0,
    explanation: 'Quickly ends in -ly and modifies verbs.'
  },
  {
    id: 3,
    category: 'poetry',
    difficulty: 'medium',
    question: 'How many lines does an English Sonnet have?',
    options: ['12', '14', '16', '10'],
    correctIndex: 1,
    explanation: 'A Shakespearean sonnet contains 14 lines in iambic pentameter.'
  }
];

test('filterQuestions filters correctly by category and difficulty', () => {
  const litOnly = filterQuestions(mockQuestions, 'literature', 'all');
  assert.equal(litOnly.length, 1);
  assert.equal(litOnly[0].id, 1);

  const easyOnly = filterQuestions(mockQuestions, 'all', 'easy');
  assert.equal(easyOnly.length, 2);

  const none = filterQuestions(mockQuestions, 'vocabulary', 'hard');
  assert.equal(none.length, 0);
});

test('calculateQuizScore evaluates correct responses and percentage', () => {
  const allCorrect = calculateQuizScore(mockQuestions, { 0: 0, 1: 0, 2: 1 });
  assert.equal(allCorrect.score, 3);
  assert.equal(allCorrect.percentage, 100);
  assert.equal(allCorrect.passed, true);

  const oneCorrect = calculateQuizScore(mockQuestions, { 0: 0, 1: 2, 2: 0 });
  assert.equal(oneCorrect.score, 1);
  assert.equal(oneCorrect.percentage, 33);
  assert.equal(oneCorrect.passed, false);
});

test('getGradeLabel returns appropriate academic distinctions', () => {
  assert.equal(getGradeLabel(95).grade, 'Distinction');
  assert.equal(getGradeLabel(80).grade, 'Merit');
  assert.equal(getGradeLabel(65).grade, 'Pass');
  assert.equal(getGradeLabel(40).grade, 'Developing');
});
