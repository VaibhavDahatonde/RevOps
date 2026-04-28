import { createClient } from '@/lib/supabase/client'

interface AuthenticatedFetchOptions extends RequestInit {
  includeCredentials?: boolean
}

/**
 * Authenticated fetch helper for client-side API calls
 * Automatically adds authentication headers from Supabase session
 */
export async function authenticatedFetch(
  url: string,
  options: AuthenticatedFetchOptions = {}
): Promise<Response> {
  const supabase = createClient()
  
  try {
    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session) {
      console.warn('No authenticated session found, falling back to anonymous request')
      // Fall back to regular fetch for public endpoints
      return fetch(url, options)
    }

    // Add Authorization header
    const headers = {
      ...options.headers,
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    }

    // Add cookies if needed for server-side auth
    if (options.includeCredentials) {
      return fetch(url, {
        ...options,
        headers,
        credentials: 'include'
      })
    }

    return fetch(url, {
      ...options,
      headers
    })
  } catch (error) {
    console.error('Error in authenticated fetch:', error)
    
    // Fallback to regular fetch
    const headers = {
      ...options.headers,
      'Content-Type': 'application/json'
    }
    
    return fetch(url, {
      ...options,
      headers
    })
  }
}

/**
 * Simple wrapper for GET requests
 */
export async function authenticatedGet(
  url: string,
  options: Omit<AuthenticatedFetchOptions, 'method' | 'body'> = {}
): Promise<Response> {
  return authenticatedFetch(url, { ...options, method: 'GET' })
}

/**
 * Simple wrapper for POST requests
 */
export async function authenticatedPost(
  url: string,
  body?: any,
  options: Omit<AuthenticatedFetchOptions, 'method'> = {}
): Promise<Response> {
  return authenticatedFetch(url, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined
  })
}

/**
 * Simple wrapper for PUT requests
 */
export async function authenticatedPut(
  url: string,
  body?: any,
  options: Omit<AuthenticatedFetchOptions, 'method'> = {}
): Promise<Response> {
  return authenticatedFetch(url, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined
  })
}

/**
 * Simple wrapper for DELETE requests
 */
export async function authenticatedDelete(
  url: string,
  options: Omit<AuthenticatedFetchOptions, 'method' | 'body'> = {}
): Promise<Response> {
  return authenticatedFetch(url, { ...options, method: 'DELETE' })
}
