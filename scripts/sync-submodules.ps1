$ErrorActionPreference = "Stop"

Write-Host "Updating all submodules to latest remote..." -ForegroundColor Cyan
git submodule update --init --recursive --remote

$submodules = git config --file .gitmodules --get-regexp path | ForEach-Object {
    ($_.Split(' ')[1])
}

foreach ($sub in $submodules) {
    Write-Host "`nProcessing submodule: $sub" -ForegroundColor Yellow
    Push-Location $sub
    
    # Try to find default branch (main or master)
    $defaultBranch = "main"
    if (git branch -r | Select-String "origin/master") {
        $defaultBranch = "master"
    }

    Write-Host "  Checking out $defaultBranch and pulling..."
    git fetch origin
    git checkout $defaultBranch
    git pull origin $defaultBranch

    # Find local branches that aren't the default branch
    $localBranches = git branch --format="%(refname:short)" | Where-Object { $_ -ne $defaultBranch -and $_ -ne "HEAD" }
    
    foreach ($branch in $localBranches) {
        Write-Host "  Found local feature branch: $branch. Merging into $defaultBranch..." -ForegroundColor Green
        # Intelligently merge, keeping our changes on conflict if possible, but standard merge first
        git merge $branch -m "Merge feature branch '$branch' into $defaultBranch"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [!] Merge conflict in $sub for branch $branch. Aborting merge." -ForegroundColor Red
            git merge --abort
        }
    }

    # Push if there are changes
    $status = git status --short
    if ($status) {
        Write-Host "  Changes detected in $sub. Committing and pushing..." -ForegroundColor Magenta
        git add -A
        git commit -m "chore: sync and merge feature branches"
    }
    
    # Try pushing
    Write-Host "  Pushing to origin $defaultBranch..."
    git push origin $defaultBranch

    Pop-Location
}

Write-Host "`nGenerating submodule info JSON for dashboard..." -ForegroundColor Cyan
node scripts/get-submodule-info.js

Write-Host "Submodule sync complete!" -ForegroundColor Green
