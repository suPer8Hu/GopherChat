"use client";

import MessageContent from "@/components/MessageContent";

type CapsuleMessageProps = {
  content: string;
};

export default function CapsuleMessage({ content }: CapsuleMessageProps) {
  if (!content?.trim()) return null;
  return (
    <div className="inline-block max-w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white shadow-sm">
      <MessageContent content={content} />
    </div>
  );
}
