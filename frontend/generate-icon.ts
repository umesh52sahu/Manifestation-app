import sharp from "sharp"

const svgIcon = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#E6E6FA;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#FFE5D9;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#D4F1F4;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="flower" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#9370DB;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7B5EC6;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1024" height="1024" rx="220" fill="url(#bg)"/>
  
  <!-- Lotus Flower -->
  <!-- Center petal -->
  <ellipse cx="512" cy="420" rx="60" ry="160" fill="url(#flower)" opacity="0.9"/>
  
  <!-- Left petals -->
  <ellipse cx="512" cy="420" rx="55" ry="150" fill="url(#flower)" opacity="0.8" transform="rotate(-30, 512, 520)"/>
  <ellipse cx="512" cy="420" rx="50" ry="140" fill="url(#flower)" opacity="0.7" transform="rotate(-60, 512, 520)"/>
  
  <!-- Right petals -->
  <ellipse cx="512" cy="420" rx="55" ry="150" fill="url(#flower)" opacity="0.8" transform="rotate(30, 512, 520)"/>
  <ellipse cx="512" cy="420" rx="50" ry="140" fill="url(#flower)" opacity="0.7" transform="rotate(60, 512, 520)"/>
  
  <!-- Outer left petals -->
  <ellipse cx="512" cy="430" rx="45" ry="120" fill="#B08FD8" opacity="0.6" transform="rotate(-80, 512, 520)"/>
  
  <!-- Outer right petals -->
  <ellipse cx="512" cy="430" rx="45" ry="120" fill="#B08FD8" opacity="0.6" transform="rotate(80, 512, 520)"/>
  
  <!-- Center circle -->
  <circle cx="512" cy="500" r="30" fill="#FFD700" opacity="0.9"/>
  <circle cx="512" cy="500" r="18" fill="#FFF8DC" opacity="0.8"/>
  
  <!-- Text "Manifest" -->
  <text x="512" y="720" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="88" font-weight="bold" fill="#9370DB" letter-spacing="2">Manifest</text>
  
  <!-- Sparkles -->
  <text x="300" y="300" font-size="40" fill="#FFD700" opacity="0.7">✦</text>
  <text x="720" y="350" font-size="30" fill="#FFD700" opacity="0.5">✦</text>
  <text x="250" y="600" font-size="25" fill="#FFD700" opacity="0.4">✦</text>
  <text x="760" y="580" font-size="35" fill="#FFD700" opacity="0.6">✦</text>
</svg>
`;

async function generateIcons() {
    const svgBuffer = Buffer.from(svgIcon);

    // Generate icon.png (1024x1024)
    await sharp(svgBuffer)
        .resize(1024, 1024)
        .png()
        .toFile('assets/images/icon.png');

    // Generate adaptive-icon.png (1024x1024)
    await sharp(svgBuffer)
        .resize(1024, 1024)
        .png()
        .toFile('assets/images/adaptive-icon.png');

    // Generate favicon.png (48x48)
    await sharp(svgBuffer)
        .resize(48, 48)
        .png()
        .toFile('assets/images/favicon.png');

    // Generate splash-icon.png (512x512)
    await sharp(svgBuffer)
        .resize(512, 512)
        .png()
        .toFile('assets/images/splash-icon.png');

    console.log('✅ All icons generated successfully!');
}

generateIcons().catch(console.error);