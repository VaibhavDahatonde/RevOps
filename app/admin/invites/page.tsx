'use client'

import { useState } from 'react'
import { Copy, Plus, Check, Mail, Calendar, UserPlus } from 'lucide-react'
import Link from 'next/link'

export default function AdminInvitesPage() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [expiresInDays, setExpiresInDays] = useState(30)
  const [inviteUrl, setInviteUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const generateInvite = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/invitations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email || undefined,
          notes,
          expiresInDays,
          maxUses: 1,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setInviteUrl(data.inviteUrl)
        // Reset form
        setEmail('')
        setNotes('')
      } else {
        alert('Failed to create invitation')
      }
    } catch (error) {
      alert('Error creating invitation')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Invitation Manager</h1>
          <p className="text-gray-300">Create invite links for beta users</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Create Invitation Form */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-purple-400" />
              Create Invitation
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email (Optional)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@company.com"
                    className="w-full bg-white/10 border border-white/20 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  If specified, only this email can use the invite
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., John from Acme Corp, Met at conference"
                  rows={3}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expires In
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <select
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                    className="w-full bg-white/10 border border-white/20 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>
              </div>

              <button
                onClick={generateInvite}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors font-semibold flex items-center justify-center gap-2"
              >
                {loading ? (
                  'Creating...'
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Generate Invite Link
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Generated Invitation */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Generated Link</h2>

            {!inviteUrl ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="w-8 h-8 text-purple-400" />
                </div>
                <p className="text-gray-400">
                  No invite generated yet. Fill in the form and click "Generate Invite Link"
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-green-300 font-semibold mb-1">Invitation Created!</p>
                      <p className="text-green-200 text-sm">
                        Share this link with your invitee
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Invitation URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteUrl}
                      readOnly
                      className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white text-sm font-mono"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition-colors flex items-center gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-blue-300 text-sm font-semibold mb-2">How to use:</p>
                  <ol className="text-blue-200 text-sm space-y-1 list-decimal list-inside">
                    <li>Copy the URL above</li>
                    <li>Send it to your invitee via email/Slack/etc</li>
                    <li>They click the link and can sign up</li>
                    <li>Each link works once (single-use)</li>
                  </ol>
                </div>

                <button
                  onClick={() => setInviteUrl('')}
                  className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  Create Another Invite
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-purple-300 text-sm transition-colors"
          >
            ← Back to dashboard
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">Tips for Beta Testing</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-purple-400 font-semibold mb-1">🎯 Target Users</p>
              <p className="text-gray-300">
                RevOps leaders at Series A/B companies with 10-50 sales reps
              </p>
            </div>
            <div>
              <p className="text-purple-400 font-semibold mb-1">💬 Get Feedback</p>
              <p className="text-gray-300">
                Ask: "What problem does this solve?" and "Would you pay for it?"
              </p>
            </div>
            <div>
              <p className="text-purple-400 font-semibold mb-1">📊 Track Usage</p>
              <p className="text-gray-300">
                Monitor who connects CRM, syncs data, and uses features actively
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
