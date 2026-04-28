import { createClient } from '@/lib/supabase/server'

// Enhanced Supabase client with additional utilities
export class SupabaseQueryBuilder {
  private query: any
  private table: string

  constructor(query: any, table: string) {
    this.query = query
    this.table = table
  }

  // Enhanced select with nested relationships
  select(columns: string = '*'): this {
    this.query = this.query.select(columns)
    return this
  }

  // Simplified where clause with common operators
  where(column: string, operator: string, value: any): this {
    this.query = this.query.filter(column, operator, value)
    return this
  }

  whereIn(column: string, values: any[]): this {
    this.query = this.query.in(column, values)
    return this
  }

  whereNot(column: string, operator: string, value: any): this {
    this.query = this.query.not(column, operator, value)
    return this
  }

  // Ordering
  order(column: string, ascending: boolean = true): this {
    this.query = this.query.order(column, { ascending })
    return this
  }

  // Pagination
  limit(count: number): this {
    this.query = this.query.limit(count)
    return this
  }

  range(from: number, to: number): this {
    this.query = this.query.range(from, to)
    return this
  }

  // Full-text search
  search(column: string, query: string): this {
    this.query = this.query.textSearch(column, query)
    return this
  }

  // Execute query
  async execute() {
    try {
      const { data, error } = await this.query
      if (error) throw error
      return data
    } catch (err) {
      console.error(`Query error on table ${this.table}:`, err)
      throw err
    }
  }

  // Execute with single result
  async single() {
    try {
      const { data, error } = await this.query.single()
      if (error) throw error
      return data
    } catch (err) {
      console.error(`Single query error on table ${this.table}:`, err)
      throw err
    }
  }

  // Execute with count
  async count() {
    try {
      const { count, error } = await this.query
      if (error) throw error
      return count
    } catch (err) {
      console.error(`Count query error on table ${this.table}:`, err)
      throw err
    }
  }
}

export class SupabaseClient {
  private supabase: any

  constructor() {
    this.supabase = createClient()
  }

  // Get table with enhanced query builder
  table(name: string): SupabaseQueryBuilder {
    return new SupabaseQueryBuilder(this.supabase.from(name), name)
  }

  // Direct RPC calls
  async rpc(functionName: string, params: any = {}) {
    try {
      const { data, error } = await this.supabase.rpc(functionName, params)
      if (error) throw error
      return data
    } catch (err) {
      console.error(`RPC call error for ${functionName}:`, err)
      throw err
    }
  }

  // Auth utilities
  async getUser() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser()
      if (error) throw error
      return user
    } catch (err) {
      console.error('Get user error:', err)
      throw err
    }
  }

  async getSession() {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession()
      if (error) throw error
      return session
    } catch (err) {
      console.error('Get session error:', err)
      throw err
    }
  }
}

// Service client with elevated privileges
export class SupabaseServiceClient extends SupabaseClient {
  constructor() {
    // This would use the service role key in production
    super()
  }

  // Bypass RLS for admin operations
  bypassRLS() {
    // This is handled by using service role key
    return this
  }
}

// Default export for backwards compatibility
export default SupabaseClient

// Enhanced query builder export
export { SupabaseQueryBuilder as EnhancedQueryBuilder }
