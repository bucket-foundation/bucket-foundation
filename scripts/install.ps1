$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Repo = 'bucket-foundation/bucket-foundation'
$Name = 'bkt-windows-x64.exe'
$Signer = 'release@bucket.foundation'
$ReleasePubkey = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOxLPJ9aXCPCnxg+caf9yG5sBavpDE65sfeX66PkAQLs release@bucket.foundation'

function Fail($msg) { Write-Error "bkt install: $msg"; exit 1 }

function Fetch($src, $dest) {
  if ($src -like 'https://*') {
    $r = Invoke-WebRequest -UseBasicParsing -Uri $src -OutFile $dest -PassThru
    $final = if ($r.BaseResponse.ResponseUri) { $r.BaseResponse.ResponseUri } else { $r.BaseResponse.RequestMessage.RequestUri }
    if ($final -and $final.Scheme -ne 'https') { Fail "refusing a download that left https: $final" }
  }
  elseif ($src -like 'http://*') { Fail "refusing plain http: $src" }
  else { Copy-Item -LiteralPath $src -Destination $dest }
}

function Install-Bkt {
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
  if ($env:PROCESSOR_ARCHITECTURE -ne 'AMD64' -and $env:PROCESSOR_ARCHITEW6432 -ne 'AMD64') {
    Write-Warning "bkt install: only x64 builds exist; Windows on ARM runs them under emulation"
  }
  $base = $env:BKT_DOWNLOAD_BASE
  if (-not $base) {
    $tag = if ($env:BKT_VERSION) { 'bkt-v' + ($env:BKT_VERSION -replace '^bkt-v', '') } else {
      $releases = Invoke-RestMethod -UseBasicParsing -Uri "https://api.github.com/repos/$Repo/releases?per_page=30"
      ($releases | Where-Object { -not $_.draft -and -not $_.prerelease -and $_.tag_name -like 'bkt-v*' } | Select-Object -First 1).tag_name
    }
    if (-not $tag) { Fail 'could not find a bkt release; set BKT_VERSION' }
    $base = "https://github.com/$Repo/releases/download/$tag"
  }

  $work = Join-Path ([IO.Path]::GetTempPath()) ("bkt-" + [guid]::NewGuid())
  New-Item -ItemType Directory -Path $work | Out-Null
  try {
    foreach ($f in @($Name, "$Name.sha256", "$Name.manifest", "$Name.manifest.sig")) { Fetch "$base/$f" (Join-Path $work $f) }
    $bin = Join-Path $work $Name
    $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $bin).Hash.ToLowerInvariant()
    $listed = ((Get-Content -LiteralPath "$bin.sha256" -TotalCount 1) -split '\s+')[0].ToLowerInvariant()
    $manifest = @{}
    foreach ($line in Get-Content -LiteralPath "$bin.manifest") { $k, $v = $line -split '=', 2; $manifest[$k] = $v }
    if (-not $actual -or $actual -ne $listed -or $actual -ne $manifest['sha256']) { Fail "checksum mismatch for $Name" }
    if ($manifest['name'] -ne $Name) { Fail "manifest names $($manifest['name']), downloaded $Name" }
    if ([int64]$manifest['expires'] -le [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()) { Fail 'manifest expired; get a fresh release' }
    $sshKeygen = Get-Command ssh-keygen -ErrorAction SilentlyContinue
    if ($sshKeygen) {
      $allowed = Join-Path $work 'allowed_signers'
      Set-Content -LiteralPath $allowed -Value "$Signer namespaces=`"bucket-release`" $ReleasePubkey" -Encoding ascii
      $verifyArgs = @('-q', '-Y', 'verify', '-f', "`"$allowed`"", '-I', $Signer, '-n', 'bucket-release', '-s', "`"$bin.manifest.sig`"")
      $p = Start-Process -FilePath $sshKeygen.Source -ArgumentList $verifyArgs -RedirectStandardInput "$bin.manifest" -RedirectStandardOutput (Join-Path $work 'verify.out') -NoNewWindow -Wait -PassThru
      if ($p.ExitCode -ne 0) { Fail "signature check failed for $Name" }
    } else { Fail 'ssh-keygen is required to verify the release signature; add the OpenSSH Client optional feature and rerun' }

    $dir = if ($env:BKT_INSTALL_DIR) { $env:BKT_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA 'Programs\bkt' }
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $dest = Join-Path $dir 'bkt.exe'
    if ((Test-Path -LiteralPath $dest) -and $env:BKT_ALLOW_DOWNGRADE -ne '1') {
      $current = (& $dest --version 2>$null | Out-String).Trim()
      if ($current -match '^\d+\.\d+\.\d+$' -and ([version]$current -gt [version]$manifest['version'])) {
        Fail "refusing to replace bkt $current with older $($manifest['version']); set BKT_ALLOW_DOWNGRADE=1 to allow it"
      }
    }
    Copy-Item -LiteralPath $bin -Destination "$dest.new" -Force
    Move-Item -LiteralPath "$dest.new" -Destination $dest -Force

    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $parts = @($userPath -split ';' | Where-Object { $_ })
    if ($parts -notcontains $dir -and $env:BKT_NO_MODIFY_PATH -ne '1') {
      [Environment]::SetEnvironmentVariable('Path', (($parts + $dir) -join ';'), 'User')
      Write-Host "bkt install: added $dir to your user PATH; open a new terminal"
    }
    if (($env:Path -split ';') -notcontains $dir) { $env:Path = "$env:Path;$dir" }
    Write-Host "bkt install: installed $dest $($manifest['version'])"
  } finally {
    Remove-Item -Recurse -Force -LiteralPath $work -ErrorAction SilentlyContinue
  }
}

Install-Bkt
