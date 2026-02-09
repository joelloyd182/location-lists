# Location Lists

A location-aware shopping list PWA that automatically shows your lists when you arrive at stores.

## Features

- 📍 **Auto-detection**: Lists appear when you're near a store (customizable radius)
- 📱 **Mobile-first**: Optimized for phone use while shopping
- 💾 **Offline-ready**: All data stored locally, works without internet
- 🔄 **Real-time tracking**: Updates your position continuously
- 📦 **Easy management**: Add/edit stores and items on the fly

## Quick Start

### Testing Locally

1. Open `index.html` in a web browser
2. Allow location access when prompted
3. Add your first store (like Woolworths Motueka!)

### Deploy to Cloudflare Pages

1. **Create a Git Repository**
   ```bash
   cd location-lists
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Push to GitHub**
   ```bash
   # Create a new repo on GitHub, then:
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

3. **Deploy on Cloudflare Pages**
   - Go to Cloudflare Dashboard > Pages
   - Click "Create a project"
   - Connect your GitHub repository
   - Build settings:
     - Build command: (leave empty)
     - Build output directory: `/`
   - Click "Save and Deploy"

4. **Enable HTTPS** (required for geolocation)
   - Cloudflare automatically provides HTTPS
   - Your app will be at `https://your-project.pages.dev`

## Usage

### Adding a Store

1. Click "+ Add Store" on the home screen
2. Enter store name (e.g., "Woolworths Motueka")
3. Add address (optional)
4. Click "Use Current Location" to set the store's location
5. Set trigger distance (default 150m works well)
6. Save!

### Managing Lists

1. Tap any store card to open its list
2. Add items using the input field
3. Check off items as you shop
4. Delete items by tapping the × button

### Auto-Trigger

- When you arrive within the trigger radius, the list automatically appears
- Distance to store shows at the top
- When you leave, it returns to overview

## Settings

- **Location Check Interval**: How often to check your position
  - 5 seconds: Most responsive, uses more battery
  - 10 seconds: Recommended balance
  - 30-60 seconds: Battery saving mode

- **Export/Import**: Backup your data or transfer to another device

## Technical Notes

### Location Accuracy

- Uses GPS for precise positioning
- Accuracy varies (typically 5-50m outdoors)
- May be less accurate indoors or in urban canyons
- Current accuracy shown in header

### Privacy

- All data stored locally in browser storage
- No data sent to servers
- Location only used for distance calculations
- Can be used completely offline

### Browser Compatibility

- Works on all modern mobile browsers
- Requires HTTPS for location access
- Install as PWA for best experience

## Tips

- **Set realistic trigger distances**: 150-200m works well for most stores
- **Use "current location"** when actually at the store for accuracy
- **Keep app open** while shopping for real-time list updates
- **Export regularly** to backup your data

## Troubleshooting

**Location not working?**
- Ensure location permissions are granted
- Check that you're using HTTPS (required for geolocation)
- Try refreshing the page

**List not auto-appearing?**
- Check the trigger radius is appropriate
- Verify you're actually within range
- Look at accuracy indicator - high accuracy needed

**Battery draining?**
- Increase location check interval in settings
- Close app when not actively shopping

## Customization Ideas

- Add categories to items
- Set recurring lists
- Share lists with others
- Add photos to stores
- Multiple lists per store

## Files

- `index.html` - Main app structure
- `app.js` - Application logic
- `styles.css` - Styling
- `manifest.json` - PWA configuration
- `icon-*.png` - App icons

---

Built for efficient shopping trips! 🛒
