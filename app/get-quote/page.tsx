'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowRight, Bot, CheckCircle, Building2, Users, DollarSign,
  TrendingUp, Loader2, Mail, Phone, User, Briefcase
} from 'lucide-react'

export default function GetQuotePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [estimatedValue, setEstimatedValue] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    companyName: '',
    phone: '',
    companySize: '',
    industry: '',
    currentCrm: [] as string[],
    estimatedPipelineValue: '',
    numUsers: '',
    annualRevenue: '',
    primaryChallenges: [] as string[],
    additionalNotes: ''
  })

  const companySizes = [
    { value: '1-10', label: '1-10 employees' },
    { value: '11-50', label: '11-50 employees' },
    { value: '51-200', label: '51-200 employees' },
    { value: '201-500', label: '201-500 employees' },
    { value: '500+', label: '500+ employees' }
  ]

  const pipelineValues = [
    { value: 'under_1m', label: 'Under $1M' },
    { value: '1m_10m', label: '$1M - $10M' },
    { value: '10m_50m', label: '$10M - $50M' },
    { value: '50m+', label: '$50M+' }
  ]

  const annualRevenues = [
    { value: 'under_1m', label: 'Under $1M' },
    { value: '1m_10m', label: '$1M - $10M' },
    { value: '10m_50m', label: '$10M - $50M' },
    { value: '50m_100m', label: '$50M - $100M' },
    { value: '100m+', label: '$100M+' }
  ]

  const crmOptions = [
    'Salesforce',
    'HubSpot',
    'Pipedrive',
    'Microsoft Dynamics',
    'Zoho CRM',
    'Close',
    'Other'
  ]

  const challenges = [
    { value: 'data_hygiene', label: 'Data Quality & Hygiene' },
    { value: 'forecasting', label: 'Revenue Forecasting' },
    { value: 'deal_velocity', label: 'Deal Velocity & Pipeline Health' },
    { value: 'reporting', label: 'Manual Reporting & Analytics' },
    { value: 'crm_adoption', label: 'CRM Adoption & Usage' },
    { value: 'territory_planning', label: 'Territory & Quota Planning' },
    { value: 'integration', label: 'Multi-CRM Integration' },
    { value: 'automation', label: 'Workflow Automation' }
  ]

  const handleCrmToggle = (crm: string) => {
    setFormData(prev => ({
      ...prev,
      currentCrm: prev.currentCrm.includes(crm)
        ? prev.currentCrm.filter(c => c !== crm)
        : [...prev.currentCrm, crm]
    }))
  }

  const handleChallengeToggle = (challenge: string) => {
    setFormData(prev => ({
      ...prev,
      primaryChallenges: prev.primaryChallenges.includes(challenge)
        ? prev.primaryChallenges.filter(c => c !== challenge)
        : [...prev.primaryChallenges, challenge]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/quote-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          numUsers: formData.numUsers ? parseInt(formData.numUsers) : null
        })
      })

      const data = await response.json()

      if (response.ok) {
        setEstimatedValue(data.estimatedValue)
        setSubmitted(true)
      } else {
        alert(data.error || 'Failed to submit quote request')
      }
    } catch (error: any) {
      console.error('Quote submission error:', error)
      alert('Failed to submit quote request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center px-6">
        <div className="max-w-2xl w-full text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-8"
          >
            <CheckCircle className="w-12 h-12 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            Thank you for your interest!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-gray-400 mb-8"
          >
            We've received your quote request and our team will reach out within 24 hours.
          </motion.p>

          {estimatedValue && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/[0.02] border border-white/10 rounded-2xl p-8 mb-8"
            >
              <p className="text-gray-400 mb-2">Estimated Annual Value</p>
              <p className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                ${estimatedValue.toLocaleString()}
              </p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-4"
          >
            <p className="text-gray-400">What happens next?</p>
            <div className="grid md:grid-cols-3 gap-4 text-left">
              {[
                { step: '1', title: 'Review', desc: 'We analyze your needs' },
                { step: '2', title: 'Custom Quote', desc: 'Tailored pricing proposal' },
                { step: '3', title: 'Demo', desc: 'Live product walkthrough' }
              ].map((item) => (
                <div key={item.step} className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
                  <div className="w-8 h-8 rounded-full bg-purple-600/20 text-purple-400 font-bold flex items-center justify-center mb-2">
                    {item.step}
                  </div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="pt-8">
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-xl transition-all font-semibold"
              >
                Back to Home
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

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
      <section className="relative pt-32 pb-12 overflow-hidden">
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

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Get your{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                custom quote
              </span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-4">
              Tell us about your needs and we'll create a tailored solution for your team
            </p>
            <p className="text-sm text-gray-500">
              ⚡ Response within 24 hours • 🎯 Custom pricing • 💬 Free consultation
            </p>
          </motion.div>
        </div>
      </section>

      {/* Form Section */}
      <section className="relative pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <form onSubmit={handleSubmit} className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-12">
            {/* Contact Information */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <User className="w-6 h-6 text-purple-400" />
                Contact Information
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                    placeholder="john@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                    placeholder="Acme Inc"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
            </div>

            {/* Company Details */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-purple-400" />
                Company Details
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-3">Company Size *</label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {companySizes.map((size) => (
                      <button
                        key={size.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, companySize: size.value })}
                        className={`px-4 py-3 rounded-xl border transition-all text-sm ${
                          formData.companySize === size.value
                            ? 'bg-purple-600/20 border-purple-500 text-white'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Industry</label>
                    <input
                      type="text"
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                      placeholder="SaaS, Manufacturing, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Annual Revenue</label>
                    <select
                      value={formData.annualRevenue}
                      onChange={(e) => setFormData({ ...formData, annualRevenue: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors [&>option]:bg-slate-800 [&>option]:text-white"
                    >
                      <option value="" className="bg-slate-800 text-gray-400">Select range</option>
                      {annualRevenues.map((rev) => (
                        <option key={rev.value} value={rev.value} className="bg-slate-800 text-white">{rev.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Setup */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-purple-400" />
                Current Setup
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-3">Current CRM(s)</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {crmOptions.map((crm) => (
                      <button
                        key={crm}
                        type="button"
                        onClick={() => handleCrmToggle(crm)}
                        className={`px-4 py-3 rounded-xl border transition-all text-sm ${
                          formData.currentCrm.includes(crm)
                            ? 'bg-purple-600/20 border-purple-500 text-white'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        {crm}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Pipeline Value</label>
                    <select
                      value={formData.estimatedPipelineValue}
                      onChange={(e) => setFormData({ ...formData, estimatedPipelineValue: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors [&>option]:bg-slate-800 [&>option]:text-white"
                    >
                      <option value="" className="bg-slate-800 text-gray-400">Select range</option>
                      {pipelineValues.map((val) => (
                        <option key={val.value} value={val.value} className="bg-slate-800 text-white">{val.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Number of Users</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.numUsers}
                      onChange={(e) => setFormData({ ...formData, numUsers: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                      placeholder="10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Challenges */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-purple-400" />
                Primary Challenges
              </h2>
              <div className="grid md:grid-cols-2 gap-3">
                {challenges.map((challenge) => (
                  <button
                    key={challenge.value}
                    type="button"
                    onClick={() => handleChallengeToggle(challenge.value)}
                    className={`px-4 py-3 rounded-xl border transition-all text-sm text-left ${
                      formData.primaryChallenges.includes(challenge.value)
                        ? 'bg-purple-600/20 border-purple-500 text-white'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    {challenge.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Notes */}
            <div className="mb-10">
              <label className="block text-sm font-medium mb-2">Additional Notes</label>
              <textarea
                value={formData.additionalNotes}
                onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors resize-none"
                placeholder="Tell us more about your specific needs, timeline, or questions..."
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-5 rounded-xl transition-all font-semibold text-lg shadow-2xl shadow-purple-500/40 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Get Custom Quote
                  <ArrowRight className="w-6 h-6" />
                </>
              )}
            </button>

            <p className="text-center text-sm text-gray-500 mt-6">
              By submitting, you agree to our Terms of Service and Privacy Policy
            </p>
          </form>
        </div>
      </section>
    </div>
  )
}
