import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const PUBLIC_DIR = join(__dirname, '../public');

// App Icon SVG - Quiz theme with question mark
const iconSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366F1"/>
      <stop offset="100%" style="stop-color:#8B5CF6"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="200" fill="url(#bgGrad)"/>
  <circle cx="512" cy="420" r="280" fill="white" opacity="0.15"/>
  <text x="512" y="580" font-family="Arial, sans-serif" font-size="500" font-weight="bold" fill="white" text-anchor="middle">?</text>
  <circle cx="512" cy="780" r="50" fill="white"/>
</svg>
`;

// Splash Image SVG
const splashSvg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="splashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0d0d0d"/>
      <stop offset="100%" style="stop-color:#1a1a1a"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#splashGrad)"/>
  <circle cx="600" cy="250" r="120" fill="#6366F1" opacity="0.3"/>
  <text x="600" y="290" font-family="Arial, sans-serif" font-size="150" font-weight="bold" fill="white" text-anchor="middle">?</text>
  <text x="600" y="450" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="white" text-anchor="middle">Quiz App</text>
  <text x="600" y="520" font-family="Arial, sans-serif" font-size="32" fill="#a0a0a0" text-anchor="middle">Play and Win Rewards</text>
</svg>
`;

// OG Image SVG (3:2 ratio for Farcaster)
const ogImageSvg = `
<svg width="1200" height="800" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ogGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366F1"/>
      <stop offset="100%" style="stop-color:#8B5CF6"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#ogGrad)"/>
  <circle cx="600" cy="300" r="150" fill="white" opacity="0.2"/>
  <text x="600" y="360" font-family="Arial, sans-serif" font-size="200" font-weight="bold" fill="white" text-anchor="middle">?</text>
  <text x="600" y="550" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="white" text-anchor="middle">Quiz App</text>
  <text x="600" y="640" font-family="Arial, sans-serif" font-size="36" fill="white" opacity="0.8" text-anchor="middle">Create quizzes • Compete • Win crypto rewards</text>
  <rect x="450" y="700" width="300" height="60" rx="30" fill="white"/>
  <text x="600" y="742" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#6366F1" text-anchor="middle">Play Now</text>
</svg>
`;

async function generateAssets() {
  console.log('Generating assets...');

  // Ensure public directory exists
  if (!existsSync(PUBLIC_DIR)) {
    mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  // Generate icon at multiple sizes
  const iconBuffer = Buffer.from(iconSvg);
  
  await sharp(iconBuffer)
    .resize(1024, 1024)
    .png()
    .toFile(join(PUBLIC_DIR, 'icon-1024.png'));
  console.log('✓ icon-1024.png');

  await sharp(iconBuffer)
    .resize(512, 512)
    .png()
    .toFile(join(PUBLIC_DIR, 'icon-512.png'));
  console.log('✓ icon-512.png');

  await sharp(iconBuffer)
    .resize(192, 192)
    .png()
    .toFile(join(PUBLIC_DIR, 'icon-192.png'));
  console.log('✓ icon-192.png');

  await sharp(iconBuffer)
    .resize(180, 180)
    .png()
    .toFile(join(PUBLIC_DIR, 'apple-icon.png'));
  console.log('✓ apple-icon.png');

  await sharp(iconBuffer)
    .resize(32, 32)
    .png()
    .toFile(join(PUBLIC_DIR, 'icon.png'));
  console.log('✓ icon.png');

  // Generate splash image
  await sharp(Buffer.from(splashSvg))
    .resize(1200, 630)
    .png()
    .toFile(join(PUBLIC_DIR, 'splash.png'));
  console.log('✓ splash.png');

  // Generate OG image
  await sharp(Buffer.from(ogImageSvg))
    .resize(1200, 800)
    .png()
    .toFile(join(PUBLIC_DIR, 'og-image.png'));
  console.log('✓ og-image.png');

  console.log('\nAll assets generated successfully!');
}

generateAssets().catch(console.error);
