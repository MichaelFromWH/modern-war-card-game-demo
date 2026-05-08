param(
  [int]$Width = 1024,
  [int]$Height = 1536,
  [string]$SourceDir = (Join-Path $PSScriptRoot "..\assets\card-art"),
  [string]$OutputDir = (Join-Path $PSScriptRoot "..\assets\card-art-v2")
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function Get-JpegCodec {
  [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq "image/jpeg" } |
    Select-Object -First 1
}

function Save-Jpeg {
  param(
    [System.Drawing.Bitmap]$Image,
    [string]$Path,
    [long]$Quality = 92
  )

  $codec = Get-JpegCodec
  $encoderParams = [System.Drawing.Imaging.EncoderParameters]::new(1)
  $encoderParams.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, $Quality)
  $Image.Save($Path, $codec, $encoderParams)
  $encoderParams.Dispose()
}

function Draw-Cover {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Image]$Image,
    [System.Drawing.Rectangle]$Destination
  )

  $scale = [Math]::Max($Destination.Width / $Image.Width, $Destination.Height / $Image.Height)
  $sourceWidth = $Destination.Width / $scale
  $sourceHeight = $Destination.Height / $scale
  $sourceX = ($Image.Width - $sourceWidth) / 2
  $sourceY = ($Image.Height - $sourceHeight) / 2

  $Graphics.DrawImage(
    $Image,
    $Destination,
    [float]$sourceX,
    [float]$sourceY,
    [float]$sourceWidth,
    [float]$sourceHeight,
    [System.Drawing.GraphicsUnit]::Pixel
  )
}

function Draw-Foreground {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Image]$Image,
    [int]$CanvasWidth,
    [int]$CanvasHeight
  )

  $foregroundWidth = $CanvasWidth * 1.12
  $foregroundHeight = $foregroundWidth * $Image.Height / $Image.Width
  if ($foregroundHeight -gt $CanvasHeight * 0.72) {
    $foregroundHeight = $CanvasHeight * 0.72
    $foregroundWidth = $foregroundHeight * $Image.Width / $Image.Height
  }

  $x = ($CanvasWidth - $foregroundWidth) / 2
  $y = $CanvasHeight * 0.26
  $destination = [System.Drawing.Rectangle]::new([int][Math]::Round($x), [int][Math]::Round($y), [int][Math]::Round($foregroundWidth), [int][Math]::Round($foregroundHeight))
  $Graphics.DrawImage($Image, $destination)
}

function Fill-Gradient {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Rectangle]$Rectangle,
    [System.Drawing.Color]$Start,
    [System.Drawing.Color]$End,
    [System.Drawing.Drawing2D.LinearGradientMode]$Mode
  )

  $brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($Rectangle, $Start, $End, $Mode)
  $Graphics.FillRectangle($brush, $Rectangle)
  $brush.Dispose()
}

function Convert-ToPortraitArt {
  param(
    [System.IO.FileInfo]$Source,
    [string]$DestinationPath
  )

  $sourceImage = [System.Drawing.Image]::FromFile($Source.FullName)
  try {
    $canvas = [System.Drawing.Bitmap]::new($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    try {
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.Clear([System.Drawing.Color]::FromArgb(16, 18, 18))

      Draw-Cover $graphics $sourceImage ([System.Drawing.Rectangle]::new(0, 0, $Width, $Height))

      $darkWash = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(38, 10, 12, 12))
      $graphics.FillRectangle($darkWash, 0, 0, $Width, $Height)
      $darkWash.Dispose()

      Fill-Gradient $graphics ([System.Drawing.Rectangle]::new(0, 0, $Width, [int]($Height * 0.24))) `
        ([System.Drawing.Color]::FromArgb(48, 255, 242, 216)) `
        ([System.Drawing.Color]::FromArgb(16, 0, 0, 0)) `
        ([System.Drawing.Drawing2D.LinearGradientMode]::Vertical)

      Fill-Gradient $graphics ([System.Drawing.Rectangle]::new(0, [int]($Height * 0.62), $Width, [int]($Height * 0.38))) `
        ([System.Drawing.Color]::FromArgb(0, 0, 0, 0)) `
        ([System.Drawing.Color]::FromArgb(132, 0, 0, 0)) `
        ([System.Drawing.Drawing2D.LinearGradientMode]::Vertical)

      Fill-Gradient $graphics ([System.Drawing.Rectangle]::new(0, 0, [int]($Width * 0.18), $Height)) `
        ([System.Drawing.Color]::FromArgb(72, 0, 0, 0)) `
        ([System.Drawing.Color]::FromArgb(0, 0, 0, 0)) `
        ([System.Drawing.Drawing2D.LinearGradientMode]::Horizontal)

      Fill-Gradient $graphics ([System.Drawing.Rectangle]::new([int]($Width * 0.82), 0, [int]($Width * 0.18), $Height)) `
        ([System.Drawing.Color]::FromArgb(0, 0, 0, 0)) `
        ([System.Drawing.Color]::FromArgb(78, 0, 0, 0)) `
        ([System.Drawing.Drawing2D.LinearGradientMode]::Horizontal)

      Save-Jpeg $canvas $DestinationPath 92
    } finally {
      $graphics.Dispose()
      $canvas.Dispose()
    }
  } finally {
    $sourceImage.Dispose()
  }
}

[System.IO.Directory]::CreateDirectory($OutputDir) | Out-Null
$resolvedSourceDir = (Resolve-Path -LiteralPath $SourceDir).Path
$resolvedOutputDir = (Resolve-Path -LiteralPath $OutputDir).Path

$files = Get-ChildItem -LiteralPath $resolvedSourceDir -Filter "us_*.jpg" -File | Sort-Object Name
$manifest = [ordered]@{
  ratio = "2:3"
  size = @($Width, $Height)
  generatedAt = (Get-Date).ToString("s")
  sourceDir = $resolvedSourceDir
  outputDir = $resolvedOutputDir
  files = @()
}

foreach ($file in $files) {
  $destination = Join-Path $resolvedOutputDir $file.Name
  Convert-ToPortraitArt $file $destination
  $manifest.files += [ordered]@{
    name = $file.Name
    source = $file.FullName
    output = $destination
  }
  Write-Host ("generated {0}" -f $file.Name)
}

$manifestPath = Join-Path $resolvedOutputDir "_manifest.json"
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
Write-Host ("manifest {0}" -f $manifestPath)
