import type { Metadata } from 'next'
import LandingPageClient from '@/components/landing/LandingPageClient'

export const metadata: Metadata = {
  title: 'RevOps AI Copilot - Get Answers, Not Dashboards | 85% Forecast Accuracy',
  description: 'AI-powered forecasting and revenue intelligence that works where you do. Natural language queries, Chrome extension for Salesforce, and 85%+ accuracy. From $49/user.',
  keywords: 'AI forecasting, revenue intelligence, sales forecasting software, deal risk scoring, natural language CRM, AI for RevOps, Salesforce AI extension, forecast accuracy',
  openGraph: {
    title: 'RevOps AI Copilot - The AI Brain for Your GTM Stack',
    description: 'Get instant answers about your pipeline. 85%+ forecast accuracy. Natural language AI that works inside Salesforce and Slack. Setup in 5 minutes.',
    url: 'https://revops-ai.vercel.app',
    siteName: 'RevOps AI',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'RevOps AI - AI-Powered Revenue Intelligence',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RevOps AI Copilot - Get Answers, Not Dashboards',
    description: 'AI forecasting with 85%+ accuracy. Natural language queries. Works inside Salesforce and Slack. From $49/user.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function LandingPage() {
  return <LandingPageClient />
}
