'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Check, X, ArrowRight, Sparkles, Zap, Crown, Shield,
  Users, Database, Brain, Clock, Headphones, Lock, Bot,
  ChevronDown, ChevronUp
} from 'lucide-react'

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const plans = [
    {
      name: 'Free',
      description: 'Perfect for trying out AI agents',
      price: 0,
      icon: Sparkles,
      gradient: 'from-gray-500 to-gray-600',
      features: [
        { name: '1 user', included: true },
        { name: '100 records', included: true },
        { name: '1 CRM connection', included: true },
        { name: '50 AI actions/month', included: true },
        { name: 'Basic AI agents', included: true },
        { name: 'Community support', included: true },
        { name: 'Custom workflows', included: false },
        { name: 'Priority support', included: false },
      ],
      cta: 'Start Free',
      ctaLink: '/signup',
      popular: false,
      badge: 'Forever Free'
    },
    {
      name: 'Custom',
      description: 'Tailored for your business needs',
      price: null,
      icon: Crown,
      gradient: 'from-purple-500 to-pink-500',
      features: [
        { name: 'Unlimited users', included: true },
        { name: 'Unlimited records', included: true },
        { name: 'Unlimited CRM connections', included: true },
        { name: 'Unlimited AI actions', included: true },
        { name: 'All AI agents + custom agents', included: true },
        { name: 'Dedicated support & CSM', included: true },
        { name: 'Custom integrations', included: true },
        { name: 'SSO/SAML & SLA guarantees', included: true },
      ],
      cta: 'Get Custom Quote',
      ctaLink: '/get-quote',
      popular: true,
      badge: 'Most Popular'
    }
  ]



  const faqs = [
    {
      q: 'Is the Free plan really free forever?',
      a: 'Yes! The Free plan is 100% free forever with no credit card required. It includes 1 user, 100 records, 1 CRM connection, and basic AI agents. Perfect for trying out the platform or for solopreneurs.'
    },
    {
      q: 'How does custom pricing work?',
      a: 'We tailor pricing based on your specific needs: company size, number of users, records volume, CRM integrations, and required features. Fill out our Get Quote form and we\'ll create a custom proposal within 24 hours.'
    },
    {
      q: 'What\'s included in custom plans?',
      a: 'Custom plans include unlimited users, records, CRM connections, AI actions, dedicated support, custom AI agents, SSO/SAML, SLA guarantees, and white-glove onboarding. We can also add custom integrations and features specific to your workflow.'
    },
    {
      q: 'Can I migrate from Free to a custom plan later?',
      a: 'Absolutely! Start free, test the platform, and upgrade whenever you\'re ready. We\'ll help migrate all your data and configurations seamlessly. No disruption to your workflows.'
    },
    {
      q: 'Do you offer nonprofit or education discounts?',
      a: 'Yes! We offer special pricing for registered nonprofits and educational institutions. Mention this when requesting your custom quote and provide documentation.'
    },
    {
      q: 'What kind of support do I get?',
      a: 'Free plans get community support (documentation, help center). Custom plans include dedicated email/chat support, a customer success manager, and SLA guarantees with response times tailored to your needs.'
    }
  ]

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-xl bg-[#0A0A0A]/80">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">RevOps AI</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <Link href="/#features" className="text-gray-400 hover:text-white transition-colors">Platform</Link>
              <Link href="/#agents" className="text-gray-400 hover:text-white transition-colors">AI Agents</Link>
              <Link href="/pricing" className="text-white font-medium">Pricing</Link>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/login" className="text-gray-400 hover:text-white transition-colors px-4 py-2">
                Sign in
              </Link>
              <Link href="/signup" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-5 py-2 rounded-lg transition-all font-medium">
                Start Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a2e_0%,_#0A0A0A_100%)]"></div>
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(to right, #ffffff08 1px, transparent 1px),
              linear-gradient(to bottom, #ffffff08 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px'
          }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-8 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-gray-300">14-day free trial • No credit card required</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Plans that{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                scale with you
              </span>
            </h1>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-16">
              Start free forever. Get custom pricing when you're ready to scale.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="relative pb-32">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            {plans.map((plan, index) => {
              const Icon = plan.icon
              
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.15 }}
                  className="relative group"
                >
                  {plan.badge && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-medium px-3 py-1 rounded-full z-10">
                      {plan.badge}
                    </div>
                  )}
                  
                  <div className={`relative h-full bg-white/[0.02] border ${plan.popular ? 'border-purple-500/50' : 'border-white/10'} rounded-3xl p-10 hover:bg-white/[0.04] transition-all overflow-hidden`}>
                    {/* Gradient Glow */}
                    {plan.popular && (
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    )}
                    
                    <div className="relative">
                      {/* Icon */}
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-6`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>

                      {/* Plan Name */}
                      <h3 className="text-3xl font-bold mb-2">{plan.name}</h3>
                      <p className="text-gray-400 mb-8">{plan.description}</p>

                      {/* Price */}
                      <div className="mb-8">
                        {plan.price !== null ? (
                          <>
                            <div className="flex items-baseline gap-2">
                              <span className="text-6xl font-bold">${plan.price}</span>
                              <span className="text-gray-400 text-xl">/month</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">Forever free, no credit card required</p>
                          </>
                        ) : (
                          <>
                            <div className="text-5xl font-bold mb-2">Custom Pricing</div>
                            <p className="text-sm text-gray-500">Based on your specific needs</p>
                          </>
                        )}
                      </div>

                      {/* CTA */}
                      <Link
                        href={plan.ctaLink}
                        className={`block w-full text-center px-8 py-4 rounded-xl font-semibold transition-all mb-8 text-lg ${
                          plan.popular
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/25'
                            : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
                        }`}
                      >
                        {plan.cta}
                      </Link>

                      {/* Features */}
                      <div className="space-y-4">
                        <div className="text-sm font-semibold text-gray-400 mb-3">What's included:</div>
                        {plan.features.map((feature) => (
                          <div key={feature.name} className="flex items-start gap-3">
                            {feature.included ? (
                              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            ) : (
                              <X className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                            )}
                            <span className={`${feature.included ? 'text-gray-300' : 'text-gray-600'}`}>
                              {feature.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>



      {/* FAQ Section */}
      <section className="py-32">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Frequently asked{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                questions
              </span>
            </h2>
            <p className="text-xl text-gray-400">
              Everything you need to know about pricing and plans
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="font-semibold pr-8">{faq.q}</span>
                  {openFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-6 text-gray-400 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-white/10 rounded-3xl p-12 md:p-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to transform your{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                revenue operations?
              </span>
            </h2>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Start your free trial today. No credit card required.
            </p>
            
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/signup"
                className="group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-10 py-5 rounded-xl transition-all font-semibold text-xl shadow-2xl shadow-purple-500/40 flex items-center gap-2"
              >
                Start Free
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/get-quote"
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-10 py-5 rounded-xl transition-all font-semibold text-xl backdrop-blur-sm"
              >
                Get Custom Quote
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-white/[0.02] py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">RevOps AI</span>
            </Link>
            
            <p className="text-gray-500 text-sm">
              © 2025 RevOps AI. All rights reserved.
            </p>
            
            <div className="flex items-center gap-6 text-sm">
              <Link href="#" className="text-gray-500 hover:text-white transition-colors">Privacy</Link>
              <Link href="#" className="text-gray-500 hover:text-white transition-colors">Terms</Link>
              <Link href="#" className="text-gray-500 hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
