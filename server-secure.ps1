# Secure HTTP Server for Finance Assistant App
# Enhanced security, logging, and performance monitoring
param(
    [int]$Port = 3000,
    [string]$LogLevel = "INFO",
    [switch]$EnableHTTPS = $false,
    [string]$CertPath = "",
    [string]$KeyPath = ""
)

# Import required modules
Add-Type -AssemblyName System.Web
Add-Type -AssemblyName System.Security

# Security configurations
$SecurityHeaders = @{
    "X-Content-Type-Options" = "nosniff"
    "X-Frame-Options" = "DENY"
    "X-XSS-Protection" = "1; mode=block"
    "Strict-Transport-Security" = "max-age=31536000; includeSubDomains"
    "Content-Security-Policy" = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none';"
    "Referrer-Policy" = "strict-origin-when-cross-origin"
    "Permissions-Policy" = "geolocation=(), microphone=(), camera=()"
}

# Rate limiting configuration
$RateLimitConfig = @{
    MaxRequestsPerMinute = 60
    MaxRequestsPerHour = 1000
    BlockDurationMinutes = 15
}

# Initialize security state
$RateLimitStore = @{}
$SecurityEvents = @()
$BlockedIPs = @{}
$RequestCounters = @{}

# Logging configuration
$LogPath = Join-Path (Get-Location) "logs"
if (-not (Test-Path $LogPath)) {
    New-Item -ItemType Directory -Path $LogPath -Force
}

