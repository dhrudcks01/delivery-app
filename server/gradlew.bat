@echo off
where gradle >nul 2>&1
if %errorlevel% neq 0 (
  echo Gradle CLI is not installed. Install Gradle or run tests using a Gradle distribution.
  exit /b 1
)
gradle %*
