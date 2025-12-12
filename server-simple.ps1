# Simple HTTP Server for Finance Assistant App
param(
    [int]$Port = 3000
)

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

try {
    $listener.Start()
    Write-Host "Server started at http://localhost:$Port/" -ForegroundColor Green
    Write-Host "Serving files from: $(Get-Location)\public" -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Cyan
    
    $mimeTypes = @{
        ".html" = "text/html"
        ".css" = "text/css"
        ".js" = "application/javascript"
        ".json" = "application/json"
        ".ico" = "image/x-icon"
        ".png" = "image/png"
        ".jpg" = "image/jpeg"
        ".gif" = "image/gif"
        ".svg" = "image/svg+xml"
    }
    
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response
            
            $url = $request.Url.LocalPath
            
            if ($url -eq "/") {
                $url = "/index.html"
            }
            
            $filePath = Join-Path (Get-Location) "public$url"
            $filePath = [System.IO.Path]::GetFullPath($filePath)
            
            $publicPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) "public"))
            if ($filePath.StartsWith($publicPath) -and (Test-Path $filePath -PathType Leaf)) {
                $extension = [System.IO.Path]::GetExtension($filePath)
                $contentType = $mimeTypes[$extension]
                if (-not $contentType) {
                    $contentType = "application/octet-stream"
                }
                
                $content = Get-Content -Path $filePath -Raw -Encoding UTF8
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
                
                $response.ContentType = $contentType
                $response.ContentLength64 = $buffer.Length
                $response.Headers.Add("Access-Control-Allow-Origin", "*")
                $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
                $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
                
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                
                Write-Host "Served: $url" -ForegroundColor Green
            } else {
                $response.StatusCode = 404
                $errorContent = "<html><body><h1>404 - File Not Found</h1><p>The requested file was not found.</p></body></html>"
                $errorBuffer = [System.Text.Encoding]::UTF8.GetBytes($errorContent)
                $response.ContentType = "text/html"
                $response.ContentLength64 = $errorBuffer.Length
                $response.OutputStream.Write($errorBuffer, 0, $errorBuffer.Length)
                
                Write-Host "Not found: $url" -ForegroundColor Red
            }
            
            $response.Close()
        } catch {
            Write-Host "Error processing request: $_" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "Server error: $_" -ForegroundColor Red
} finally {
    $listener.Stop()
    Write-Host "Server stopped" -ForegroundColor Yellow
}