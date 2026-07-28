interface ArabicTextProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const punctuationPattern = /([،,؛;؟?])/g;
const punctuationMap: Record<string, string> = {
  ',': '،',
  '،': '،',
  ';': '؛',
  '؛': '؛',
  '?': '؟',
  '؟': '؟',
};

function renderArabicText(text: string) {
  return text.split(punctuationPattern).map((part, index) => {
    const punctuation = punctuationMap[part];

    if (!punctuation) return part;

    return (
      <span
        key={`${index}-${part}`}
        style={{
          fontFamily: "'Noto Naskh Arabic', 'Noto Sans Arabic', Tahoma, Arial, sans-serif",
        }}
      >
        {punctuation}
      </span>
    );
  });
}

export default function ArabicText({ text, className = '', size = 'md' }: ArabicTextProps) {
  return (
    <p
      dir="rtl"
      lang="ar"
      data-size={size}
      className={`arabic-font arabic-reading text-right ${className}`.trim()}
    >
      {renderArabicText(text)}
    </p>
  );
}
