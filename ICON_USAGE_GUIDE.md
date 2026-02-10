# Icon Component - Complete Usage Guide

## 📚 Table of Contents
1. [Basic Usage](#basic-usage)
2. [Props & Options](#props--options)
3. [Color Examples](#color-examples)
4. [Adding New Icons](#adding-new-icons)
5. [Available Icons](#available-icons)
6. [Advanced Usage](#advanced-usage)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Basic Usage

### Import the Component
```tsx
import Icon from './components/Icon';
```

### Simple Icon
```tsx
<Icon name="heart" />
```

### With Size
```tsx
<Icon name="heart" size={16} />
<Icon name="heart" size={24} />
<Icon name="heart" size={32} />
```

### With Color
```tsx
<Icon name="heart" color="#dc3545" />  // Red
<Icon name="heart" color="#000000" />  // Black
<Icon name="heart" color="#28a745" />  // Green
```

### All Together
```tsx
<Icon name="heart" size={20} color="#dc3545" />
```

---

## 📋 Props & Options

### IconProps Interface

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | *required* | Name of the icon (e.g., "heart", "action") |
| `size` | `number` | `24` | Size in pixels |
| `color` | `string` | `#000000` | Hex color code |
| `className` | `string` | `""` | Additional CSS classes |
| `onClick` | `() => void` | `undefined` | Click handler function |
| `title` | `string` | `undefined` | Tooltip text / accessibility label |

### Examples

```tsx
// Minimal
<Icon name="heart" />

// With all props
<Icon 
  name="heart" 
  size={20}
  color="#dc3545"
  className="my-icon"
  onClick={() => console.log('clicked!')}
  title="Hit Points"
/>
```

---

## 🎨 Color Examples

### Solid Colors
```tsx
<Icon name="heart" color="#dc3545" />  // Bootstrap Red
<Icon name="heart" color="#28a745" />  // Bootstrap Green
<Icon name="heart" color="#ffc107" />  // Bootstrap Yellow/Gold
<Icon name="heart" color="#007bff" />  // Bootstrap Blue
<Icon name="heart" color="#6c757d" />  // Bootstrap Gray
<Icon name="heart" color="#000000" />  // Black
<Icon name="heart" color="#ffffff" />  // White
```

### Recommended Color Palette

```tsx
// HP & Stats
<Icon name="heart" color="#dc3545" />      // Red - Current HP
<Icon name="shield" color="#6c757d" />     // Gray - Temp HP
<Icon name="dice" color="#007bff" />       // Blue - Initiative

// Action Economy
<Icon name="action" color="#8b4513" />     // Brown - Action
<Icon name="bonus" color="#ffc107" />      // Gold - Bonus Action
<Icon name="movement" color="#007bff" />   // Blue - Movement
<Icon name="reaction" color="#28a745" />   // Green - Reaction

// UI Elements
<Icon name="gear" color="#6c757d" />       // Gray - Settings
```

### Dynamic Colors Based on State

```tsx
// Red heart when HP is low, green when full
<Icon 
  name="heart" 
  color={currHp < maxHp * 0.3 ? "#dc3545" : "#28a745"} 
/>

// Gray when used, colored when available
<Icon 
  name="action" 
  color={actionUsed ? "#cccccc" : "#8b4513"} 
/>
```

---

## ➕ Adding New Icons

### Step 1: Get the SVG Path Data

You need the SVG `<path>` element's `d` attribute from your SVG file.

**Example SVG file:**
```xml
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="#000"/>
</svg>
```

**Copy the `d` attribute:**
```
M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z
```

### Step 2: Add to Icon Component

Open `src/components/Icon.tsx` and find the `iconPaths` object:

```tsx
const iconPaths: Record<string, string> = {
  heart: "M12 21.35l-1.45-1.32...",
  action: "M6.92 5L5 6.92l6.5...",
  // Add your new icon here:
  home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
};
```

### Step 3: Use Your New Icon

```tsx
<Icon name="home" size={24} color="#007bff" />
```

### Complete Example - Adding a "Sword" Icon

**1. Find or create your sword SVG**

**2. Extract the path data:**
```xml
<!-- sword.svg -->
<svg viewBox="0 0 24 24">
  <path d="M6.92 5L5 6.92l6.5 6.5-1.27 1.27c-.5.5-.54 1.3-.11 1.86l.15.16L8 18.94a.996.996 0 101.41 1.41l2.23-2.23.16.15c.56.43 1.36.39 1.86-.11L15 16.85 21.07 23l2-2L17 14.93l1.28-1.28c.5-.5.54-1.3.11-1.86l-.15-.16L21.07 9 19 6.93l-2.23 2.23-.16-.15c-.56-.43-1.36-.39-1.86.11L13.5 10.5 7 4.07 5.07 2 2 5.07l2.92 2.92z"/>
</svg>
```

**3. Add to Icon.tsx:**
```tsx
const iconPaths: Record<string, string> = {
  heart: "M12 21.35l-1.45-1.32C5.4 15.36...",
  sword: "M6.92 5L5 6.92l6.5 6.5-1.27 1.27c-.5.5-.54 1.3-.11 1.86l.15.16L8 18.94a.996.996 0 101.41 1.41l2.23-2.23.16.15c.56.43 1.36.39 1.86-.11L15 16.85 21.07 23l2-2L17 14.93l1.28-1.28c.5-.5.54-1.3.11-1.86l-.15-.16L21.07 9 19 6.93l-2.23 2.23-.16-.15c-.56-.43-1.36-.39-1.86.11L13.5 10.5 7 4.07 5.07 2 2 5.07l2.92 2.92z",
  // ... other icons
};
```

**4. Use it:**
```tsx
<Icon name="sword" size={20} color="#8b4513" />
```

---

## 📦 Available Icons

Current built-in icons:

| Icon Name | Description | Recommended Color |
|-----------|-------------|-------------------|
| `heart` | Heart shape | `#dc3545` (red) |
| `action` | Sword | `#8b4513` (brown) |
| `bonus` | Lightning bolt | `#ffc107` (gold) |
| `movement` | Boot/footprint | `#007bff` (blue) |
| `reaction` | Shield | `#28a745` (green) |
| `shield` | Shield (same as reaction) | `#6c757d` (gray) |
| `dice` | D20 dice | `#007bff` (blue) |
| `gear` | Settings gear | `#6c757d` (gray) |

---

## 🎯 Real-World Usage Examples

### Example 1: HP Display in Battle Tracker

```tsx
<td>
  <Icon name="heart" size={16} color="#dc3545" />
  {" "}
  <input
    type="number"
    value={currHp}
    onChange={(e) => updateHP(e.target.value)}
  />{" "}
  / {maxHp}
  
  {/* Show temp HP with shield icon */}
  {tempHp > 0 && (
    <>
      {" +"}
      <Icon name="shield" size={16} color="#6c757d" />
      {" "}
      {tempHp}
    </>
  )}
</td>
```

### Example 2: Action Economy Display

```tsx
<div className="action-economy">
  {/* Action */}
  <div onClick={() => toggleAction()}>
    <Icon 
      name="action" 
      size={20} 
      color={actionUsed ? "#cccccc" : "#8b4513"} 
      title="Action (A)"
    />
    <span>A</span>
  </div>
  
  {/* Bonus Action */}
  <div onClick={() => toggleBonus()}>
    <Icon 
      name="bonus" 
      size={20} 
      color={bonusUsed ? "#cccccc" : "#ffc107"} 
      title="Bonus Action (S)"
    />
    <span>B</span>
  </div>
  
  {/* Movement */}
  <div onClick={() => toggleMovement()}>
    <Icon 
      name="movement" 
      size={20} 
      color={movementUsed ? "#cccccc" : "#007bff"} 
      title="Movement (D)"
    />
    <span>M</span>
  </div>
  
  {/* Reaction */}
  <div onClick={() => toggleReaction()}>
    <Icon 
      name="reaction" 
      size={20} 
      color={reactionUsed ? "#cccccc" : "#28a745"} 
      title="Reaction"
    />
    <span>R</span>
  </div>
</div>
```

### Example 3: Navigation/Settings Button

```tsx
<button onClick={openSettings}>
  <Icon name="gear" size={20} color="#6c757d" />
  {" "}
  Settings
</button>
```

### Example 4: Initiative Tracker

```tsx
<div className="initiative">
  <Icon name="dice" size={24} color="#007bff" />
  {" "}
  Initiative: {initiative}
</div>
```

### Example 5: Clickable Icon

```tsx
<Icon 
  name="heart" 
  size={24} 
  color="#dc3545"
  onClick={() => alert('Heart clicked!')}
  title="Click me!"
  className="clickable-icon"
/>
```

---

## 🔧 Advanced Usage

### Custom Styling with className

```tsx
<Icon 
  name="heart" 
  size={20} 
  color="#dc3545"
  className="pulse-animation"
/>
```

**CSS:**
```css
.pulse-animation {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
```

### Conditional Rendering

```tsx
{hasHP && <Icon name="heart" size={16} color="#dc3545" />}

{status === 'alive' ? (
  <Icon name="heart" color="#28a745" />
) : (
  <Icon name="heart" color="#dc3545" />
)}
```

### With TypeScript

```tsx
type IconName = 'heart' | 'action' | 'bonus' | 'movement' | 'reaction' | 'shield' | 'dice' | 'gear';

const MyComponent = () => {
  const iconName: IconName = 'heart';
  return <Icon name={iconName} />;
};
```

### Mapping Over Icons

```tsx
const actions = [
  { name: 'action', used: false, color: '#8b4513' },
  { name: 'bonus', used: true, color: '#ffc107' },
  { name: 'movement', used: false, color: '#007bff' },
];

return (
  <div>
    {actions.map(action => (
      <Icon 
        key={action.name}
        name={action.name}
        size={20}
        color={action.used ? '#cccccc' : action.color}
      />
    ))}
  </div>
);
```

---

## 🐛 Troubleshooting

### Icon Not Showing

**Problem:** Icon doesn't appear

**Solutions:**
1. Check that you imported the component:
   ```tsx
   import Icon from './components/Icon';
   ```

2. Verify the icon name exists in `iconPaths`

3. Check browser console for warnings

4. Make sure `size` is greater than 0

### Wrong Icon Appears

**Problem:** Different icon shows than expected

**Solution:** Check spelling of icon `name` - it's case-sensitive
```tsx
<Icon name="heart" />  // ✅ Correct
<Icon name="Heart" />  // ❌ Wrong - won't find it
```

### Icon Not Clickable

**Problem:** `onClick` not working

**Solution:** Make sure you passed the function correctly
```tsx
<Icon name="heart" onClick={handleClick} />           // ✅ Correct
<Icon name="heart" onClick={() => handleClick()} />   // ✅ Also correct
<Icon name="heart" onClick={handleClick()} />         // ❌ Wrong - executes immediately
```

### Color Not Changing

**Problem:** Icon stays black despite setting color

**Solution:** 
1. Check that you're passing a valid hex color:
   ```tsx
   <Icon name="heart" color="#dc3545" />  // ✅ Correct
   <Icon name="heart" color="red" />      // ❌ Won't work - use hex
   ```

2. Make sure there's no CSS overriding the fill:
   ```css
   /* Remove this if it exists */
   svg path {
     fill: black !important;  /* This will override your color */
   }
   ```

### Icon Missing After Adding New One

**Problem:** New icon doesn't show up

**Solution:**
1. Make sure you added it to the `iconPaths` object
2. Rebuild your app: `npm run build`
3. Hard refresh browser: `Ctrl+Shift+R`

---

## 📝 Quick Reference

### Copy-Paste Template

```tsx
import Icon from './components/Icon';

// Basic usage
<Icon name="heart" />

// Full props
<Icon 
  name="heart"
  size={24}
  color="#dc3545"
  className="my-class"
  onClick={() => console.log('clicked')}
  title="Heart Icon"
/>
```

### Adding a New Icon Template

```tsx
// 1. Find your SVG path (the 'd' attribute)
// 2. Add to Icon.tsx:

const iconPaths: Record<string, string> = {
  // ... existing icons
  myNewIcon: "M10 20v-6h4v6...",  // Paste your path data here
};

// 3. Use it:
<Icon name="myNewIcon" size={24} color="#007bff" />
```

---

## 🎨 Recommended Color Codes

```tsx
// Red tones
#dc3545  // Bootstrap danger red
#ff0000  // Pure red
#880808  // Dark red

// Green tones
#28a745  // Bootstrap success green
#00ff00  // Pure green
#0d6832  // Dark green

// Blue tones
#007bff  // Bootstrap primary blue
#0000ff  // Pure blue
#004085  // Dark blue

// Yellow/Gold tones
#ffc107  // Bootstrap warning gold
#ffff00  // Pure yellow
#856404  // Dark gold/brown

// Gray tones
#6c757d  // Bootstrap gray
#cccccc  // Light gray
#343a40  // Dark gray

// Brown tones
#8b4513  // Saddle brown
#a0522d  // Sienna
#654321  // Dark brown

// Black & White
#000000  // Black
#ffffff  // White
```

---

## ✅ Best Practices

1. **Use semantic names:** `name="heart"` not `name="icon1"`

2. **Consistent sizing:** Pick standard sizes (16, 20, 24, 32) and stick to them

3. **Meaningful colors:** Use colors that make sense (red for damage, green for healing)

4. **Accessibility:** Always provide `title` for screen readers on clickable icons

5. **Performance:** Icons render instantly - no external file loading needed!

6. **Reusability:** Create constants for commonly used icon configurations:
   ```tsx
   const HPIcon = <Icon name="heart" size={16} color="#dc3545" />;
   ```

---

## 🎉 Summary

**Three steps to use icons:**
1. Import: `import Icon from './components/Icon';`
2. Use: `<Icon name="heart" size={24} color="#dc3545" />`
3. Done! ❤️

**To add new icons:**
1. Get SVG path data
2. Add to `iconPaths` in Icon.tsx
3. Use with `<Icon name="yourIcon" />`

**Works everywhere:**
- ✅ Tables
- ✅ Buttons
- ✅ Divs
- ✅ Anywhere in your app!

---

**Happy icon-ing! 🎨**
