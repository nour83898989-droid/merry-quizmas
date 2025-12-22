import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const PUBLIC_DIR = join(__dirname, '../public');

// App Icon SVG - Merry Quizmas Christmas theme
const iconSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#DC2626"/>
      <stop offset="50%" style="stop-color:#B91C1C"/>
      <stop offset="100%" style="stop-color:#16A34A"/>
    </linearGradient>
    <linearGradient id="snowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFFFFF"/>
      <stop offset="100%" style="stop-color:#E5E7EB"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="200" fill="url(#bgGrad)"/>
  <!-- Snow decoration -->
  <ellipse cx="512" cy="900" rx="400" ry="80" fill="url(#snowGrad)" opacity="0.3"/>
  <!-- Christmas tree shape behind -->
  <polygon points="512,150 300,600 724,600" fill="#16A34A" opacity="0.3"/>
  <!-- Question mark -->
  <text x="512" y="580" font-family="Arial, sans-serif" font-size="450" font-weight="bold" fill="white" text-anchor="middle" style="filter: drop-shadow(0 8px 16px rgba(0,0,0,0.3))">?</text>
  <!-- Star on top -->
  <polygon points="512,100 530,160 595,160 545,200 565,265 512,230 459,265 479,200 429,160 494,160" fill="#FCD34D"/>
  <!-- Snow dots -->
  <circle cx="200" cy="200" r="15" fill="white" opacity="0.8"/>
  <circle cx="800" cy="150" r="12" fill="white" opacity="0.7"/>
  <circle cx="150" cy="500" r="10" fill="white" opacity="0.6"/>
  <circle cx="850" cy="400" r="14" fill="white" opacity="0.8"/>
  <circle cx="300" cy="800" r="12" fill="white" opacity="0.7"/>
  <circle cx="750" cy="750" r="10" fill="white" opacity="0.6"/>
</svg>
`;

// Splash Image SVG - Merry Quizmas
const splashSvg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="splashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0F172A"/>
      <stop offset="100%" style="stop-color:#1E293B"/>
    </linearGradient>
    <linearGradient id="redGreen" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#DC2626"/>
      <stop offset="100%" style="stop-color:#16A34A"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#splashGrad)"/>
  <!-- Snow at bottom -->
  <ellipse cx="600" cy="630" rx="700" ry="60" fill="white" opacity="0.1"/>
  <!-- Christmas ornament -->
  <circle cx="600" cy="220" r="100" fill="url(#redGreen)" opacity="0.9"/>
  <rect x="580" y="100" width="40" height="30" rx="5" fill="#FCD34D"/>
  <text x="600" y="250" font-family="Arial, sans-serif" font-size="100" font-weight="bold" fill="white" text-anchor="middle">?</text>
  <!-- Title -->
  <text x="600" y="400" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="white" text-anchor="middle">Merry Quizmas</text>
  <text x="600" y="480" font-family="Arial, sans-serif" font-size="28" fill="#94A3B8" text-anchor="middle">Play Quizzes - Win Crypto Rewards</text>
  <!-- Snowflakes as circles -->
  <circle cx="100" cy="100" r="8" fill="white" opacity="0.5"/>
  <circle cx="1050" cy="150" r="7" fill="white" opacity="0.4"/>
  <circle cx="200" cy="550" r="6" fill="white" opacity="0.3"/>
  <circle cx="1000" cy="500" r="9" fill="white" opacity="0.5"/>
  <circle cx="150" cy="300" r="5" fill="white" opacity="0.4"/>
  <circle cx="1080" cy="350" r="6" fill="white" opacity="0.3"/>
</svg>
`;

