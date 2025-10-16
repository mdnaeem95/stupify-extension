/**
 * Follow-Up Questions Component
 * Displays suggested follow-up questions after explanation
 */
import { Sparkles } from 'lucide-react';
import { FollowUpQuestion } from '@/shared/sidepanel';

interface FollowUpQuestionsProps {
  questions: FollowUpQuestion[];
  onQuestionClick: (question: FollowUpQuestion) => void;
}

export default function FollowUpQuestions({ questions, onQuestionClick }: FollowUpQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary-600" />
        <h3 className="text-sm font-semibold text-gray-700">Keep Learning</h3>
      </div>

      <div className="space-y-2">
        {questions.map((question) => (
          <button
            key={question.id}
            onClick={() => onQuestionClick(question)}
            disabled={question.clicked}
            className={`
              w-full text-left px-4 py-3 rounded-lg
              transition-all duration-200
              ${
                question.clicked
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white hover:bg-primary-50 border border-gray-200 hover:border-primary-300 text-gray-700 hover:text-primary-700'
              }
            `}
          >
            <div className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">→</span>
              <span className="text-sm">{question.question}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};