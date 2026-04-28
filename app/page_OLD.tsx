'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, Sparkles, TrendingUp, BarChart3, Zap, Shield, Brain, Users, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function LandingPage() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      router.push('/dashboard')
    } else {
      setIsChecking(false)
    }
  }

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-white/10 backdrop-blur-lg bg-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-purple-400" />
              <span className="text-2xl font-bold text-white">RevOps AI</span>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/login"
                className="text-white hover:text-purple-300 transition-colors px-4 py-2"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors font-semibold"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-32">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/50 rounded-full px-4 py-2 mb-8">
            <Brain className="w-4 h-4 text-purple-300" />
            <span className="text-purple-200 text-sm font-medium">AI-Powered Revenue Operations</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Transform Your
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"> Revenue Data </span>
            Into Actionable Insights
          </h1>
          
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Connect your CRM, get AI-powered analytics, and make data-driven decisions that accelerate revenue growth. No spreadsheets, no guesswork.
          </p>
          
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/signup"
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-lg transition-colors font-semibold text-lg flex items-center gap-2 shadow-lg shadow-purple-500/50"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-8 py-4 rounded-lg transition-colors font-semibold text-lg backdrop-blur-sm"
            >
              View Demo
            </Link>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>14-day free trial</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Everything You Need to Scale Revenue
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Powerful AI-driven features designed for modern revenue teams
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-8 hover:bg-white/15 transition-all hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20">
            <div className="bg-purple-500/20 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Real-Time Metrics</h3>
            <p className="text-gray-300">
              Track pipeline, win rate, cycle time, and velocity with live updates from your CRM.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-8 hover:bg-white/15 transition-all hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20">
            <div className="bg-purple-500/20 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">AI-Powered Insights</h3>
            <p className="text-gray-300">
              Get smart alerts and recommendations when metrics deviate or opportunities arise.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-8 hover:bg-white/15 transition-all hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20">
            <div className="bg-purple-500/20 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Visual Analytics</h3>
            <p className="text-gray-300">
              Beautiful dashboards with pipeline charts, trend analysis, and deal tracking.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-8 hover:bg-white/15 transition-all hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20">
            <div className="bg-purple-500/20 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">One-Click Integration</h3>
            <p className="text-gray-300">
              Connect HubSpot or Salesforce in seconds with secure OAuth. No manual data entry.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-8 hover:bg-white/15 transition-all hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20">
            <div className="bg-purple-500/20 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Enterprise Security</h3>
            <p className="text-gray-300">
              Bank-level encryption, SOC 2 compliance, and row-level security for your data.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-8 hover:bg-white/15 transition-all hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20">
            <div className="bg-purple-500/20 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Team Collaboration</h3>
            <p className="text-gray-300">
              Share insights, export reports, and align your revenue team on key metrics.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-white/20 rounded-2xl p-12 backdrop-blur-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white mb-6">
                Why Revenue Teams Love RevOps AI
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-semibold mb-1">Save 10+ Hours Per Week</h4>
                    <p className="text-gray-300">Eliminate manual reporting and data analysis.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-semibold mb-1">Increase Win Rate by 15%</h4>
                    <p className="text-gray-300">Identify and act on opportunities faster with AI insights.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-semibold mb-1">Reduce Sales Cycle by 20%</h4>
                    <p className="text-gray-300">Spot bottlenecks and optimize your sales process.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-semibold mb-1">Make Data-Driven Decisions</h4>
                    <p className="text-gray-300">Trust your metrics with real-time accuracy and AI recommendations.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-8 border border-white/20">
              <div className="text-center">
                <div className="text-6xl font-bold text-purple-400 mb-2">94%</div>
                <p className="text-gray-300 mb-6">of teams see ROI within 30 days</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-white">15+</div>
                    <div className="text-sm text-gray-400">Integrations</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">500K+</div>
                    <div className="text-sm text-gray-400">Deals Tracked</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">99.9%</div>
                    <div className="text-sm text-gray-400">Uptime</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Revenue Operations?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join hundreds of revenue teams using AI to close more deals faster.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-10 py-5 rounded-lg transition-colors font-semibold text-xl shadow-lg shadow-purple-500/50"
          >
            Start Your Free Trial
            <ArrowRight className="w-6 h-6" />
          </Link>
          <p className="text-sm text-gray-400 mt-4">No credit card required • 14-day free trial • Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-white/5 backdrop-blur-lg mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-purple-400" />
                <span className="text-xl font-bold text-white">RevOps AI</span>
              </div>
              <p className="text-gray-400 text-sm">
                AI-powered revenue operations platform for modern sales teams.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-purple-300 transition-colors">Features</a></li>
                <li><a href="#" className="text-gray-400 hover:text-purple-300 transition-colors">Integrations</a></li>
                <li><a href="#" className="text-gray-400 hover:text-purple-300 transition-colors">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-purple-300 transition-colors">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-purple-300 transition-colors">About</a></li>
                <li><a href="#" className="text-gray-400 hover:text-purple-300 transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-purple-300 transition-colors">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-purple-300 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-purple-300 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-purple-300 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-gray-400 hover:text-purple-300 transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-gray-400 text-sm">
            © 2025 RevOps AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
