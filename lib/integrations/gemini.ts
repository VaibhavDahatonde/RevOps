import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini client
const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null

/**
 * Analyze data with Google Gemini
 * @param prompt - The prompt to send to Gemini
 * @returns AI-generated response text
 */
export async function analyzeWithGemini(prompt: string): Promise<string> {
  try {
    if (!genAI) {
      throw new Error('Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables.')
    }

    // Use Gemini Pro for reliable responses
    // Available models: 'gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-pro-latest'
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return text || 'No response generated'
  } catch (error: any) {
    console.error('Gemini API error:', error)
    
    // Provide helpful error messages
    if (error.message?.includes('API key')) {
      throw new Error('Invalid Gemini API key. Please check your GEMINI_API_KEY in .env')
    }
    
    if (error.message?.includes('quota')) {
      throw new Error('Gemini API quota exceeded. Please check your usage at https://aistudio.google.com/')
    }
    
    throw new Error(`Failed to analyze with Gemini: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Stream responses from Gemini (for real-time chat)
 * @param prompt - The prompt to send to Gemini
 * @returns Async generator that yields text chunks
 */
export async function* streamWithGemini(prompt: string): AsyncGenerator<string> {
  if (!genAI) {
    throw new Error('Gemini API key not configured')
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
  const result = await model.generateContentStream(prompt)

  for await (const chunk of result.stream) {
    const chunkText = chunk.text()
    if (chunkText) {
      yield chunkText
    }
  }
}
