import { getMonsters } from "./LocalStorage";

// Parse URL parameters and import data on page load
const sanitizeObject = (obj: any): any => {
  return JSON.parse(JSON.stringify(obj))
}
  
  const MONSTERS_KEY = "storedMonsters";
  
// Generate a shareable URL for monsters only
const generateMonsterShareURL = () => {
  const monsters = getMonsters()
  
  const baseURL = window.location.origin + window.location.pathname
  const params = new URLSearchParams()
  
  if (monsters && monsters.length > 0) {
    params.append('monsters', encodeURIComponent(JSON.stringify(monsters)))
  } else {
    alert('No monsters to share!')
    return
  }
  
  const shareableURL = `${baseURL}?${params.toString()}`
  
  // Copy to clipboard
  navigator.clipboard.writeText(shareableURL)
    .then(() => alert('Monster share link copied to clipboard!'))
    .catch(() => alert('Failed to copy URL'))
  
  return shareableURL
}

// Load monsters from URL parameters on page load
const loadMonstersFromURL = () => {
  const urlParams = new URLSearchParams(window.location.search)
  const monstersParam = urlParams.get('monsters')
  
  // If no monster param, return early
  if (!monstersParam) {
    return
  }
  
  try {
    const decodedMonsters = decodeURIComponent(monstersParam)
    const monsters = JSON.parse(decodedMonsters)
    
    if (!Array.isArray(monsters)) {
      alert('Invalid monster data in URL')
      return
    }
    
    // Sanitize the monsters
    const sanitizedMonsters = monsters.map(sanitizeObject)
    
    // Get existing monsters and merge with imported ones
    const existingMonsters = getMonsters() ?? []
    const mergedMonsters = [...existingMonsters, ...sanitizedMonsters]
    
    // Optional: Check for length limits
    if (mergedMonsters.length > 1000) {
      alert('Too many monsters! Limit is 1000.')
      return
    }
    
    // Save merged monsters (you'll need to know your MONSTERS_KEY)
    localStorage.setItem(MONSTERS_KEY, JSON.stringify(mergedMonsters))
    
    // Clean up URL (remove parameters after loading)
    window.history.replaceState({}, document.title, window.location.pathname)
    
    alert(`${sanitizedMonsters.length} monster(s) imported successfully!`)
    
    // Reload to apply the imported monsters
    window.location.reload()
    
  } catch (error) {
    console.error('Error loading monsters from URL:', error)
    alert('Invalid monster data in URL')
    
    // Clean up URL even on error
    window.history.replaceState({}, document.title, window.location.pathname)
  }
}




export default {loadMonstersFromURL, generateMonsterShareURL}