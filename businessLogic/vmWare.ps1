$url = "https://vcloud.russia.local"
$login = 'ivanova3';
$pass = 'Wh0C@res8';
$body = @"
<?xml version="1.0" encoding="UTF-8"?>
    <vcloud:LeaseSettingsSection xmlns:ovf="http://schemas.dmtf.org/ovf/envelope/1" 
        xmlns:vcloud="http://www.vmware.com/vcloud/v1.5"
        href="https://vcloud.example.com/api/vApp/vapp-{appId}/leaseSettingsSection/"
        ovf:required="false"
        type="application/vnd.vmware.vcloud.leaseSettingsSection+xml">
    <ovf:Info>Lease settings section</ovf:Info>
    <vcloud:Link
        href="https://vcloud.example.com/api/vApp/vapp-{appId}/leaseSettingsSection/"
        rel="edit"
        type="application/vnd.vmware.vcloud.leaseSettingsSection+xml"/>
    <vcloud:DeploymentLeaseInSeconds>604800</vcloud:DeploymentLeaseInSeconds>
    <vcloud:StorageLeaseInSeconds>2592000</vcloud:StorageLeaseInSeconds>
    </vcloud:LeaseSettingsSection>
"@;
$prolongeLeaseUri = '/api/vApp/vapp-{appId}/leaseSettingsSection/';

$auth = @{path = '/api/sessions'; method = 'POST'; accept = 'application/*+xml;version=5.5'; body = $null; Cookie = $null; Response = $null;};
$allVapp = @{path = '/api/query?type=vApp'; method = 'GET'; accept = 'application/*+xml;version=5.5'; body = $null; Cookie = $null; Response = $null;};
$vApp = @{path = '/api/vApp/vapp-{vAppId}'; method = 'GET'; accept = 'application/*+xml;version=5.5'; body = $null; Cookie = $null; Response = $null;};
$vAppLeaseSection = @{path = $prolongeLeaseUri; method = 'PUT'; accept = 'application/*+xml;version=1.5'; body = $body; Cookie = $nulll; Response = $null;};

function log {
    param($msg)

    "[$(Get-Date)] $msg"
}

function Go {
    param(
        $url ,$obj
    )

    $web = [System.Net.WebRequest]::Create($url + $obj.path)    
    $web.Method = $obj.method;
    $web.Accept = $obj.accept;    
    if($obj.Cookie) {
        if(!$web.CookieContainer) {$web.CookieContainer = New-Object System.Net.CookieContainer}
        $qqq = $obj.Cookie.split(';');
        $web.CookieContainer.SetCookies((New-Object System.Uri($url)), $obj.Cookie);
    } else {$web.Headers.Add("Authorization","Basic "+[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("$login@is" +":" + $pass)));}

    if($obj.method -ne 'GET') {
        if(![string]::IsNullOrEmpty($obj.body)) {
            $bytes = [System.Text.Encoding]::ASCII.GetBytes($obj.body)
        } else {$bytes = @();}
        $web.ContentLength = $bytes.Length    
        $stream = $web.GetRequestStream()
        $stream.Write($bytes,0,$bytes.Length)
        $stream.Close()
        $stream.Dispose();
    }

    $reader = New-Object System.IO.Streamreader -ArgumentList $web.GetResponse().GetResponseStream()
    $obj.Response = [xml]$reader.ReadToEnd();
    $reader.Close();
    $reader.Dispose();

    if(![string]::IsNullOrEmpty($web.GetResponse().Headers['Set-Cookie'])) {
        $allVapp.Cookie = $web.GetResponse().Headers['Set-Cookie'];
        $vApp.Cookie = $web.GetResponse().Headers['Set-Cookie'];
        $vAppLeaseSection.Cookie = $web.GetResponse().Headers['Set-Cookie'];
    }
}

function GetVApps {
    param (
        $xml
    )

    $ret = @();
    if(![string]::IsNullOrEmpty($xml) -and ![string]::IsNullOrEmpty($xml.QueryResultRecords)) {
        foreach($rec in $xml.QueryResultRecords) {
            $ret += New-Object PSObject -Property @{Id=$rec.VAppRecord.href.Replace("$($url)/api/vApp/vapp-",""); Name=$rec.VAppRecord.Name; Owner=$rec.VAppRecord.ownerName; Status=$rec.VAppRecord.Status; };
        }
    }
    $ret;
}

log "Logging in..."
Go -url $url -obj $auth
log "Logged in."

log "Get my VApps..."
Go -url $url -obj $allVapp
$allMyvApps = GetVApps -xml $allVapp.Response
log "VApps got."

log "Refreshing lease for all..."
foreach($vApp in $allMyvApps) {
    log "Renewing [$($vApp.Name)]..."
    $vAppLeaseSection.body = $vAppLeaseSection.body.Replace('{appId}', $vApp.Id);
    $vAppLeaseSection.path = $prolongeLeaseUri.Replace('{appId}', $vApp.Id);
    Go -url $url -obj $vAppLeaseSection
    if(![string]::IsNullOrEmpty($vAppLeaseSection.Response)) {
        log "[$($vApp.Name)] [$($vAppLeaseSection.Response.Task.User.name)] [$($vAppLeaseSection.Response.Task.Owner.name)] [$($vAppLeaseSection.Response.Task.Organization.name)]"
    }
    log "[$($vApp.Name)] done"
}
log "Done."