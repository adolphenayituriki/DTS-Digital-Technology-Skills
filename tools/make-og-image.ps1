# Generates the 1200x630 social-share image from activity-1.jpg.
#   powershell -File tools\make-og-image.ps1
# The source photo and Logo.png are never modified.
param(
  [string]$Source = "client\public\activity-1.jpg",
  [string]$Logo   = "client\public\Logo.png",
  [string]$Out    = "client\public\og-dts-team-activity.jpg"
)

Add-Type -AssemblyName System.Drawing

$W = 1200
$H = 630

function New-Brush([string]$hex, [int]$alpha) {
  $c = [System.Drawing.ColorTranslator]::FromHtml($hex)
  return New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($alpha, $c))
}

# ---------------------------------------------------------------- background
$src = [System.Drawing.Image]::FromFile((Resolve-Path $Source).Path)
$bmp = New-Object System.Drawing.Bitmap $W, $H
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# cover-fit: scale so the image fills 1200x630, then centre-crop the overflow
$scale = [Math]::Max($W / $src.Width, $H / $src.Height)
$dw = [int]([Math]::Ceiling($src.Width * $scale))
$dh = [int]([Math]::Ceiling($src.Height * $scale))
$g.DrawImage($src, [int](($W - $dw) / 2), [int](($H - $dh) / 2), $dw, $dh)
$src.Dispose()

# ------------------------------------------------------------------ overlays
# vertical darkening so the lower text block stays readable
$grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Point 0, 0),
  (New-Object System.Drawing.Point 0, $H),
  [System.Drawing.Color]::FromArgb(20, 20, 40, 81),
  [System.Drawing.Color]::FromArgb(235, 8, 16, 34)
)
$g.FillRectangle($grad, 0, 0, $W, $H)
$grad.Dispose()

# extra wash on the left where the copy sits
$side = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Point 0, 0),
  (New-Object System.Drawing.Point 780, 0),
  [System.Drawing.Color]::FromArgb(120, 8, 16, 34),
  [System.Drawing.Color]::FromArgb(0, 8, 16, 34)
)
$g.FillRectangle($side, 0, 0, 900, $H)
$side.Dispose()

# --------------------------------------------------------------------- logo
# Logo.png is a 500x500 opaque white canvas with the mark inset, so it is
# cropped to the mark first, then placed on a white rounded chip. Compositing
# the raw square over a dark photo would show a white box.
$logoSrc = [System.Drawing.Bitmap]::FromFile((Resolve-Path $Logo).Path)
$minX = $logoSrc.Width; $maxX = -1; $minY = $logoSrc.Height; $maxY = -1
for ($y = 0; $y -lt $logoSrc.Height; $y += 1) {
  for ($x = 0; $x -lt $logoSrc.Width; $x += 1) {
    $c = $logoSrc.GetPixel($x, $y)
    if (-not ($c.R -gt 245 -and $c.G -gt 245 -and $c.B -gt 245)) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}
if ($maxX -lt $minX) { $minX = 0; $maxX = $logoSrc.Width - 1; $minY = 0; $maxY = $logoSrc.Height - 1 }

$mark = New-Object System.Drawing.Bitmap ($maxX - $minX + 1), ($maxY - $minY + 1)
$mg = [System.Drawing.Graphics]::FromImage($mark)
$mg.DrawImage($logoSrc,
  (New-Object System.Drawing.Rectangle 0, 0, $mark.Width, $mark.Height),
  (New-Object System.Drawing.Rectangle $minX, $minY, $mark.Width, $mark.Height),
  [System.Drawing.GraphicsUnit]::Pixel)
$mg.Dispose()
$logoSrc.Dispose()

$chipX = 64; $chipY = 56; $chipSize = 104; $chipR = 22
$chip = New-Object System.Drawing.Drawing2D.GraphicsPath
$chip.AddArc($chipX, $chipY, $chipR * 2, $chipR * 2, 180, 90)
$chip.AddArc($chipX + $chipSize - $chipR * 2, $chipY, $chipR * 2, $chipR * 2, 270, 90)
$chip.AddArc($chipX + $chipSize - $chipR * 2, $chipY + $chipSize - $chipR * 2, $chipR * 2, $chipR * 2, 0, 90)
$chip.AddArc($chipX, $chipY + $chipSize - $chipR * 2, $chipR * 2, $chipR * 2, 90, 90)
$chip.CloseFigure()
$g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)), $chip)
$chip.Dispose()

$pad = 20
$innerH = $chipSize - $pad * 2
$ms = [Math]::Min($innerH / $mark.Height, ($chipSize - $pad * 2) / $mark.Width)
$mw = [int]($mark.Width * $ms)
$mh = [int]($mark.Height * $ms)
$g.DrawImage($mark,
  [int]($chipX + ($chipSize - $mw) / 2),
  [int]($chipY + ($chipSize - $mh) / 2),
  $mw, $mh)
$mark.Dispose()

# --------------------------------------------------------------------- copy
$align = [System.Drawing.StringFormat]::GenericTypographic
$align.Alignment = [System.Drawing.StringAlignment]::Near
$align.LineAlignment = [System.Drawing.StringAlignment]::Near

$black = New-Object System.Drawing.Font "Segoe UI Black", 74, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$white = [System.Drawing.Brushes]::White
$g.DrawString("DTS Rwanda", $black, $white, (New-Object System.Drawing.PointF 64, 372), $align)
$black.Dispose()

$barBrush = New-Brush "#23A8DE" 255
$bar = New-Object System.Drawing.Drawing2D.GraphicsPath
$bar.AddArc(64, 470, 16, 16, 180, 90)
$bar.AddArc(64 + 96 - 16, 470, 16, 16, 270, 90)
$bar.AddArc(64 + 96 - 16, 470 + 8 - 16, 16, 16, 0, 90)
$bar.AddArc(64, 470 + 8 - 16, 16, 16, 90, 90)
$bar.CloseFigure()
$g.FillPath($barBrush, $bar)
$bar.Dispose()

$reg = New-Object System.Drawing.Font "Segoe UI Semibold", 30, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$regBrush = New-Brush "#8FD4F0" 255
$g.DrawString("Digital Technology Skills", $reg, $regBrush, (New-Object System.Drawing.PointF 64, 502), $align)
$reg.Dispose()

$small = New-Object System.Drawing.Font "Segoe UI", 26, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$smallBrush = New-Brush "#C3D2E2" 235
$g.DrawString("Training and digital literacy at UR-Huye Campus", $small, $smallBrush, (New-Object System.Drawing.PointF 64, 548), $align)
$small.Dispose()

# --------------------------------------------------------------------- save
$g.Dispose()
$bmp.Save((Join-Path (Get-Location) $Out), [System.Drawing.Imaging.ImageFormat]::Jpeg)
$bmp.Dispose()
Write-Output "wrote $Out ($($W)x$($H))"
