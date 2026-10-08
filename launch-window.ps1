# TASC IIoT Studio - Dedicated SCADA Window Launcher
# Polls localhost:3000 until the server is fully ready, then launches dedicated SCADA app window

$port = 3000
$url = "http://localhost:$port"

# Wait up to 25 seconds for the industrial server engine to bind port 3000
$retries = 50
$serverReady = $false

while ($retries -gt 0) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect('127.0.0.1', $port)
        $tcp.Close()
        $serverReady = $true
        break
    } catch {
        Start-Sleep -Milliseconds 500
        $retries--
    }
}

# Locate Chromium browser for dedicated App Window mode
$edgePath = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
$edgePath64 = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
$chromePath = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
$chromePath86 = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"

$browserExe = $null

if (Test-Path $edgePath) {
    $browserExe = $edgePath
} elseif (Test-Path $edgePath64) {
    $browserExe = $edgePath64
} elseif (Test-Path $chromePath) {
    $browserExe = $chromePath
} elseif (Test-Path $chromePath86) {
    $browserExe = $chromePath86
}

if ($browserExe) {
    # Launch in standalone App Window Mode with bezel-less fullscreen industrial display
    Start-Process -FilePath $browserExe -ArgumentList @("--app=$url", "--start-fullscreen")
} else {
    # Fallback to default browser
    Start-Process $url
}
