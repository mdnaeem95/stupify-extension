/**
 * Action Buttons Component
 * Copy, Share, and Open in App actions
 */

import { useState } from 'react';
import { Copy, Share2, ExternalLink, Check } from 'lucide-react';

interface ActionButtonsProps {
  response: string;
  onOpenInApp?: () => void;
}

export default function ActionButtons({ response, onOpenInApp }: ActionButtonsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Stupify Explanation',
          text: response,
        });
      } catch (error) {
        // User cancelled or error
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleCopy}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-green-600">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            <span>Copy</span>
          </>
        )}
      </button>

      <button
        onClick={handleShare}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
      >
        <Share2 className="w-4 h-4" />
        <span>Share</span>
      </button>

      {onOpenInApp && (
        <button
          onClick={onOpenInApp}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Open App</span>
        </button>
      )}
    </div>
  );
};