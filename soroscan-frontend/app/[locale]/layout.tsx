import {NextIntlClientProvider} from 'next-intl';
import {notFound} from 'next/navigation';
import {locales} from '../../i18n';
import { Providers } from '../providers';

export function generateStaticParams() {
  return locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as typeof locales[number])) {
    notFound();
  }

  // Load locale-specific messages from static files
  let messages;
  if (locale === 'en') {
    messages = (await import('../../messages/en.json')).default;
  } else if (locale === 'es') {
    messages = (await import('../../messages/es.json')).default;
  } else {
    notFound();
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Providers>
        {children}
      </Providers>
    </NextIntlClientProvider>
  );
}
