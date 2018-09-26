$cw = $null;
$uri  =  "http://bat.cherwellondemand.com/CherwellService/?WSDL"
$login = "12345678"
$pass = "0987654321"
$html = '';

function ToLog {
    param(
        [parameter(Mandatory=$true, position=0)]$msg,
        [parameter(Mandatory=$false, position=1)][ValidateSet("info", "warning", "error", "fatal")][string]$what = "info"        
    )
    $dat = Get-Date;
    switch($what) {
        "info" {
            Write-Host "[$dat] $msg";
        }
        "warning" {
            Write-Host "[$dat] $msg" -ForegroundColor yellow
        }
        "error" {
            Write-Host "[$dat] $msg" -ForegroundColor Red
        }
        "fatal" {
            Write-Host "[$dat] $msg Program will be stopped." -ForegroundColor Cyan
        }
    }
    try {
        if($logFile -ne $null) {
            $parent = Split-Path $logFile
            if(!(test-Path $parent)) {md $parent}
            "[$dat] [$($what.ToUpper())] $msg" >> $logFile
        }
    }
    catch {Write-Host "[$dat] $msg" -ForegroundColor Red}
}

function Prepare() {
    param($uri)
    try {
        $cherwellService  =  New-WebServiceProxy  -Uri $uri
        $cherwellService.CookieContainer =  New-Object  system.net.CookieContainer
        return $cherwellService;
    }
    catch {}
}

function Login {
    param($login, $pass)
    try {
        if($cw -ne $null) {
            $ret = $cw.Login($login, $pass);
            if($ret) {
                $lastLogin = Get-Date;
                #ToLog "Logged in";                ;
            }
            else {ToLog "Error while Logging in" -what 'error';}
            $ret;
        }
        else {
            return $false;
        }
    }
    catch {}
}

function Logout() {
    try {
        if($cw -ne $null) {
            $ret = $cw.Logout();
            if($ret) {<#ToLog "Logged out";#>}
            else {<#ToLog "Error while Logging out" -what 'error';#>}
            $ret;
        }
        else {
            return $false;
        }
    }
    catch {}
}

function GetTicketsForTeam($team) {
    try {
        if($cw -ne $null) {
            $res = [xml]$cw.QueryByFieldValue("Incident" ,  "OwnedByTeam" ,  $team);
            if($res -ne $null) {$res.CherwellQueryResult.Record;}
            else {return $null;}
        }
        else {
            return $false;
        }
    }
    catch {}
}

function GetTicket($id) {
    try {
        if($cw -ne $null) {
            $res = [xml]$cw.GetBusinessObject('Incident', $id, $true);
            if($res -ne $null) {$res.BusinessObject.FieldList.Field;}
            else {return $null;}
        }
        else {
            return $false;
        }
    }
    catch {}
}



$Error.Clear(); 
$res = New-Object PSObject -Property @{message = 'ok'; loggedIn = $false; data = $null;};
try {
        $cw = Prepare($uri);
        if($cw -ne $null) {
	        if(Login -login $login -pass $pass) {
                $res.loggedIn = $true;
                $res.data = GetTicketsForTeam('WINDOWS 10 SCCM Support');
                                   
            }
            else {$res.loggedIn = $false; $res.message = 'Can`t log in.';}
        }
        else {$res.loggedIn = $false; $res.message = 'Can`t prepare connection';}
} 
catch{
	$res.message = $Error[0].Message;
}
finally {    
    if($res.loggedIn) {Logout | Out-Null}
    $res | convertto-json;
}