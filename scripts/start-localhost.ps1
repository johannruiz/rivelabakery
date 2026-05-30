param(
  [int]$Port = 8000
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

$contentTypes = @{
  '.html' = 'text/html; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'
  '.js' = 'application/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.svg' = 'image/svg+xml'
  '.png' = 'image/png'
  '.jpg' = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.webp' = 'image/webp'
  '.gif' = 'image/gif'
  '.ico' = 'image/x-icon'
}

function Get-SafeFilePath {
  param([string]$RequestPath)

  if ([string]::IsNullOrWhiteSpace($RequestPath) -or $RequestPath -eq '/') {
    $RequestPath = '/index.html'
  }

  $cleanPath = [System.Uri]::UnescapeDataString($RequestPath.Split('?')[0].TrimStart('/'))
  $cleanPath = $cleanPath -replace '/', [System.IO.Path]::DirectorySeparatorChar
  $fullPath = [System.IO.Path]::GetFullPath((Join-Path $Root $cleanPath))
  $rootPath = [System.IO.Path]::GetFullPath($Root)

  if (-not $fullPath.StartsWith($rootPath)) {
    return $null
  }

  return $fullPath
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()

Write-Host ""
Write-Host "Rivela Web esta corriendo en: http://localhost:$Port/"
Write-Host "Presiona Ctrl + C para detener el servidor."
Write-Host ""

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()

    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()

      while (($line = $reader.ReadLine()) -ne $null -and $line -ne '') {}

      $requestPath = '/'
      if ($requestLine -match '^[A-Z]+\s+([^\s]+)') {
        $requestPath = $matches[1]
      }

      $filePath = Get-SafeFilePath -RequestPath $requestPath

      if ($null -eq $filePath -or -not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
        $status = '404 Not Found'
        $contentType = 'text/plain; charset=utf-8'
        $body = [System.Text.Encoding]::UTF8.GetBytes('Not found')
      } else {
        $status = '200 OK'
        $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
        $contentType = if ($contentTypes.ContainsKey($extension)) { $contentTypes[$extension] } else { 'application/octet-stream' }
        $body = [System.IO.File]::ReadAllBytes($filePath)
      }

      $headers = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nConnection: close`r`nCache-Control: no-store`r`n`r`n"
      $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)

      $stream.Write($headerBytes, 0, $headerBytes.Length)
      $stream.Write($body, 0, $body.Length)
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