# Enhanced logging function
function Write-Log {
    param(
        [string]$Level,
        [string]$Message,
        [hashtable]$Details = @{}
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = @{
        timestamp = $timestamp
        level = $Level
        message = $Message
        details = $Details
    }
    
    $logLine = ConvertTo-Json $logEntry -Compress
    $logFile = Join-Path $LogPath "finance-assistant-$(Get-Date -Format 'yyyy-MM-dd').log"
    
    try {
        Add-Content -Path $logFile -Value $logLine -Encoding UTF8
        Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $(Get-LevelColor $Level)
    } catch {
        Write-Host "Failed to write log: $_" -ForegroundColor Red
    }
}

function Get-LevelColor {
    param([string]$Level)
    switch ($Level.ToUpper()) {
        "ERROR" { return "Red" }
        "WARN" { return "Yellow" }
        "INFO" { return "Green" }
        "DEBUG" { return "Cyan" }
        default { return "White" }
    }
}

# Security functions
function Test-RequestSecurity {
    param(
        [hashtable]$Request,
        [string]$ClientIP
    )
    
    # Rate limiting check
    $currentTime = Get-Date
    $rateLimitKey = "$ClientIP"
    
    if (-not $RateLimitStore.ContainsKey($rateLimitKey)) {
        $RateLimitStore[$rateLimitKey] = @{
            Requests = @()
            LastReset = $currentTime
        }
    }
    
    $clientData = $RateLimitStore[$rateLimitKey]
    
    # Reset counters if needed
    if (($currentTime - $clientData.LastReset).TotalMinutes -ge 1) {
        $clientData.Requests = @()
        $clientData.LastReset = $currentTime
    }
    
    $clientData.Requests += $currentTime
    
    # Check rate limits
    $requestsInLastMinute = $clientData.Requests.Where({ $_ -ge $currentTime.AddMinutes(-1) }).Count
    $requestsInLastHour = $clientData.Requests.Where({ $_ -ge $currentTime.AddHours(-1) }).Count
    
    if ($requestsInLastMinute -gt $RateLimitConfig.MaxRequestsPerMinute -or 
        $requestsInLastHour -gt $RateLimitConfig.MaxRequestsPerHour) {
        
        $SecurityEvents += @{
            timestamp = $currentTime
            type = "RATE_LIMIT_EXCEEDED"
            ip = $ClientIP
            details = @{
                requests_per_minute = $requestsInLastMinute
                requests_per_hour = $requestsInLastHour
            }
        }
        
        Write-Log "WARN" "Rate limit exceeded for IP: $ClientIP" @{
            requests_per_minute = $requestsInLastMinute
            requests_per_hour = $requestsInLastHour
        }
        
        return $false
    }
    
    # Check blocked IPs
    if ($BlockedIPs.ContainsKey($ClientIP)) {
        $blockData = $BlockedIPs[$ClientIP]
        if (($currentTime - $blockData.Timestamp).TotalMinutes -lt $RateLimitConfig.BlockDurationMinutes) {
            Write-Log "WARN" "Blocked IP attempted access: $ClientIP"
            return $false
        } else {
            # Unblock expired block
            $BlockedIPs.Remove($ClientIP)
            Write-Log "INFO" "IP block expired: $ClientIP"
        }
    }
    
    return $true
}

function Block-IP {
    param([string]$IP, [string]$Reason)
    
    $BlockedIPs[$IP] = @{
        Timestamp = Get-Date
        Reason = $Reason
    }
    
    $SecurityEvents += @{
        timestamp = Get-Date
        type = "IP_BLOCKED"
        ip = $IP
        details = @{ reason = $Reason }
    }
    
    Write-Log "WARN" "IP blocked: $IP - $Reason"
}

function Get-ClientIP {
    param([hashtable]$Request)
    
    # Try to get real IP from various headers
    $ipHeaders = @("X-Forwarded-For", "X-Real-IP", "X-Client-IP", "CF-Connecting-IP")
    
    foreach ($header in $ipHeaders) {
        if ($Request.Headers.ContainsKey($header)) {
            $ip = $Request.Headers[$header].Split(',')[0].Trim()
            if ($ip -and [System.Net.IPAddress]::TryParse($ip, [ref]$null)) {
                return $ip
            }
        }
    }
    
    # Fallback to remote endpoint
    try {
        $remoteEndpoint = $Request.RemoteEndPoint
        if ($remoteEndpoint) {
            return $remoteEndpoint.Address.ToString()
        }
    } catch {
        # Final fallback
        return "unknown"
    }
}

function Test-PathSecurity {
    param([string]$Path)
    
    # Path traversal protection
    $maliciousPatterns = @(
        "\.\.\/",
        "\.\.\\",
        "\.\.%2f",
        "\.\.%5c",
        "\.\.%252f",
        "\.\.%255c",
        "%2e%2e%2f",
        "%2e%2e%5c",
        "\.\.\/",
        "\.\.\\",
        "\.\/",
        "\.\\"
    )
    
    foreach ($pattern in $maliciousPatterns) {
        if ($Path -like "*$pattern*") {
            Write-Log "WARN" "Suspicious path detected: $Path"
            return $false
        }
    }
    
    # Check for forbidden file extensions
    $forbiddenExtensions = @(".exe", ".bat", ".cmd", ".scr", ".pif", ".com", ".vbs", ".js", ".jar", ".app")
    $extension = [System.IO.Path]::GetExtension($Path).ToLower()
    
    if ($forbiddenExtensions -contains $extension) {
        Write-Log "WARN" "Forbidden file extension requested: $Path"
        return $false
    }
    
    return $true
}

function Test-ContentSecurity {
    param(
        [string]$Content,
        [string]$ContentType
    )
    
    # Skip security checks for safe content types
    $safeTypes = @("text/css", "application/javascript", "image/jpeg", "image/png", "image/gif", "image/svg+xml", "image/x-icon")
    if ($safeTypes -contains $ContentType) {
        return $true
    }
    
    # Check for malicious content patterns
    $maliciousPatterns = @(
        "<script",
        "</script>",
        "javascript:",
        "vbscript:",
        "onload=",
        "onerror=",
        "onclick=",
        "onmouseover=",
        "eval(",
        "expression(",
        "<iframe",
        "<object",
        "<embed",
        "<form",
        "document.cookie",
        "window.location"
    )
    
    $contentLower = $Content.ToLower()
    foreach ($pattern in $maliciousPatterns) {
        if ($contentLower -contains $pattern) {
            Write-Log "WARN" "Suspicious content pattern detected: $pattern"
            return $false
        }
    }
    
    return $true
}

# Enhanced MIME types with security considerations
$MimeTypes = @{
    ".html" = @{ Type = "text/html"; Charset = "UTF-8"; Security = "medium" }
    ".css" = @{ Type = "text/css"; Charset = "UTF-8"; Security = "low" }
    ".js" = @{ Type = "application/javascript"; Charset = "UTF-8"; Security = "high" }
    ".json" = @{ Type = "application/json"; Charset = "UTF-8"; Security = "medium" }
    ".ico" = @{ Type = "image/x-icon"; Security = "low" }
    ".png" = @{ Type = "image/png"; Security = "low" }
    ".jpg" = @{ Type = "image/jpeg"; Security = "low" }
    ".jpeg" = @{ Type = "image/jpeg"; Security = "low" }
    ".gif" = @{ Type = "image/gif"; Security = "low" }
    ".svg" = @{ Type = "image/svg+xml"; Security = "medium" }
    ".woff" = @{ Type = "font/woff"; Security = "low" }
    ".woff2" = @{ Type = "font/woff2"; Security = "low" }
    ".ttf" = @{ Type = "font/ttf"; Security = "low" }
}

# Create HTTP listener with security enhancements
$listener = New-Object System.Net.HttpListener

# Configure HTTPS if requested
if ($EnableHTTPS -and $CertPath -and $KeyPath) {
    try {
        $certificate = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($CertPath, $KeyPath)
        $listener.Prefixes.Add("https://localhost:$Port/")
        Write-Log "INFO" "HTTPS server configured on port $Port"
    } catch {
        Write-Log "ERROR" "Failed to configure HTTPS: $_"
        exit 1
    }
} else {
    $listener.Prefixes.Add("http://localhost:$Port/")
    Write-Log "INFO" "HTTP server configured on port $Port"
}

try {
    $listener.Start()
    Write-Host "🚀 Secure Finance Assistant Server started" -ForegroundColor Green
    Write-Host "📡 Port: $Port" -ForegroundColor Cyan
    Write-Host "📁 Serving from: $(Get-Location)\public" -ForegroundColor Yellow
    Write-Host "📝 Log level: $LogLevel" -ForegroundColor Yellow
    Write-Host "🔒 Security: Enhanced" -ForegroundColor Green
    Write-Host "⏹️ Press Ctrl+C to stop server" -ForegroundColor Cyan
    
    Write-Log "INFO" "Server started successfully on port $Port"
    
    # Request processing loop
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response
            
            $startTime = Get-Date
            $clientIP = Get-ClientIP -Request $request
            $url = $request.Url.LocalPath
            $method = $request.HttpMethod
            
            # Log request start
            Write-Log "DEBUG" "Request received: $method $url from $clientIP"
            
            # Security checks
            if (-not (Test-RequestSecurity -Request $request -ClientIP $clientIP)) {
                $response.StatusCode = 429
                $response.StatusDescription = "Too Many Requests"
                $response.Headers.Add("Retry-After", $RateLimitConfig.BlockDurationMinutes * 60)
                Write-Log "WARN" "Request blocked due to security check: $clientIP"
                $response.Close()
                continue
            }
            
            # Path security check
            if (-not (Test-PathSecurity -Path $url)) {
                $response.StatusCode = 400
                $response.StatusDescription = "Bad Request"
                Write-Log "WARN" "Malicious path blocked: $url from $clientIP"
                $response.Close()
                continue
            }
            
            # Default to index.html for root
            if ($url -eq "/") {
                $url = "/index.html"
            }
            
            # Handle API endpoints with enhanced security
            if ($url.StartsWith("/api/")) {
                $apiResult = Handle-APIRequest -Context $context -Request $request -ClientIP $clientIP
                $response.StatusCode = $apiResult.StatusCode
                $response.StatusDescription = $apiResult.StatusDescription
                
                if ($apiResult.Content) {
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($apiResult.Content)
                    $response.ContentLength64 = $buffer.Length
                    $response.Headers.Add("Content-Type", "application/json; charset=utf-8")
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                }
                
                $response.Close()
                continue
            }
            
            # Construct file path with security validation
            $filePath = Join-Path (Get-Location) "public$url"
            $filePath = [System.IO.Path]::GetFullPath($filePath)
            $publicPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) "public"))
            
            # Security: Ensure we're serving from public directory
            if (-not $filePath.StartsWith($publicPath)) {
                $response.StatusCode = 403
                $response.StatusDescription = "Forbidden"
                Write-Log "WARN" "Path traversal attempt blocked: $url from $clientIP"
                $response.Close()
                continue
            }
            
            # Check if file exists and is not a directory
            if ((Test-Path $filePath) -and (Get-Item $filePath -ErrorAction SilentlyContinue).PSIsContainer -eq $false) {
                $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
                $mimeType = $MimeTypes[$extension]
                
                if ($mimeType) {
                    # Read file content
                    $content = Get-Content -Path $filePath -Raw -Encoding UTF8
                    
                    # Content security check
                    if (-not (Test-ContentSecurity -Content $content -ContentType $mimeType.Type)) {
                        $response.StatusCode = 403
                        $response.StatusDescription = "Forbidden Content"
                        Write-Log "WARN" "Malicious content blocked: $filePath from $clientIP"
                        $response.Close()
                        continue
                    }
                    
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
                    
                    # Set security headers
                    foreach ($header in $SecurityHeaders.GetEnumerator()) {
                        $response.Headers.Add($header.Key, $header.Value)
                    }
                    
                    # Set content type with charset
                    $contentType = $mimeType.Type
                    if ($mimeType.Charset) {
                        $contentType += "; charset=$($mimeType.Charset)"
                    }
                    $response.ContentType = $contentType
                    $response.ContentLength64 = $buffer.Length
                    
                    # Cache control based on security level
                    if ($mimeType.Security -eq "low") {
                        $response.Headers.Add("Cache-Control", "public, max-age=3600")
                    } elseif ($mimeType.Security -eq "medium") {
                        $response.Headers.Add("Cache-Control", "public, max-age=1800, must-revalidate")
                    } else {
                        $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
                    }
                    
                    # Additional security headers
                    $response.Headers.Add("X-Content-Type-Options", "nosniff")
                    $response.Headers.Add("X-Frame-Options", "DENY")
                    $response.Headers.Add("X-XSS-Protection", "1; mode=block")
                    
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                    
                    $endTime = Get-Date
                    $duration = ($endTime - $startTime).TotalMilliseconds
                    
                    Write-Log "DEBUG" "File served: $url ($duration ms) to $clientIP"
                } else {
                    # Unknown file type - treat as potentially dangerous
                    $response.StatusCode = 403
                    $response.StatusDescription = "Forbidden"
                    Write-Log "WARN" "Unknown file type blocked: $filePath from $clientIP"
                }
            } else {
                # File not found
                $response.StatusCode = 404
                $response.StatusDescription = "File Not Found"
                $response.Headers.Add("Content-Type", "text/html; charset=utf-8")
                
                $errorContent = @"
<!DOCTYPE html>
<html lang='ru'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>404 - Файл не найден</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
               display: flex; align-items: center; justify-content: center; 
               min-height: 100vh; margin: 0; background: #f8f9fa; }
        .error-container { text-align: center; padding: 40px; }
        .error-code { font-size: 6rem; font-weight: 700; color: #e74c3c; margin: 0; }
        .error-message { font-size: 1.2rem; color: #6c757d; margin: 20px 0; }
        .error-details { font-size: 0.9rem; color: #adb5bd; }
    </style>
</head>
<body>
    <div class='error-container'>
        <div class='error-code'>404</div>
        <div class='error-message'>Файл не найден</div>
        <div class='error-details'>Запрошенный ресурс не существует на сервере</div>
    </div>
</body>
</html>
"@
                
                $errorBuffer = [System.Text.Encoding]::UTF8.GetBytes($errorContent)
                $response.ContentLength64 = $errorBuffer.Length
                $response.OutputStream.Write($errorBuffer, 0, $errorBuffer.Length)
                
                Write-Log "WARN" "File not found: $url from $clientIP"
            }
            
            $response.Close()
            
        } catch {
            Write-Log "ERROR" "Error processing request: $_" @{
                url = $url
                clientIP = $clientIP
                method = $method
            }
        }
    }
    
} catch {
    Write-Log "ERROR" "Server error: $_"
    Write-Host "❌ Server error: $_" -ForegroundColor Red
} finally {
    $listener.Stop()
    Write-Log "INFO" "Server stopped"
    Write-Host "🛑 Server stopped" -ForegroundColor Yellow
    
    # Generate security report on shutdown
    Generate-SecurityReport
}

