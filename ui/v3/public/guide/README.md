# Flower Server Guide

This folder contains the images and descriptions for the Flower Server guide popup.

## How to Modify the Guide

### 1. Images

Place your guide images in the `/public/guide/images/` folder. The guide expects 7 images named:
- `image1.png`
- `image2.png`
- `image3.png`
- `image4.png`
- `image5.png`
- `image6.png`
- `image7.png`

For best results, use images with dimensions of approximately 600x300px.

### 2. Descriptions

To modify the descriptions and titles for each image:

1. Open the file: `/components/flower-server-info.tsx`
2. Locate the `guideSteps` array at the top of the file
3. Edit the `title` and `description` properties for each step

Example:
```javascript
const guideSteps = [
 {
   title: "Use Case Explanation",
   description: "Your custom description for image 1 goes here.",
   image: "/guide/images/image1.png",
 },
 // ... more steps
]
