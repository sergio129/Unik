Write-Host "🔍 Verificando conectividad a UNIKA App..." -ForegroundColor Green
Write-Host "================================================"

# 1. Ping básico
Write-Host "`n1. Ping a la IP:" -ForegroundColor Yellow
Test-Connection -ComputerName 191.108.173.181 -Count 4

# 2. Verificar puerto 3000
Write-Host "`n2. Verificando puerto 3000:" -ForegroundColor Yellow
$result = Test-NetConnection -ComputerName 191.108.173.181 -Port 3000
if ($result.TcpTestSucceeded) {
    Write-Host "✅ Puerto 3000 ABIERTO" -ForegroundColor Green
} else {
    Write-Host "❌ Puerto 3000 CERRADO" -ForegroundColor Red
}

# 3. Verificar puerto 80
Write-Host "`n3. Verificando puerto 80:" -ForegroundColor Yellow
$result80 = Test-NetConnection -ComputerName 191.108.173.181 -Port 80
if ($result80.TcpTestSucceeded) {
    Write-Host "✅ Puerto 80 ABIERTO" -ForegroundColor Green
} else {
    Write-Host "❌ Puerto 80 CERRADO" -ForegroundColor Red
}

# 4. Verificar conectividad HTTP
Write-Host "`n4. Verificando URL HTTP:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://191.108.173.181:3000" -Method Head -TimeoutSec 10
    Write-Host "✅ Respuesta HTTP: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error HTTP: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Verificación completada" -ForegroundColor Green