function Handle-APIRequest {
    param(
        [hashtable]$Context,
        [hashtable]$Request,
        [string]$ClientIP
    )
    
    $url = $Request.Url.LocalPath
    $method = $Request.HttpMethod
    
    Write-Log "DEBUG" "API Request: $method $url from $clientIP"
    
    # Only allow POST for API endpoints (except for health check)
    if ($url -eq "/api/health" -and $method -eq "GET") {
        return @{
            StatusCode = 200
            StatusDescription = "OK"
            Content = ConvertTo-Json @{
                status = "healthy"
                timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
                version = "2.0.0"
                security = "enhanced"
            }
        }
    }
    
    if ($method -ne "POST") {
        return @{
            StatusCode = 405
            StatusDescription = "Method Not Allowed"
            Content = ConvertTo-Json @{
                success = $false
                message = "Only POST method is allowed for API endpoints"
            }
        }
    }
    
    try {
        # Read request body
        $reader = New-Object System.IO.StreamReader($Request.InputStream)
        $requestData = $reader.ReadToEnd()
        
        # Validate JSON
        try {
            $data = $requestData | ConvertFrom-Json
        } catch {
            return @{
                StatusCode = 400
                StatusDescription = "Bad Request"
                Content = ConvertTo-Json @{
                    success = $false
                    message = "Invalid JSON format"
                }
            }
        }
        
        # Route API requests
        switch ($url) {
            "/api/register" {
                return Handle-Registration -Data $data -ClientIP $ClientIP
            }
            "/api/login" {
                return Handle-Login -Data $data -ClientIP $ClientIP
            }
            "/api/user/([0-9]+)/data" {
                if ($matches[0]) {
                    return Handle-UserData -UserId $matches[0] -Data $data -Method $method -ClientIP $ClientIP
                }
            }
            default {
                return @{
                    StatusCode = 404
                    StatusDescription = "Not Found"
                    Content = ConvertTo-Json @{
                        success = $false
                        message = "API endpoint not found"
                    }
                }
            }
        }
        
    } catch {
        Write-Log "ERROR" "API request processing error: $_" @{
            url = $url
            clientIP = $ClientIP
        }
        
        return @{
            StatusCode = 500
            StatusDescription = "Internal Server Error"
            Content = ConvertTo-Json @{
                success = $false
                message = "Internal server error"
            }
        }
    }
}

