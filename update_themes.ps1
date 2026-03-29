$landing = Get-Content -Path 'landing.css' -Raw
$landing = $landing -replace 'Plus Jakarta Sans', 'Roboto'
$landing = $landing -replace 'Outfit', 'Montserrat'

# Background & text
$landing = $landing -replace 'background: #006ba6;', 'background: #0B0B0B;'
$landing = $landing -replace 'color: #f9fafb;', 'color: #E5E5E5;'
$landing = $landing -replace 'color: #f0f0f0;', 'color: #E5E5E5;'

# Specific structural blocks
$landing = $landing -replace 'background: #0496ff;', 'background: #1F2937;'
$landing = $landing -replace 'background: #e2e8f0;', 'background: #1F2937;'
$landing = $landing -replace 'background: #181818;', 'background: #1F2937;'
$landing = $landing -replace 'color: #1f2937;', 'color: #E5E5E5;'
$landing = $landing -replace 'color: #333;', 'color: #E5E5E5;'

# Gradients and icons
$landing = $landing -replace '#006ba6', '#D4AF37'
$landing = $landing -replace '#0496ff', '#B89528'

# Shadows and Blobs (rgba)
$landing = $landing -replace 'rgba\(0, 107, 166', 'rgba(212, 175, 55'
$landing = $landing -replace 'rgba\(4, 150, 255', 'rgba(201, 160, 36'

# Gradient overrides
$landing = $landing -replace '#ffbc42', '#D4AF37'

Set-Content -Path 'landing.css' -Value $landing -Encoding UTF8

$style = Get-Content -Path 'style.css' -Raw
$style = $style -replace 'Plus Jakarta Sans', 'Roboto'
$style = $style -replace 'Outfit', 'Montserrat'

# CSS Variables
$style = $style -replace '--primary-color: #006ba6;', '--primary-color: #D4AF37;'
$style = $style -replace '--hover-color: #0496ff;', '--hover-color: #B89528;'
$style = $style -replace '--text-primary: #212529;', '--text-primary: #E5E5E5;'
$style = $style -replace '--text-secondary: #6c757d;', '--text-secondary: #9CA3AF;'
$style = $style -replace '--bg-light: #f8f9fa;', '--bg-light: #0B0B0B;'
$style = $style -replace '--nav-bg: #ffffff;', '--nav-bg: #1F2937;'
$style = $style -replace '--card-bg: #ffffff;', '--card-bg: #1F2937;'

# Global properties
$style = $style -replace 'background-color: white;', 'background-color: var(--bg-light);'
$style = $style -replace 'background-color: #f8fafc;', 'background-color: var(--bg-light);'
$style = $style -replace 'color: #0f172a;', 'color: var(--text-primary);'

Set-Content -Path 'style.css' -Value $style -Encoding UTF8

Write-Host "Styles updated successfully."
