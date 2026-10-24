export interface Question {
  id: number;
  category: 'literature' | 'grammar' | 'vocabulary' | 'poetry';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizState {
  questions: Question[];
  currentIndex: number;
  selectedAnswers: Record<number, number>;
  score: number;
  isComplete: boolean;
}

export function filterQuestions(
  allQuestions: Question[],
  category: string,
  difficulty: string
): Question[] {
  return allQuestions.filter((q) => {
    const matchCategory = category === 'all' || q.category === category;
    const matchDifficulty = difficulty === 'all' || q.difficulty === difficulty;
    return matchCategory && matchDifficulty;
  });
}

export function calculateQuizScore(
  questions: Question[],
  answers: Record<number, number>
): { score: number; percentage: number; passed: boolean } {
  if (questions.length === 0) {
    return { score: 0, percentage: 0, passed: false };
  }

  let correctCount = 0;
  questions.forEach((q, idx) => {
    if (answers[idx] === q.correctIndex) {
      correctCount++;
    }
  });

  const percentage = Math.round((correctCount / questions.length) * 100);
  return {
    score: correctCount,
    percentage,
    passed: percentage >= 60,
  };
}

export function getGradeLabel(percentage: number): {
  grade: string;
  badge: string;
  comment: string;
} {
  if (percentage >= 90) {
    return {
      grade: 'Distinction',
      badge: 'Gold Scholar',
      comment: 'Exceptional literary mastery! You possess a scholar-level command of English.',
    };
  }
  if (percentage >= 75) {
    return {
      grade: 'Merit',
      badge: 'Silver Scholar',
      comment: 'Impressive literary acumen. Your comprehension of literature and grammar is strong.',
    };
  }
  if (percentage >= 60) {
    return {
      grade: 'Pass',
      badge: 'Bronze Scholar',
      comment: 'Solid foundational knowledge. With continued reading, you will achieve distinction.',
    };
  }
  return {
    grade: 'Developing',
    badge: 'Apprentice Reader',
    comment: 'A promising start. Explore the digital library and revisit the literary eras.',
  };
}
