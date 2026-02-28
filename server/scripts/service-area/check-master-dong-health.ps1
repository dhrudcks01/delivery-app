param(
    [Parameter(Mandatory = $true)]
    [string]$DbUser,
    [Parameter(Mandatory = $true)]
    [string]$DbName,
    [string]$DbHost = "127.0.0.1",
    [int]$DbPort = 3306
)

$minTotal = if ($env:SERVICE_AREA_MASTER_MIN_TOTAL) { [int]$env:SERVICE_AREA_MASTER_MIN_TOTAL } else { 3000 }
$minCity = if ($env:SERVICE_AREA_MASTER_MIN_CITY) { [int]$env:SERVICE_AREA_MASTER_MIN_CITY } else { 17 }

$query = "SELECT COUNT(*) AS total_count, SUM(CASE WHEN is_active THEN 1 ELSE 0 END) AS active_count, COUNT(DISTINCT city) AS city_count, COUNT(DISTINCT CONCAT(city, '|', district)) AS district_count FROM service_area_master_dongs;"
$result = mysql -N -s -h $DbHost -P $DbPort -u $DbUser $DbName -e $query

if (-not $result) {
    Write-Error "점검 쿼리 실행 결과가 비어 있습니다."
    exit 1
}

$parts = $result -split "\s+"
if ($parts.Length -lt 4) {
    Write-Error "점검 결과 파싱에 실패했습니다: $result"
    exit 1
}

$totalCount = [int]$parts[0]
$activeCount = [int]$parts[1]
$cityCount = [int]$parts[2]
$districtCount = [int]$parts[3]

Write-Host "service_area_master_dongs 점검 결과"
Write-Host "- total_count: $totalCount"
Write-Host "- active_count: $activeCount"
Write-Host "- city_count: $cityCount"
Write-Host "- district_count: $districtCount"
Write-Host "- threshold_total: $minTotal"
Write-Host "- threshold_city: $minCity"

$failed = $false
if ($totalCount -lt $minTotal) {
    Write-Host "[FAIL] total_count가 최소 기준보다 작습니다."
    $failed = $true
}
if ($cityCount -lt $minCity) {
    Write-Host "[FAIL] city_count가 최소 기준보다 작습니다."
    $failed = $true
}

if ($failed) {
    Write-Host "조치: docs/dev/service-area-master-sync.md 절차로 전체 데이터 재적재를 수행하세요."
    exit 2
}

Write-Host "[PASS] 마스터 데이터 최소 기준을 충족합니다."
