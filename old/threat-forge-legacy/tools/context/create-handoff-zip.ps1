param(
  [string]$OutputDirectory = ".\handoff",
  [string]$Name = "",
  [switch]$IncludeGit,
  [switch]$IncludeArtifacts
)

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
  $gitRoot = $null
  try {
    $gitRoot = git rev-parse --show-toplevel 2>$null
  } catch {
    $gitRoot = $null
  }

  if ([string]::IsNullOrWhiteSpace($gitRoot)) {
    return (Get-Location).Path
  }

  return $gitRoot.Trim()
}

function Test-IsExcludedPath {
  param(
    [string]$RelativePath,
    [bool]$WithGit,
    [bool]$WithArtifacts
  )

  $normalized = $RelativePath -replace "\\", "/"

  if ($normalized -eq "") {
    return $true
  }

  if (-not $WithGit -and ($normalized -eq ".git" -or $normalized.StartsWith(".git/"))) {
    return $true
  }

  if (-not $WithArtifacts -and ($normalized -eq "artifacts" -or $normalized.StartsWith("artifacts/"))) {
    return $true
  }

  $excludedPrefixes = @(
    "node_modules/",
    "backend/node_modules/",
    "frontend/node_modules/",
    ".next/",
    "dist/",
    "build/",
    "coverage/",
    ".turbo/",
    ".cache/",
    ".pytest_cache/",
    "__pycache__/"
  )

  foreach ($prefix in $excludedPrefixes) {
    if ($normalized -eq $prefix.TrimEnd("/") -or $normalized.StartsWith($prefix)) {
      return $true
    }
  }

  $excludedNames = @(
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini"
  )

  foreach ($name in $excludedNames) {
    if ([System.IO.Path]::GetFileName($normalized) -eq $name) {
      return $true
    }
  }

  return $false
}

$repoRoot = Get-RepoRoot
$repoName = Split-Path -Leaf $repoRoot

if ([string]::IsNullOrWhiteSpace($Name)) {
  $stamp = Get-Date -Format "yyyyMMddTHHmmss"
  if ($IncludeGit) {
    $Name = "$repoName-handoff-with-git-$stamp.zip"
  } else {
    $Name = "$repoName-handoff-$stamp.zip"
  }
}

if (-not $Name.EndsWith(".zip")) {
  $Name = "$Name.zip"
}

if (-not [System.IO.Path]::IsPathRooted($OutputDirectory)) {
  $OutputDirectory = Join-Path $repoRoot $OutputDirectory
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null

$outputZip = Join-Path $OutputDirectory $Name

if (Test-Path $outputZip) {
  Remove-Item $outputZip -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($outputZip, [System.IO.Compression.ZipArchiveMode]::Create)

try {
  $rootFullPath = [System.IO.Path]::GetFullPath($repoRoot)
  $files = Get-ChildItem -LiteralPath $repoRoot -Recurse -Force -File

  $included = 0
  foreach ($file in $files) {
    $fileFullPath = [System.IO.Path]::GetFullPath($file.FullName)

    if ($fileFullPath -eq [System.IO.Path]::GetFullPath($outputZip)) {
      continue
    }

    $relative = [System.IO.Path]::GetRelativePath($rootFullPath, $fileFullPath)
    $relative = $relative -replace "\\", "/"

    if (Test-IsExcludedPath -RelativePath $relative -WithGit:$IncludeGit.IsPresent -WithArtifacts:$IncludeArtifacts.IsPresent) {
      continue
    }

    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $fileFullPath, $relative, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    $included += 1
  }
} finally {
  $zip.Dispose()
}

Write-Host "Handoff ZIP created:"
Write-Host $outputZip
Write-Host "Repository root: $repoRoot"
Write-Host "Included .git: $($IncludeGit.IsPresent)"
Write-Host "Included artifacts: $($IncludeArtifacts.IsPresent)"
Write-Host "Included files: $included"
