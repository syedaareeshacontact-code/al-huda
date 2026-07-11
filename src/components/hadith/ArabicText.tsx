interface ArabicTextProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function ArabicText({ text, className = '', size = 'md' }: ArabicTextProps) {
  return (
    <p
      dir="rtl"
      lang="ar"
      data-size={size}
      className={`arabic-font arabic-reading text-right ${className}`.trim()}
    >
      {text}
    </p>
  );
}
