export interface PushDeviceDetails {
  browser: string;
  platform: string;
}

export function getPushDeviceDetails(userAgent: string | null): PushDeviceDetails {
  const value = String(userAgent ?? '');
  let browser = 'Unknown browser';
  let platform = 'Unknown platform';

  if (/Edg\//i.test(value)) browser = 'Microsoft Edge';
  else if (/Firefox\//i.test(value)) browser = 'Firefox';
  else if (/CriOS\//i.test(value)) browser = 'Chrome iOS';
  else if (/Chrome\//i.test(value)) browser = 'Chrome';
  else if (/Safari\//i.test(value)) browser = 'Safari';

  if (/Android/i.test(value)) platform = 'Android';
  else if (/iPhone|iPad|iPod/i.test(value)) platform = 'iOS / iPadOS';
  else if (/Windows/i.test(value)) platform = 'Windows';
  else if (/Macintosh|Mac OS X/i.test(value)) platform = 'macOS';
  else if (/Linux/i.test(value)) platform = 'Linux';

  return { browser, platform };
}

export function hasKnownPushDeviceDetails(details: PushDeviceDetails) {
  return details.browser !== 'Unknown browser' || details.platform !== 'Unknown platform';
}

export function samePushDeviceDetails(
  left: PushDeviceDetails,
  right: PushDeviceDetails
) {
  return left.browser === right.browser && left.platform === right.platform;
}
