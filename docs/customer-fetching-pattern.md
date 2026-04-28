# Customer Data Fetching Pattern

## 🚨 Problem: Excessive API Polling

**Issue**: Multiple components fetching `/api/customer` independently, causing:
- 5+ requests every 750ms
- Server load and performance issues
- User experience degradation
- Rate limiting warnings

**Root Cause**: React anti-pattern where each component manages its own data fetching without coordination.

## ✅ Solution: Shared Customer Hook

### **Key Features**
- **Single Source of Truth**: One centralized fetch for all customer data
- **Deduplication**: Prevents duplicate requests across components  
- **Caching**: 30-second cache to avoid repeated API calls
- **Error Handling**: Centralized error state and retry logic
- **Real-time Updates**: Notifies all components when data changes

### **Usage Pattern**

```typescript
// ✅ Correct: Use shared hook
import { useCustomer } from '@/hooks/useCustomer'

function MyComponent() {
  const { customer, customerId, loading, error, refreshCustomer } = useCustomer()
  
  // Customer data is shared across all components
  // Only one API call made per 30 seconds maximum
  return <div>{customer?.name}</div>
}

// ❌ Incorrect: Direct fetch in multiple components
function BadComponent() {
  const [customer, setCustomer] = useState(null)
  
  useEffect(() => {
    fetch('/api/customer').then(setCustomer) // Causes multiple calls
  }, [])
}
```

## 🏗️ Architecture

### **Global State Management**
```typescript
// Global singleton to share customer data
let globalCustomerState = {
  customer: null,
  loading: false,
  error: null,
  lastFetch: 0,
  listeners: new Set() // All components using this hook
}
```

### **Fetch Deduplication**
```typescript
// Only fetch if:
// - No recent fetch (< 30 seconds)
// - No cached data available
// - No ongoing duplicate calls

if (globalCustomerState.customer && 
    (now - globalCustomerState.lastFetch) < 30000) {
  console.log('🔄 Using cached customer data')
  return globalCustomerState.customer
}
```

### **Component Subscription**
```typescript
// Components subscribe to state changes
useEffect(() => {
  const updateListener = (customer, loading, error) => {
    // Update local component state when global state changes
  }
  
  globalCustomerState.listeners.add(updateListener)
  
  // Auto-cleanup to prevent memory leaks
  return () => globalCustomerState.listeners.delete(updateListener)
}, [])
```

## 📋 Implementation Checklist

### **Before Implementation**
- [ ] Check all `/api/customer` fetches in codebase
- [ ] Identify components doing direct fetches
- [ ] Look for useEffect hooks without proper dependency arrays

### **During Implementation**
- [ ] Replace direct fetches with `useCustomer()` hook
- [ ] Remove local customer state management
- [ ] Update error handling to use shared state
- [ ] Test all component re-renders

### **After Implementation**
- [ ] Verify only 1-2 calls to `/api/customer` in dev tools
- [ ] Check network tab for proper caching behavior
- [ ] Test error scenarios (401, 500, network issues)
- [ ] Verify all components get updated data simultaneously

## 🔧 Custom Hook API

```typescript
interface UseCustomerReturn {
  customer: CustomerData | null           // Current customer object
  customerId: string | null              // Customer UUID (for API calls)
  loading: boolean                        // Loading state
  error: string | null                   // Error message
  refreshCustomer: () => Promise<void>    // Force refresh
  updateCustomer: (updates: Partial<CustomerData>) => Promise<void>  // Update customer
  skipOnboarding: () => Promise<void>     // Skip onboarding flow
}
```

### **Methods Available**

```typescript
// Get current customer data
const { customer, customerId } = useCustomer()

// Force fresh fetch (bypasses cache)
const { refreshCustomer } = useCustomer()

// Update customer data (PATCH operation)
const { updateCustomer } = useCustomer()
await updateCustomer({ skip_onboarding: true })

// Automatic onboarding skip helper
const { skipOnboarding } = useCustomer()
await skipOnboarding()
```

## 🚀 Performance Benefits

### **Before Fix**
```
GET /api/customer 200 in 800ms
GET /api/customer 200 in 750ms  
GET /api/customer 200 in 798ms
GET /api/customer 200 in 801ms
... (10+ concurrent calls)
```

### **After Fix**
```
GET /api/customer 200 in 808ms
🔄 Using cached customer data
🔄 Using cached customer data
🔄 Using cached customer data
... (deduplicated with cache)
```

## 🐛 Debugging & Monitoring

### **Console Logs**
- `🔍 Fetching fresh customer data...` - New API call initiated
- `🔄 Using cached customer data` - Cache hit
- `✅ Customer data fetched successfully` - Fetch completed
- `❌ Customer fetch error: [error]` - Fetch failed

### **Common Issues**

**Issue**: Components not updating**
- **Check**: Component imported `useCustomer` correctly
- **Fix**: Ensure proper useEffect cleanup with `return () => cleanup()`

**Issue**: Still seeing multiple API calls**
- **Check**: Multiple page loads or component remounts
- **Fix**: Verify React component stability and key props

**Issue**: Cache not working**
- **Check**: Cache timeout setting (currently 30 seconds)
- **Fix**: Adjust cache TTL in `useCustomer.ts`

## 🔄 Migration Guide

### **Step 1: Install Hook**
```typescript
// Replace all direct customer fetches:
import { useCustomer } from '@/hooks/useCustomer'
```

### **Step 2: Update Components**
```typescript
// Before:
const [customer, setCustomer] = useState(null)
const [loading, setLoading] = useState(true)

useEffect(() => {
  fetch('/api/customer').then(response => {
    setCustomer(response?.data?.customer)
    setLoading(false)
  })
}, [])

// After:
const { customer, loading } = useCustomer()
// No useEffect needed for initialization
```

### **Step 3: Handle Updates**
```typescript
// Before:
await fetch('/api/customer', {
  method: 'PATCH',
  body: JSON.stringify({ skip_onboarding: true })
})

// After:
const { updateCustomer } = useCustomer()
await updateCustomer({ skip_onboarding: true })
```

## 📚 Future Considerations

### **Potential Enhancements**
1. **React Query/SWR Integration**: Consider migrating for advanced caching
2. **WebSocket Updates**: Real-time sync when customer data changes
3. **Optimistic Updates**: UI updates before API confirmation
4. **Background Refresh**: Periodic sync without user action

### **Component Architecture**
```typescript
// Recommended pattern: Provider at root level
<Provider>
  <Layout>
    <Page />
  </Layout>
</Provider>

// Avoid: Individual components managing their own state
function Page() {
  const customer = useCustomer() // Shared, efficient
  return <Component customer={customer} />
}
```

---

**Result**: From 10+ concurrent `/api/customer` calls every ~750ms to maximum 1 call per 30 seconds with automatic caching and real-time updates for all components.