function Handle-Registration {
    param([hashtable]$Data, [string]$ClientIP)
    
    Write-Log "INFO" "Registration attempt from $ClientIP"
    
    # Validate required fields
    $requiredFields = @("name", "email", "password", "salt")
    foreach ($field in $requiredFields) {
        if (-not $data.ContainsKey($field)) {
            return @{
                StatusCode = 400
                StatusDescription = "Bad Request"
                Content = ConvertTo-Json @{
                    success = $false
                    message = "Missing required field: $field"
                }
            }
        }
    }
    
    # Validate data
    if (-not $data.name -or $data.name.Length -lt 2) {
        return @{
            StatusCode = 400
            StatusDescription = "Bad Request"
            Content = ConvertTo-Json @{
                success = $false
                message = "Invalid name"
            }
        }
    }
    
    if (-not $data.email -or $data.email -notmatch '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$') {
        return @{
            StatusCode = 400
            StatusDescription = "Bad Request"
            Content = ConvertTo-Json @{
                success = $false
                message = "Invalid email format"
            }
        }
    }
    
    if (-not $data.password -or $data.password.Length -lt 8) {
        return @{
            StatusCode = 400
            StatusDescription = "Bad Request"
            Content = ConvertTo-Json @{
                success = $false
                message = "Password must be at least 8 characters"
            }
        }
    }
    
    # Load existing users
    $usersFile = Join-Path (Get-Location) "data\users.json"
    $usersData = if (Test-Path $usersFile) { 
        Get-Content $usersFile -Raw | ConvertFrom-Json 
    } else { 
        @{ users = @(); lastId = 1 } 
    }
    
    # Check if user already exists
    $existingUser = $usersData.users | Where-Object { $_.email -eq $data.email.ToLower() }
    if ($existingUser) {
        Write-Log "WARN" "Registration attempt with existing email: $($data.email) from $ClientIP"
        return @{
            StatusCode = 400
            StatusDescription = "Bad Request"
            Content = ConvertTo-Json @{
                success = $false
                message = "User with this email already exists"
            }
        }
    }
    
    # Create new user
    $newUser = @{
        id = $usersData.lastId + 1
        name = $data.name
        email = $data.email.ToLower()
        password = $data.password
        salt = $data.salt
        created = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
        isActive = $true
        lastLogin = $null
        loginAttempts = 0
    }
    
    # Save user
    $usersData.users += $newUser
    $usersData.lastId = $newUser.id
    $usersData | ConvertTo-Json -Depth 3 | Out-File -FilePath $usersFile -Encoding UTF8
    
    # Create user data file
    $userDataDir = Join-Path (Get-Location) "data\users"
    if (-not (Test-Path $userDataDir)) {
        New-Item -ItemType Directory -Path $userDataDir -Force
    }
    
    $userFile = Join-Path $userDataDir "user_$($newUser.id).json"
    $initialUserData = @{
        transactions = @()
        incomeCategories = @("Зарплата", "Фриланс", "Инвестиции", "Бонусы", "Подарки")
        expenseCategories = @("Продукты", "Транспорт", "Развлечения", "ЖКХ", "Здоровье", "Образование", "Прочее")
        budgets = @()
        goals = @()
    }
    
    $initialUserData | ConvertTo-Json -Depth 3 | Out-File -FilePath $userFile -Encoding UTF8
    
    Write-Log "INFO" "User registered successfully: $($newUser.email) from $ClientIP"
    $SecurityEvents += @{
        timestamp = Get-Date
        type = "USER_REGISTERED"
        ip = $ClientIP
        details = @{
            userId = $newUser.id
            email = $newUser.email
        }
    }
    
    return @{
        StatusCode = 200
        StatusDescription = "OK"
        Content = ConvertTo-Json @{
            success = $true
            message = "Registration successful"
            user = @{
                id = $newUser.id
                name = $newUser.name
                email = $newUser.email
                created = $newUser.created
            }
        }
    }
}

