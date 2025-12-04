$functionDir = "C:\VSProjects\_Websites\Durdle\durdle-serverless-api\functions\quotes-calculator"
$zipFile = "$functionDir\function.zip"

# Remove old ZIP if it exists
if (Test-Path $zipFile) {
    Remove-Item $zipFile -Force
    Write-Host "Removed old ZIP file"
}

# Change to function directory
Set-Location $functionDir

# Create ZIP with all files including node_modules
Add-Type -AssemblyName System.IO.Compression.FileSystem

$compressionLevel = [System.IO.Compression.CompressionLevel]::Optimal
$includeBaseDirectory = $false

# Get all files and directories
$filesToZip = Get-ChildItem -Path $functionDir -Exclude "*.zip","*.ps1","create-zip.ps1" -Force

# Create ZIP archive
$zip = [System.IO.Compression.ZipFile]::Open($zipFile, 'Create')

foreach ($file in $filesToZip) {
    if ($file.PSIsContainer) {
        # Add directory recursively
        $files = Get-ChildItem -Path $file.FullName -Recurse -File
        foreach ($f in $files) {
            $relativePath = $f.FullName.Substring($functionDir.Length + 1)
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $f.FullName, $relativePath, $compressionLevel) | Out-Null
        }
    } else {
        # Add file
        $relativePath = $file.Name
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $relativePath, $compressionLevel) | Out-Null
    }
}

$zip.Dispose()

Write-Host "ZIP file created successfully: $zipFile"
Write-Host "ZIP file size: $((Get-Item $zipFile).Length / 1MB) MB"
