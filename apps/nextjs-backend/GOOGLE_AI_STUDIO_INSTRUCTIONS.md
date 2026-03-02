# Instructions for Google AI Studio Agent

## Task: Add Image URL to PostMessage in Vision Lab App

You need to modify the Vision Lab app (hosted at `https://fitcopilot-677566904576.us-west1.run.app/`) to send the generated image URL via postMessage to the parent window.

### Context

The Vision Lab app is embedded in an iframe on the parent site (`workout-generator-web`). When an image is generated, the app currently sends a `VISION_ANALYSIS_COMPLETED` postMessage event, but it doesn't include the image URL. We need to add the image URL to this message.

### Current PostMessage Format

The app currently sends messages like this:

```javascript
// When generation starts
window.parent.postMessage(
  {
    type: 'VISION_ANALYSIS_STARTED',
    prompt: 'push up',
  },
  '*'
)

// When generation completes
window.parent.postMessage(
  {
    type: 'VISION_ANALYSIS_COMPLETED',
    prompt: 'push up',
    framework: 'strength',
    level: 'beginner',
  },
  '*'
)
```

### Required Changes

1. **Find where the image is generated/stored** in your Vision Lab app code
   - This could be in a state variable, a ref, or stored in a service
   - The image might be:
     - A blob URL (e.g., `blob:https://...`)
     - A data URL (e.g., `data:image/png;base64,...`)
     - A URL to a hosted image (e.g., `https://storage.googleapis.com/...`)
     - A temporary URL from an image generation API

2. **Capture the image URL** when the image is successfully generated
   - Store it in a variable accessible when sending the postMessage
   - Ensure it's a publicly accessible URL (not a local blob that will expire)

3. **Update the `VISION_ANALYSIS_COMPLETED` postMessage** to include the image URL:

```javascript
window.parent.postMessage(
  {
    type: 'VISION_ANALYSIS_COMPLETED',
    prompt: 'push up',
    framework: 'strength',
    level: 'beginner',
    image_url: imageUrl, // ADD THIS FIELD
  },
  '*'
)
```

### Important Notes

- **Field name**: Use `image_url` (snake_case) to match the backend API
- **URL format**: The image URL should be:
  - A publicly accessible URL (not a blob URL that expires)
  - A full URL (e.g., `https://example.com/image.png`)
  - Valid and accessible from the parent window's domain
- **Optional field**: If the image URL is not available, you can send `null` or omit the field
- **Origin security**: The parent window validates the origin, so ensure you're sending from the correct origin (`https://fitcopilot-677566904576.us-west1.run.app`)

### Example Implementation

Here's a pseudocode example of what the change might look like:

```javascript
// When image generation completes
async function handleImageGenerationComplete(imageData) {
  // Get the image URL (this depends on how your app stores images)
  const imageUrl = imageData.url || imageData.imageUrl || (await uploadImageToStorage(imageData))

  // Send postMessage with image URL
  window.parent.postMessage(
    {
      type: 'VISION_ANALYSIS_COMPLETED',
      prompt: currentPrompt,
      framework: selectedFramework,
      level: selectedLevel,
      image_url: imageUrl, // Add this line
    },
    '*'
  )
}
```

### Testing

After making the change:

1. Test that the image URL is included in the postMessage
2. Verify the URL is accessible from the parent domain
3. Check browser console for any postMessage errors
4. Test the full flow: generate image → complete micro-interview → verify image_url is saved in database

### Files to Modify

Look for files that:

- Handle image generation completion
- Send postMessage events
- Store/manage generated images
- Contain the `VISION_ANALYSIS_COMPLETED` message type

Common locations:

- React component that handles image generation
- Service/utility file that manages postMessage communication
- State management (Redux, Context, etc.) that tracks image data
- API response handlers for image generation

### Questions to Answer

1. Where is the generated image stored/accessed in your codebase?
2. What format is the image in (blob, data URL, hosted URL)?
3. Is the image URL already available when `VISION_ANALYSIS_COMPLETED` is sent?
4. Do you need to upload the image to a storage service first to get a permanent URL?

Once you identify where the image URL is available, add it to the postMessage payload as `image_url`.