function Handle-Login {
    param([hashtable]$Data, [string]$ClientIP)
    
    Write-Log "INFO" "Login attempt from $ClientIP"
    
    # Validate required fields
    if (-not $data.ContainsKey("email") -or -not $data.ContainsKey("password")) {
        return @{
            StatusCode = 400
            StatusDescription = "Bad Request"
            Content = ConvertTo-Json @{
                success = $false
                message = "Email and password are required"
            }
        }
    }
    
    # Load users
    $usersFile = Join-Path (Get-Location) "data\users.json"
    $usersData = if (Test-Path $usersFile) { 
        Get-Content $usersFile -Raw | ConvertFrom-Json 
    } else { 
        @{ users = @() } 
    }
    
    # Find user
    $user = $usersData.users | Where-Object { $_.email -eq $Data.email.ToLower() }
    
    if (-not $user) {
        Write-Log "WARN" "Login attempt with non-existent email: $($Data.email) from $ClientIP"
        return @{
            StatusCode = 401
            StatusDescription = "Unauthorized"
            Content = ConvertTo-Json @{
                success = $false
                message = "Invalid email or password"
            }
        }
    }
    
    # Check password
    if ($user.password -ne $Data.password) {
        Write-Log "WARN" "Login attempt with incorrect password for: $($Data.email) from $ClientIP"
        
        # Increment login attempts
        $user.loginAttempts = ($user.loginAttempts + 1)
        
        # Block user after too many attempts
        if ($user.loginAttempts -ge 5) {
            $user.isActive = $false
            Write-Log "WARN" "User blocked due to too many failed attempts: $($Data.email)"
        }
        
        # Update user data
        $usersData.users | Where-Object { $_.id -ne $user.id } | ForEach-Object {
            $usersData.users[$usersData.users.IndexOf($_)] = $_
        }
        $usersData.users[$usersData.users.IndexOf($user)] = $user
        $usersData | ConvertTo-Json -Depth 3 | Out-File -FilePath $usersFile -Encoding UTF8
        
        return @{
            StatusCode = 401
            StatusDescription = "Unauthorized"
            Content = ConvertTo-Json @{
                success = $false
                message = "Invalid email or password"
            }
        }
    }
    
    # Successful login
    $user.lastLogin = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
    $user.loginAttempts = 0
    $user.isActive = $true
    
    # Update user data
    $usersData.users | Where-Object { $_.id -ne $user.id } | ForEach-Object {
        $usersData.users[$usersData.users.IndexOf($_)] = $_
    }
    $usersData.users[$usersData.users.IndexOf($user)] = $user
    $usersData | ConvertTo-Json -Depth 3 | Out-File -FilePath $usersFile -Encoding UTF8
    
    Write-Log "INFO" "User logged in successfully: $($Data.email) from $ClientIP"
    $SecurityEvents += @{
        timestamp = Get-Date
        type = "USER_LOGIN_SUCCESS"
        ip = $ClientIP
        details = @{
            userId = $user.id
            email = $user.email
        }
    }
    
    return @{
        StatusCode = 200
        StatusDescription = "OK"
        Content = ConvertTo-Json @{
            success = $true
            message = "Login successful"
            user = @{
                id = $user.id
                name = $user.name
                email = $user.email
                created = $user.created
                lastLogin = $user.lastLogin
            }
        }
    }
}

