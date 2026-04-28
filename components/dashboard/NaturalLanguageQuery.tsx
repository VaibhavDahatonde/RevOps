'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, TrendingUp, Target, AlertTriangle, Loader2 } from 'lucide-react'
import { Card } from '../ui/card'

interface QueryResult {
  answer: string
  confidence: number
  sources?: string[]
  suggestions?: string[]
}

const exampleQuestions = [
  "Why did enterprise deals slow down this month?",
  "Which deals are most likely to close this quarter?",
  "Show me at-risk deals over $50K",
  "What's our forecast accuracy for Q4?",
  "Why is deal XYZ stuck in negotiation?"
]

interface NaturalLanguageQueryProps {
  customerId?: string
}

export default function NaturalLanguageQuery({ customerId }: NaturalLanguageQueryProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [history, setHistory] = useState<Array<{ query: string; result: QueryResult }>>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || loading) return

    setLoading(true)
    
    try {
        // CRITICAL: Get fresh customer data to ensure we have correct customerId
        const customerResponse = await fetch('/api/customer')
        const customerData = await customerResponse.json()
        
        if (!customerData.customer || !customerData.customer.id) {
          throw new Error('No customer data available')
        }
        
        const actualCustomerId = customerData.customer.id
        console.log('Submitting query for customer:', actualCustomerId)
        
        const response = await fetch('/api/v1/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            question: query,
            customerId: actualCustomerId 
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const newResult: QueryResult = {
            answer: data.answer || data.response || "I've analyzed your data. Here's what I found...",
            confidence: data.confidence || 85,
            sources: data.sources || [],
            suggestions: data.suggestions || []
          }
          
          setResult(newResult)
          setHistory(prev => [{ query, result: newResult }, ...prev.slice(0, 4)])
          console.log('Query successful:', { confidence: newResult.confidence, sources: newResult.sources })
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Query failed')
        }
      } catch (error: any) {
        console.error('Query error:', error)
        setResult({
          answer: "Sorry, I couldn't process that query. Please try again.",
          confidence: 0,
          sources: [],
          suggestions: []
        })
      } finally {
        setLoading(false)
      }
  }

  const handleExampleClick = (example: string) => {
    setQuery(example)
  }

  return (
    <div className="space-y-6">
      {/* Main Query Card */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Ask Anything About Your Pipeline</h2>
              <p className="text-gray-400">Get instant AI-powered answers in plain English</p>
            </div>
          </div>

          {/* Query Input */}
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., Why did enterprise deals slow down this month?"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows={2}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-3 bottom-3 w-10 h-10 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Send className="w-5 h-5 text-white" />
              )}
            </button>
          </form>

          {/* Example Questions */}
          {!result && (
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-3">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {exampleQuestions.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(example)}
                    className="text-xs bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg px-3 py-2 text-gray-300 transition-all"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Query Result */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-6 bg-slate-800/50 border border-slate-700 rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <span className="text-sm font-semibold text-white">AI Answer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Confidence:</span>
                    <span className={`text-xs font-semibold ${
                      result.confidence >= 80 ? 'text-green-400' : 
                      result.confidence >= 60 ? 'text-yellow-400' : 
                      'text-red-400'
                    }`}>
                      {result.confidence}%
                    </span>
                  </div>
                </div>

                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{result.answer}</p>

                {result.sources && result.sources.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-xs text-gray-400 mb-2">Sources:</p>
                    <div className="flex flex-wrap gap-2">
                      {result.sources.map((source, index) => (
                        <span key={index} className="text-xs bg-slate-700/50 rounded px-2 py-1 text-gray-300">
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.suggestions && result.suggestions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-xs text-gray-400 mb-2">Related questions:</p>
                    <div className="space-y-2">
                      {result.suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleExampleClick(suggestion)}
                          className="block text-sm text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          → {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setResult(null)}
                  className="mt-4 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Ask another question
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* Quick Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/30 border-slate-700">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span className="text-sm font-semibold text-white">Top Opportunity</span>
            </div>
            <p className="text-lg font-bold text-white mb-1">Acme Corp - $250K</p>
            <p className="text-xs text-gray-400">87% probability • Closes in 12 days</p>
          </div>
        </Card>

        <Card className="bg-slate-800/30 border-slate-700">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-semibold text-white">Forecast Accuracy</span>
            </div>
            <p className="text-lg font-bold text-white mb-1">87.3%</p>
            <p className="text-xs text-gray-400">+2.3% from last quarter</p>
          </div>
        </Card>

        <Card className="bg-slate-800/30 border-slate-700">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-semibold text-white">At-Risk Deals</span>
            </div>
            <p className="text-lg font-bold text-white mb-1">3 deals • $180K</p>
            <p className="text-xs text-gray-400">Need attention this week</p>
          </div>
        </Card>
      </div>

      {/* Recent Query History */}
      {history.length > 0 && (
        <Card className="bg-slate-800/30 border-slate-700">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Questions</h3>
            <div className="space-y-3">
              {history.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(item.query)
                    setResult(item.result)
                  }}
                  className="w-full text-left p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-700 transition-all group"
                >
                  <p className="text-sm text-gray-300 group-hover:text-white transition-colors">
                    {item.query}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Confidence: {item.result.confidence}%
                  </p>
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
