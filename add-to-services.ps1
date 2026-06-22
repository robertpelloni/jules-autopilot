$servicesFile = "$env:SystemRoot\System32\drivers\etc\services"
$entries = @"
# Jules Autopilot services
jules-backend		8082/tcp	# Jules Autopilot Go Backend
jules-freellm		4001/tcp	# FreeLLM Web Interface
jules-lmstudio		1234/tcp	# LM Studio Local LLM
"@

Add-Content -Path $servicesFile -Value "`r`n$entries" -Force
Write-Host "Added Jules entries to $servicesFile"
