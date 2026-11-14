import { MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl } from '../lib/config';

interface WhatsAppButtonProps {
  message?: string;
  label?: string;
  variant?: 'floating' | 'inline';
}

export function WhatsAppButton({
  message = 'Hello Muskan! I would like to enquire about an eggless cake order at The Little Bakehouse.',
  label = 'WhatsApp Enquiry',
  variant = 'floating',
}: WhatsAppButtonProps) {
  const href = buildWhatsAppUrl(message);

  if (variant === 'inline') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg bg-[#256D4F] text-white text-sm font-medium hover:bg-[#1E5940] transition-colors whitespace-nowrap"
      >
        <MessageCircle className="w-4 h-4" />
        <span>{label}</span>
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open WhatsApp enquiry with The Little Bakehouse"
      className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#256D4F] text-white text-sm font-medium shadow-lg hover:bg-[#1E5940] transition-transform hover:-translate-y-0.5 whitespace-nowrap"
    >
      <MessageCircle className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </a>
  );
}
