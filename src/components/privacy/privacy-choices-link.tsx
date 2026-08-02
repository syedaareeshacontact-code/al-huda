'use client';

interface GoogleFundingChoices {
  callbackQueue?: Array<() => void>;
  showRevocationMessage?: () => void;
}

declare global {
  interface Window {
    googlefc?: GoogleFundingChoices;
  }
}

export default function PrivacyChoicesLink({
  className,
  label = 'Privacy & cookie settings',
}: {
  className?: string;
  label?: string;
}) {
  const openPrivacyChoices = () => {
    const googlefc = window.googlefc;

    if (googlefc && typeof googlefc.showRevocationMessage === 'function') {
      googlefc.callbackQueue = googlefc.callbackQueue ?? [];
      googlefc.callbackQueue.push(googlefc.showRevocationMessage);
      return;
    }

    window.location.assign('/privacy-policy#privacy-choices');
  };

  return (
    <button type="button" onClick={openPrivacyChoices} className={className}>
      {label}
    </button>
  );
}
