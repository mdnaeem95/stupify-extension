/**
 * Follow-up Generation Service
 * 
 * Generates adaptive follow-up questions based on user's question and answer
 * - Generate 3 questions per response
 * - Category assignment (deeper, related, practical)
 * - Deduplication
 * - Quality filtering
 */

import { apiClient } from './api';
import { SuggestedQuestion, ComplexityLevel } from '../shared/types';

interface GenerateFollowUpsOptions {
  question: string;
  answer: string;
  complexityLevel: ComplexityLevel;
  conversationContext?: string[];
}

/**
 * Follow-up Service
 */
class FollowUpService {
  private cache: Map<string, SuggestedQuestion[]> = new Map();

  /**
   * Generate follow-up questions
   */
  async generate(options: GenerateFollowUpsOptions): Promise<SuggestedQuestion[]> {
    const { question, answer, complexityLevel, conversationContext = [] } = options;

    // Check cache
    const cacheKey = this.getCacheKey(question, complexityLevel);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Call API to generate follow-ups
      const response = await apiClient.request<{ followUps: SuggestedQuestion[] }>(
        '/api/followups/generate',
        {
          method: 'POST',
          body: JSON.stringify({
            question,
            answer,
            complexityLevel,
            conversationContext,
          }),
          requiresAuth: false, // Allow unauthenticated users
        }
      );

      const followUps = response.followUps || [];

      // Validate and filter
      const validFollowUps = this.validateFollowUps(followUps, question);

      // Cache results
      this.cache.set(cacheKey, validFollowUps);

      // Limit cache size
      if (this.cache.size > 50) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey!);
      }

      return validFollowUps;

    } catch (error) {
      console.error('❌ Failed to generate follow-ups:', error);
      
      // Fallback to local generation
      return this.generateLocal(options);
    }
  }

  /**
   * Generate follow-ups locally (fallback)
   */
  private generateLocal(options: GenerateFollowUpsOptions): SuggestedQuestion[] {
    const { question, complexityLevel } = options;

    // Extract main topic from question
    const topic = this.extractTopic(question);

    // Generate generic follow-ups based on complexity level
    const templates = this.getTemplates(complexityLevel);

    return templates.map((template, index) => {
      const categories: Array<'deeper' | 'related' | 'practical'> = ['deeper', 'related', 'practical'];
      
      return {
        id: `local-${Date.now()}-${index}`,
        text: template.replace('{topic}', topic),
        category: categories[index] || 'related',
      };
    });
  }

  /**
   * Get question templates based on complexity level
   */
  private getTemplates(level: ComplexityLevel): string[] {
    const templates = {
      '5yo': [
        'Why is {topic} important?',
        'What else works like {topic}?',
        'Can you show me {topic} with a picture?',
      ],
      'normal': [
        'How does {topic} actually work?',
        'What are some real-world examples of {topic}?',
        'What are the limitations of {topic}?',
      ],
      'advanced': [
        'What are the technical details of {topic}?',
        'How does {topic} compare to alternatives?',
        'What are the edge cases of {topic}?',
      ],
    };

    return templates[level] || templates.normal;
  }

  /**
   * Extract main topic from question
   */
  private extractTopic(question: string): string {
    // Remove common question words
    const cleaned = question
      .toLowerCase()
      .replace(/^(what|how|why|when|where|who|can you|could you|please|explain|tell me about)\s+/gi, '')
      .replace(/[?.!,]/g, '')
      .trim();

    // Get first few words as topic
    const words = cleaned.split(' ');
    return words.slice(0, Math.min(4, words.length)).join(' ');
  }

  /**
   * Validate follow-up questions
   */
  private validateFollowUps(
    followUps: SuggestedQuestion[],
    originalQuestion: string
  ): SuggestedQuestion[] {
    const valid: SuggestedQuestion[] = [];
    const seen = new Set<string>();

    for (const followUp of followUps) {
      // Check if valid
      if (!this.isValidFollowUp(followUp, originalQuestion)) {
        continue;
      }

      // Check for duplicates
      const normalized = followUp.text.toLowerCase().trim();
      if (seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      valid.push(followUp);

      // Limit to 3 questions
      if (valid.length >= 3) {
        break;
      }
    }

    return valid;
  }

  /**
   * Check if follow-up question is valid
   */
  private isValidFollowUp(followUp: SuggestedQuestion, originalQuestion: string): boolean {
    const text = followUp.text.trim();

    // Check length
    if (text.length < 10 || text.length > 150) {
      return false;
    }

    // Check if it's too similar to original
    const similarity = this.calculateSimilarity(text, originalQuestion);
    if (similarity > 0.8) {
      return false;
    }

    // Check if it's a valid question
    if (!this.isQuestion(text)) {
      return false;
    }

    // Check category
    if (!['deeper', 'related', 'practical'].includes(followUp.category)) {
      return false;
    }

    return true;
  }

  /**
   * Check if text is a question
   */
  private isQuestion(text: string): boolean {
    // Must end with question mark or contain question words
    return (
      text.endsWith('?') ||
      /^(what|how|why|when|where|who|can|could|would|should|is|are|do|does)/i.test(text)
    );
  }

  /**
   * Calculate similarity between two strings
   */
  private calculateSimilarity(s1: string, s2: string): number {
    const words1 = new Set(s1.toLowerCase().split(/\s+/));
    const words2 = new Set(s2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Get cache key
   */
  private getCacheKey(question: string, level: ComplexityLevel): string {
    return `${question.toLowerCase().trim()}-${level}`;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Assign categories to questions if missing
   */
  assignCategories(questions: string[]): SuggestedQuestion[] {
    return questions.map((text, index) => {
      const category = this.inferCategory(text, index);
      
      return {
        id: `generated-${Date.now()}-${index}`,
        text,
        category,
      };
    });
  }

  /**
   * Infer category from question text
   */
  private inferCategory(text: string, index: number): 'deeper' | 'related' | 'practical' {
    const lower = text.toLowerCase();

    // Deeper dive indicators
    if (
      lower.includes('why') ||
      lower.includes('how does') ||
      lower.includes('explain more') ||
      lower.includes('detail')
    ) {
      return 'deeper';
    }

    // Practical indicators
    if (
      lower.includes('example') ||
      lower.includes('use') ||
      lower.includes('apply') ||
      lower.includes('real world') ||
      lower.includes('practice')
    ) {
      return 'practical';
    }

    // Related topic indicators
    if (
      lower.includes('similar') ||
      lower.includes('related') ||
      lower.includes('other') ||
      lower.includes('compare')
    ) {
      return 'related';
    }

    // Default based on position
    const categories: Array<'deeper' | 'related' | 'practical'> = ['deeper', 'related', 'practical'];
    return categories[index % 3];
  }
}

// Export singleton instance
export const followUpService = new FollowUpService();