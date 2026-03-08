

## Problem

The `;;` separator in market link URLs (e.g., `[Label](market:ID;;PROTO;;ASSET;;APY;;TVL)`) is not being recognized as a valid URL by the markdown parser. The entire link syntax is rendered as raw text instead of being parsed into an `<a>` tag, so the custom `a` component renderer never fires.

## Root Cause

Standard markdown parsers are strict about valid URL characters inside `()`. The `;;` sequences (and possibly the long `0x...` addresses) cause the parser to reject the entire `[text](href)` construct, dumping it as plain text.

## Solution: Pre-process Content Before Rendering

Instead of relying on the markdown parser to handle custom URL schemes, we'll **pre-process the message content** before passing it to `ReactMarkdown`:

1. **Extract market links** using a regex: `/\[([^\]]+)\]\(market:([^)]+)\)/g`
2. **Replace** each match with an HTML-safe placeholder: `<market-btn idx="0" />`
3. **Store** extracted metadata in an array
4. **Render** the placeholders via a custom `react-markdown` component for the `market-btn` element (using `rehypeRaw` or a custom component mapping)

### Implementation Details

**`src/components/MessageBubble.tsx`**:
- Add a `preprocessMarketLinks(content)` function that:
  - Scans for `[Label](market:ID;;PROTO;;ASSET;;APY;;TVL)` patterns
  - Stores each match's metadata in an array
  - Replaces the match with `%%MARKET_0%%`, `%%MARKET_1%%`, etc.
  - After ReactMarkdown renders, we won't use this approach...

Actually, cleaner approach: **Replace before markdown parsing** with simple safe markdown links:
- Regex-find all `[text](market:...)` patterns
- Replace the `;;` with a URL-safe encoding like `-_-` or encode the whole metadata as base64
- Or better: replace the `;;` fields into URL query params: `market:ID?p=Proto&a=Asset&y=APY&t=TVL`

**Simplest reliable approach**: Replace `;;` with a URL-safe delimiter that markdown parsers accept. Use `__` (double underscore) — it's URL-safe and won't conflict with markdown syntax.

### Changes

1. **`supabase/functions/chat/index.ts`** — Update system prompt to use `__` (double underscore) as the separator instead of `;;`:
   ```
   [Label](market:ID__PROTOCOL__ASSET__APY__TVL)
   ```

2. **`src/components/MessageBubble.tsx`** — Update `parseMarketHref` to split on `__` instead of `;;`. Also add a **content pre-processor** as a safety net: before passing content to ReactMarkdown, regex-replace any remaining `;;` with `__` in market links.

3. **Add `rehypeRaw`** support is not needed — simpler to just fix the delimiter.

**Wait** — even `__` might not work because the URL itself contains colons and hex addresses. The safest approach is to **pre-process the raw content string** before ReactMarkdown, converting our custom market links into actual HTML `<span>` tags with data attributes, and then use `rehypeRaw` to allow HTML passthrough. But that adds a dependency.

**Most robust approach**: Pre-process the content to extract market links, replace them with simple numbered tokens like `MARKETREF0`, render markdown normally, then post-process. But this is complex with React.

**Actually the simplest**: Don't use markdown links at all. Have the LLM output a custom syntax like `{{market:ID;;PROTO;;ASSET;;APY;;TVL|Label}}` and pre-process the content string to split it into segments (text + market buttons) before passing to ReactMarkdown. Render each segment: text goes through ReactMarkdown, market refs render as `<MarketCard>`.

### Final Plan

1. **`supabase/functions/chat/index.ts`**: Change the market format in the system prompt to use a non-markdown custom syntax:
   ```
   {{market:ID;;PROTO;;ASSET;;APY;;TVL|Label}}
   ```
   This won't be parsed by markdown at all — we handle it ourselves.

2. **`src/components/MessageBubble.tsx`**: 
   - Add a `parseContent(content: string)` function that splits the message into segments: `{ type: 'text', value: string }` and `{ type: 'market', label, id, protocol, asset, apy, tvl }`
   - Render text segments through `ReactMarkdown` and market segments as `<MarketCard>` components directly
   - This completely bypasses the markdown parser for market references

3. **No changes needed** to `MarketCard.tsx` — it already works as a pill button.

This approach is robust because it doesn't depend on the markdown parser accepting unusual URLs.

