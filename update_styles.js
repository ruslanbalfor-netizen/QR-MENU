const fs = require('fs');
const path = require('path');

const landingPath = path.join(__dirname, 'landing.css');
let landing = fs.readFileSync(landingPath, 'utf8');

// Replace Fonts
landing = landing.replace(/Plus Jakarta Sans/g, 'Roboto');
landing = landing.replace(/Outfit/g, 'Montserrat');

// Background and Text Base
landing = landing.replace(/background: #006ba6;/gi, 'background: #0B0B0B;');
landing = landing.replace(/color: #f9fafb;/gi, 'color: #E5E5E5;');
landing = landing.replace(/color: #f0f0f0;/gi, 'color: #E5E5E5;');

// Specific elements before blanket replacements
landing = landing.replace(/\.bg-alt {\s+max-width: 100%;\s+background: #[0-9a-f]+;/gi, '.bg-alt {\n    max-width: 100%;\n    background: #1F2937;');

// General color replacements (Gradients and icons)
landing = landing.replace(/#006ba6/gi, '#D4AF37');
landing = landing.replace(/#0496ff/gi, '#B89528');

// Translucent rgba colors (Blobs, shadows)
landing = landing.replace(/rgba\(0,\s*107,\s*166/g, 'rgba(212, 175, 55');
landing = landing.replace(/rgba\(4,\s*150,\s*255/g, 'rgba(201, 160, 36');

// Feature Cards Backgrounds to Secondary
landing = landing.replace(/background: #e2e8f0;/gi, 'background: #1F2937;');
landing = landing.replace(/background: #181818;/gi, 'background: #1F2937;');
landing = landing.replace(/color: #1f2937;/gi, 'color: #E5E5E5;');
landing = landing.replace(/color: #333;/gi, 'color: #E5E5E5;');

// Text Gradient Adjustments (Subtitle was white to light gray, leaving as is)
// Title gradient was Gold to White. We keep it as Gold to White using Accent.
landing = landing.replace(/#ffbc42/gi, '#D4AF37'); 

fs.writeFileSync(landingPath, landing);

const stylePath = path.join(__dirname, 'style.css');
let style = fs.readFileSync(stylePath, 'utf8');

// Font replacements
style = style.replace(/Plus Jakarta Sans/g, 'Roboto');
style = style.replace(/Outfit/g, 'Montserrat');

// CSS Variables replacements
style = style.replace(/--primary-color: #[0-9a-fA-F]+;/i, '--primary-color: #D4AF37;');
style = style.replace(/--hover-color: #[0-9a-fA-F]+;/i, '--hover-color: #B89528;');
style = style.replace(/--text-primary: #[0-9a-fA-F]+;/i, '--text-primary: #E5E5E5;');
style = style.replace(/--text-secondary: #[0-9a-fA-F]+;/i, '--text-secondary: #9CA3AF;');
style = style.replace(/--bg-light: #[0-9a-fA-F]+;/i, '--bg-light: #0B0B0B;');
style = style.replace(/--nav-bg: #[0-9a-fA-F]+;/i, '--nav-bg: #1F2937;');
style = style.replace(/--card-bg: #[0-9a-fA-F]+;/i, '--card-bg: #1F2937;');
style = style.replace(/--border-color: #[0-9a-fA-F]+;/i, '--border-color: rgba(229, 229, 229, 0.1);');

// Body explicit background color fix
style = style.replace(/background-color: #f8fafc;/g, 'background-color: var(--bg-light);');
style = style.replace(/background-color: white;/g, 'background-color: var(--bg-light);');
style = style.replace(/color: #0f172a;/g, 'color: var(--text-primary);');

fs.writeFileSync(stylePath, style);

console.log("Formatting complete.");
