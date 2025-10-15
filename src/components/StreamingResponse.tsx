/**
 * Streaming Response Component
 * Displays AI explanation with streaming/typing effect
 */

import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface StreamingResponseProps {
  text: string;
  isStreaming: boolean;
  isLoading: boolean;
}

export const StreamingResponse: React.FC<StreamingResponseProps> = ({
  text,
  isStreaming,
  isLoading,
}) => {
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as text streams in
  useEffect(() => {
    if (isStreaming && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [text, isStreaming]);

  if (isLoading && !text) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Thinking...</p>
        </div>
      </div>
    );
  }

  if (!text) return null;

  return (
    <div className="relative">
      <div className="prose prose-sm max-w-none">
        <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
          {text}
          {isStreaming && (
            <span className="inline-block w-0.5 h-4 ml-1 bg-primary-600 animate-pulse" />
          )}
        </div>
      </div>
      <div ref={endRef} />
    </div>
  );
};