function Handle-UserData {
    param(
        [int]$UserId,
        [hashtable]$Data,
        [string]$Method,
        [string]$ClientIP
    )
    
    Write-Log "DEBUG" "User data request: $Method for user $UserId from $ClientIP"
    
    $userFile = Join-Path (Get-Location) "data\users\user_$UserId.json"
    
    if ($Method -eq "GET") {
        # Return user data
        if (Test-Path $userFile) {
            $userData = Get-Content $userFile -Raw | ConvertFrom-Json
            return @{
                StatusCode = 200
                StatusDescription = "OK"
                Content = ConvertTo-Json @{
                    success = $true
                    transactions = $userData.transactions
                    incomeCategories = $userData.incomeCategories
                    expenseCategories = $userData.expenseCategories
                    budgets = $userData.budgets
                    goals = $userData.goals
                }
            }
        } else {
            return @{
                StatusCode = 404
                StatusDescription = "Not Found"
                Content = ConvertTo-Json @{
                    success = $false
                    message = "User data not found"
                }
            }
        }
    } elseif ($Method -eq "POST") {
        # Save user data
        if (Test-Path $userFile) {
            try {
                $Data | ConvertTo-Json -Depth 3 | Out-File -FilePath $userFile -Encoding UTF8
                
                Write-Log "INFO" "User data saved for user $UserId from $ClientIP"
                return @{
                    StatusCode = 200
                    StatusDescription = "OK"
                    Content = ConvertTo-Json @{
                        success = $true
                        message = "Data saved successfully"
                    }
                }
            } catch {
                Write-Log "ERROR" "Failed to save user data for user $UserId: $_"
                return @{
                    StatusCode = 500
                    StatusDescription = "Internal Server Error"
                    Content = ConvertTo-Json @{
                        success = $false
                        message = "Failed to save data"
                    }
                }
            }
        } else {
            return @{
                StatusCode = 404
                StatusDescription = "Not Found"
                Content = ConvertTo-Json @{
                    success = $false
                    message = "User not found"
                }
            }
        }
    } else {
        return @{
            StatusCode = 405
            StatusDescription = "Method Not Allowed"
            Content = ConvertTo-Json @{
                success = $false
                message = "Only GET and POST methods are allowed"
            }
        }
    }
}

function Generate-SecurityReport {
    $reportPath = Join-Path $LogPath "security-report-$(Get-Date -Format 'yyyy-MM-dd-HH-mm-ss').json"
    
    $report = @{
        timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
        server_info = @{
            version = "2.0.0"
            uptime = "N/A"
            port = $Port
            security_level = "enhanced"
        }
        statistics = @{
            total_requests = ($RequestCounters.Values | Measure-Object -Sum).Sum
            blocked_requests = $SecurityEvents.Count
            blocked_ips = $BlockedIPs.Count
            rate_limit_violations = $SecurityEvents.Where({ $_.type -eq "RATE_LIMIT_EXCEEDED" }).Count
        }
        security_events = $SecurityEvents
        blocked_ips = $BlockedIPs
        rate_limit_store = $RateLimitStore
    }
    
    try {
        $report | ConvertTo-Json -Depth 4 | Out-File -FilePath $reportPath -Encoding UTF8
        Write-Log "INFO" "Security report generated: $reportPath"
    } catch {
        Write-Log "ERROR" "Failed to generate security report: $_"
    }
}