// OG Image SVG - Merry Quizmas (1.91:1 ratio for Farcaster)
const ogImageSvg = `
<svg width="1200" height="628" viewBox="0 0 1200 628" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ogGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#DC2626"/>
      <stop offset="50%" style="stop-color:#991B1B"/>
      <stop offset="100%" style="stop-color:#16A34A"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="628" fill="url(#ogGrad)"/>
  <!-- Snow ground -->
  <ellipse cx="600" cy="628" rx="800" ry="100" fill="white" opacity="0.2"/>
  <!-- Christmas tree silhouette -->
  <polygon points="600,50 350,400 850,400" fill="#166534" opacity="0.4"/>
  <polygon points="600,100 400,350 800,350" fill="#16A34A" opacity="0.5"/>
  <!-- Question mark ornament -->
  <circle cx="600" cy="200" r="80" fill="white" opacity="0.95"/>
  <text x="600" y="230" font-family="Arial, sans-serif" font-size="100" font-weight="bold" fill="#DC2626" text-anchor="middle">?</text>
  <!-- Title -->
  <text x="600" y="380" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="white" text-anchor="middle" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3))">Merry Quizmas</text>
  <text x="600" y="450" font-family="Arial, sans-serif" font-size="32" fill="white" opacity="0.9" text-anchor="middle">Play Holiday Quizzes - Win Crypto Rewards</text>
  <!-- Play button -->
  <rect x="450" y="490" width="300" height="60" rx="30" fill="white"/>
  <text x="600" y="532" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#DC2626" text-anchor="middle">Play Now</text>
  <!-- Snowflakes as circles -->
  <circle cx="80" cy="100" r="10" fill="white" opacity="0.6"/>
  <circle cx="1080" cy="120" r="9" fill="white" opacity="0.5"/>
  <circle cx="150" cy="500" r="8" fill="white" opacity="0.4"/>
  <circle cx="1020" cy="480" r="11" fill="white" opacity="0.6"/>
  <circle cx="50" cy="300" r="7" fill="white" opacity="0.5"/>
  <circle cx="1120" cy="320" r="8" fill="white" opacity="0.4"/>
</svg>
`;

// Christmas Banner for Farcaster Frame (1.91:1)
const christmasBannerSvg = `
<svg width="1200" height="628" viewBox="0 0 1200 628" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bannerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#DC2626"/>
      <stop offset="100%" style="stop-color:#16A34A"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="628" fill="url(#bannerGrad)"/>
  <!-- Decorative elements -->
  <circle cx="100" cy="100" r="150" fill="white" opacity="0.1"/>
  <circle cx="1100" cy="528" r="200" fill="white" opacity="0.1"/>
  <!-- Christmas tree -->
  <polygon points="600,80 480,200 720,200" fill="#16A34A"/>
  <polygon points="600,140 450,300 750,300" fill="#15803D"/>
  <polygon points="600,220 400,420 800,420" fill="#166534"/>
  <rect x="570" y="420" width="60" height="50" fill="#92400E"/>
  <!-- Star -->
  <polygon points="600,60 610,90 640,90 615,110 625,140 600,120 575,140 585,110 560,90 590,90" fill="#FCD34D"/>
  <!-- Ornaments -->
  <circle cx="520" cy="280" r="20" fill="#DC2626"/>
  <circle cx="680" cy="320" r="18" fill="#FCD34D"/>
  <circle cx="550" cy="380" r="22" fill="#3B82F6"/>
  <circle cx="650" cy="360" r="16" fill="#DC2626"/>
  <!-- Title -->
  <text x="600" y="520" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="white" text-anchor="middle" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3))">Merry Quizmas!</text>
  <text x="600" y="580" font-family="Arial, sans-serif" font-size="28" fill="white" opacity="0.9" text-anchor="middle">Play Holiday Quizzes - Win Crypto Rewards</text>
  <!-- Snowflakes as circles -->
  <circle cx="80" cy="150" r="8" fill="white" opacity="0.6"/>
  <circle cx="1100" cy="100" r="10" fill="white" opacity="0.5"/>
  <circle cx="150" cy="400" r="6" fill="white" opacity="0.4"/>
  <circle cx="1050" cy="350" r="9" fill="white" opacity="0.6"/>
  <circle cx="200" cy="550" r="7" fill="white" opacity="0.5"/>
  <circle cx="1000" cy="500" r="8" fill="white" opacity="0.4"/>
</svg>
`;

async function generateAssets() {
  console.log('🎄 Generating Merry Quizmas assets...\n');

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
    .resize(200, 200)
    .png()
    .toFile(join(PUBLIC_DIR, 'icon.png'));
  console.log('✓ icon.png (200x200 for Farcaster)');

  // Generate splash image
  await sharp(Buffer.from(splashSvg))
    .resize(1200, 630)
    .png()
    .toFile(join(PUBLIC_DIR, 'splash.png'));
  console.log('✓ splash.png');

  // Generate OG image
  await sharp(Buffer.from(ogImageSvg))
    .resize(1200, 628)
    .png()
    .toFile(join(PUBLIC_DIR, 'og-image.png'));
  console.log('✓ og-image.png');

  // Generate Christmas banner for Farcaster frame
  await sharp(Buffer.from(christmasBannerSvg))
    .resize(1200, 628)
    .png()
    .toFile(join(PUBLIC_DIR, 'christmas-banner.png'));
  console.log('✓ christmas-banner.png');

  console.log('\n🎅 All Merry Quizmas assets generated successfully!');
}

generateAssets().catch(console.error);
