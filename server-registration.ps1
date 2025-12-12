# Simple HTTP Server for Finance Assistant App with Registration
param(
    [int]$Port = 3000
)

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

# Data storage paths
$DataDir = Join-Path (Get-Location) "data"
$UsersFile = Join-Path $DataDir "users.json"
$UserDataDir = Join-Path $DataDir "users"

# Ensure data directory exists
if (-not (Test-Path $DataDir)) {
    New-Item -ItemType Directory -Path $DataDir -Force
}

if (-not (Test-Path $UserDataDir)) {
    New-Item -ItemType Directory -Path $UserDataDir -Force
}

if (-not (Test-Path $UsersFile)) {
    $initialData = @{
        users = @()
        lastId = 1
    }
    $initialData | ConvertTo-Json -Depth 3 | Out-File -FilePath $UsersFile -Encoding UTF8
}

try {
    $listener.Start()
    Write-Host "Server started at http://localhost:$Port/" -ForegroundColor Green
    Write-Host "Data directory: $DataDir" -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop server" -ForegroundColor Cyan
    
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
            $method = $request.HttpMethod
            
            # Handle API endpoints
            if ($url -eq "/api/register" -and $method -eq "POST") {
                try {
                    $reader = New-Object System.IO.StreamReader($request.InputStream)
                    $requestData = $reader.ReadToEnd()
                    $userData = $requestData | ConvertFrom-Json
                    
                    $content = Get-Content -Path $UsersFile -Raw -Encoding UTF8
                    $usersData = $content | ConvertFrom-Json
                    
                    # Check if user already exists
                    $existingUser = $usersData.users | Where-Object { $_.email -eq $userData.email }
                    if ($existingUser) {
                        $response.StatusCode = 400
                        $errorResponse = @{ success = $false; message = "User with this email already exists" }
                        $content = $errorResponse | ConvertTo-Json -Depth 3
                        $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
                        $response.ContentType = "application/json"
                        $response.ContentLength64 = $buffer.Length
                        $response.OutputStream.Write($buffer, 0, $buffer.Length)
                        Write-Host "Registration failed: Email already exists" -ForegroundColor Red
                    } else {
                        # Register new user
                        $newUserId = $usersData.lastId + 1
                        $newUser = @{
                            id = $newUserId
                            name = $userData.name
                            email = $userData.email
                            password = $userData.password
                            created = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
                        }
                        
                        $usersData.users += $newUser
                        $usersData.lastId = $newUserId
                        $usersData | ConvertTo-Json -Depth 3 | Out-File -FilePath $UsersFile -Encoding UTF8
                        
                        # Create user financial data file
                        $userFinancialData = @{
                            transactions = @()
                            incomeCategories = @("Salary", "Freelance", "Investments", "Bonuses", "Gifts")
                            expenseCategories = @("Food", "Transport", "Entertainment", "Housing", "Health", "Education", "Other")
                            budgets = @()
                            goals = @()
                        }
                        $userFile = Join-Path $UserDataDir "user_$newUserId.json"
                        $userFinancialData | ConvertTo-Json -Depth 3 | Out-File -FilePath $userFile -Encoding UTF8
                        
                        $response.StatusCode = 200
                        $successResponse = @{ success = $true; message = "Registration successful"; user = $newUser }
                        $content = $successResponse | ConvertTo-Json -Depth 3
                        $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
                        $response.ContentType = "application/json"
                        $response.ContentLength64 = $buffer.Length
                        $response.OutputStream.Write($buffer, 0, $buffer.Length)
                        Write-Host "User registered: $($userData.email) (ID: $newUserId)" -ForegroundColor Green
                    }
                } catch {
                    $response.StatusCode = 500
                    $errorResponse = @{ success = $false; message = "Server error during registration" }
                    $content = $errorResponse | ConvertTo-Json -Depth 3
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
                    $response.ContentType = "application/json"
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                    Write-Host "Registration error: $_" -ForegroundColor Red
                }
            } elseif ($url -eq "/api/login" -and $method -eq "POST") {
                try {
                    $reader = New-Object System.IO.StreamReader($request.InputStream)
                    $requestData = $reader.ReadToEnd()
                    $loginData = $requestData | ConvertFrom-Json
                    
                    $content = Get-Content -Path $UsersFile -Raw -Encoding UTF8
                    $usersData = $content | ConvertFrom-Json
                    $user = $usersData.users | Where-Object { $_.email -eq $loginData.email -and $_.password -eq $loginData.password }
                    
                    if ($user) {
                        $response.StatusCode = 200
                        $successResponse = @{ success = $true; message = "Login successful"; user = $user }
                        $content = $successResponse | ConvertTo-Json -Depth 3
                        $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
                        $response.ContentType = "application/json"
                        $response.ContentLength64 = $buffer.Length
                        $response.OutputStream.Write($buffer, 0, $buffer.Length)
                        Write-Host "User logged in: $($loginData.email)" -ForegroundColor Green
                    } else {
                        $response.StatusCode = 401
                        $errorResponse = @{ success = $false; message = "Invalid email or password" }
                        $content = $errorResponse | ConvertTo-Json -Depth 3
                        $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
                        $response.ContentType = "application/json"
                        $response.ContentLength64 = $buffer.Length
                        $response.OutputStream.Write($buffer, 0, $buffer.Length)
                        Write-Host "Login failed: $($loginData.email)" -ForegroundColor Red
                    }
                } catch {
                    $response.StatusCode = 500
                    $errorResponse = @{ success = $false; message = "Server error during login" }
                    $content = $errorResponse | ConvertTo-Json -Depth 3
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
                    $response.ContentType = "application/json"
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                    Write-Host "Login error: $_" -ForegroundColor Red
                }
            } elseif ($url -match "^/api/user/(\d+)/data$" -and $method -eq "GET") {
                try {
                    $userId = $matches[1]
                    $userFile = Join-Path $UserDataDir "user_$userId.json"
                    if (Test-Path $userFile) {
                        $content = Get-Content -Path $userFile -Raw -Encoding UTF8
                        $userFinancialData = $content | ConvertFrom-Json
                        
                        $response.StatusCode = 200
                        $content = $userFinancialData | ConvertTo-Json -Depth 3
                        $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
                        $response.ContentType = "application/json"
                        $response.ContentLength64 = $buffer.Length
                        $response.OutputStream.Write($buffer, 0, $buffer.Length)
                        Write-Host "User data requested: ID $userId" -ForegroundColor Green
                    } else {
                        $response.StatusCode = 404
                        $errorResponse = @{ success = $false; message = "User data not found" }
                        $content = $errorResponse | ConvertTo-Json -Depth 3
                        $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
                        $response.ContentType = "application/json"
                        $response.ContentLength64 = $buffer.Length
                        $response.OutputStream.Write($buffer, 0, $buffer.Length)
                        Write-Host "User data not found: ID $userId" -ForegroundColor Red
                    }
                } catch {
                    $response.StatusCode = 500
                    $errorResponse = @{ success = $false; message = "Error loading user data" }
                    $content = $errorResponse | ConvertTo-Json -Depth 3
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
                    $response.ContentType = "application/json"
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                    Write-Host "User data error: $_" -ForegroundColor Red
                }
            } elseif ($url -match "^/api/user/(\d+)/data$" -and $method -eq "POST") {
                try {
                    $userId = $matches[1]
                    $reader = New-Object System.IO.StreamReader($request.InputStream)
                    $requestData = $reader.ReadToEnd()
                    $financialData = $requestData | ConvertFrom-Json
                    
                    $userFile = Join-Path $UserDataDir "user_$userId.json"
                    $financialData | ConvertTo-Json -Depth 3 | Out-File -FilePath $userFile -Encoding UTF8
                    
                    $response.StatusCode = 200
                    $successResponse = @{ success = $true; message = "Data saved successfully" }
                    $content = $successResponse | ConvertTo-Json -Depth 3
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
                    $response.ContentType = "application/json"
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                    Write-Host "User data saved: ID $userId" -ForegroundColor Green
                } catch {
                    $response.StatusCode = 500
                    $errorResponse = @{ success = $false; message = "Error saving user data" }
                    $content = $errorResponse | ConvertTo-Json -Depth 3
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
                    $response.ContentType = "application/json"
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                    Write-Host "User data save error: $_" -ForegroundColor Red
                }
            } else {
                # Serve static files
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