// Legacy file - now using Gemini instead
// This file is kept for backwards compatibility but redirects to Gemini
import { analyzeWithGemini } from './gemini'

/**
 * @deprecated Use analyzeWithGemini instead
 * This function is kept for backwards compatibility
 */
export async function analyzeWithClaude(prompt: string): Promise<string> {
  console.warn('analyzeWithClaude is deprecated. Using Gemini instead.')
  return analyzeWithGemini(prompt)
}

