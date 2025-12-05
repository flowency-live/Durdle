'use client';

import { MessageSquare } from 'lucide-react';
import { useState } from 'react';
import FeedbackModal from './FeedbackModal';

export default function FeedbackButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="text-gray-600 hover:text-gray-900 transition-colors"
        title="Send Feedback"
      >
        <MessageSquare className="w-5 h-5" />
      </button>

      <FeedbackModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
