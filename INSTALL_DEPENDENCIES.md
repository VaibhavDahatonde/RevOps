# Dependencies Installation Guide

## Step 1: Install Required Packages

Run this command in your terminal:

```bash
npm install framer-motion sonner cmdk class-variance-authority clsx tailwind-merge lucide-react recharts
```

## Package Details

| Package | Purpose | Size |
|---------|---------|------|
| `framer-motion` | Animations & transitions | ~150KB |
| `sonner` | Beautiful toast notifications | ~15KB |
| `cmdk` | Command palette (⌘K menu) | ~30KB |
| `class-variance-authority` | Component variants | ~5KB |
| `clsx` | Conditional classNames | ~1KB |
| `tailwind-merge` | Merge Tailwind classes | ~10KB |

## What You Get

✅ **Framer Motion** - Smooth animations for everything
✅ **Sonner** - Toast notifications (Vercel-style)
✅ **CMDK** - Command Palette like Linear/GitHub
✅ **CVA** - Type-safe component variants
✅ **Utils** - Better className handling

## Installation Steps

1. **Run the install command above**
2. **Wait for completion** (~30 seconds)
3. **Verify installation:**
   ```bash
   npm list framer-motion sonner cmdk
   ```
4. **Start building!**

## If Installation Fails

### Node version issue:
```bash
node --version  # Should be 18+
```

### Cache issues:
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Permission issues (Windows):
```bash
# Run as Administrator
```

## After Installation

I'll create all the components that use these packages!

Ready? Run the install command and let me know when it's done!
