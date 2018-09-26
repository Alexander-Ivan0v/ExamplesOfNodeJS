<#

CherWell

#>
$cw = $null;
$uri  =  "http://bat.cherwellondemand.com/CherwellService/?WSDL"
$login = “81251282”
$pass = “IrelandWales123”
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
                ToLog "Logged in";                ;
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
            if($ret) {ToLog "Logged out";}
            else {ToLog "Error while Logging out" -what 'error';}
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

function CompareArr {
    param($prev, $curr)
    
    $res = @()
    if($prev -ne $null -and $curr -ne $null) {
        foreach($c in $curr) {
            $found = $false;
            foreach($p in $prev) {
                if($c.RecId -eq $p.RecId) {$found = $true; break;}
            }
            if(!$found) {$res += $c.RecId}
        }
    }
    $res;
}

function ReadCfg($cfgFile) {
    try {
        if(Test-Path $cfgFile) {
            [xml]$res = (Get-Content($cfgFile));
            if($cfg.'configuration'.log -ne $null) {
                if(![string]::IsNullOrEmpty($cfg.'configuration'.log.file)) {
                    $logFile = $cfg.'configuration'.log.file;
                }
            }
            $res;
        }
        else {
            $null;
        }
    }
    catch{$null}
}

function ParseCfg($cfg) {
    $ret = $false;
    if($cfg -ne $null) {
        $config = 'configuration';
        if($cfg.$config.Groups.Grp.Count -gt 0) {
            foreach($g in $cfg.$config.Groups.Grp) {
                if($g -ne $null) {
                    if([string]::IsNullOrEmpty($g.Name) -or [string]::IsNullOrEmpty($g.Email)) {ToLog "There is no Name or Email defined for one of Groups" -what 'error'; return $false;}
                }
                else {ToLog "There is no definition for the one of Groups" -what 'error'; return $false;}
            }
            if(![string]::IsNullOrEmpty($cfg.$config.subject)) {
                if(![string]::IsNullOrEmpty($cfg.$config.subject.template)) {
                    if(![string]::IsNullOrEmpty($cfg.$config.sleep)) {
                        if(![string]::IsNullOrEmpty($cfg.$config.sleep.seconds -gt 0)) {
                            if(![string]::IsNullOrEmpty($cfg.$config.mail)) {
                                if(![string]::IsNullOrEmpty($cfg.$config.mail.from)) {
                                    if(![string]::IsNullOrEmpty($cfg.$config.smtp)) {
                                        if(![string]::IsNullOrEmpty($cfg.$config.smtp.server)) {
                                            if(![string]::IsNullOrEmpty($cfg.$config.sendstatus)) {
                                                if(![string]::IsNullOrEmpty($cfg.$config.sendstatus.seconds)) {
                                                    if(![string]::IsNullOrEmpty($cfg.$config.sendstatus.tomonitoring)) {
                                                        if(![string]::IsNullOrEmpty($cfg.$config.sendstatus.subjtemplate)) {
                                                            if(![string]::IsNullOrEmpty($cfg.$config.sendstatus.bodytemplate)) {
                                                                if(![string]::IsNullOrEmpty($cfg.$config.relogin)) {
                                                                    if(![string]::IsNullOrEmpty($cfg.$config.relogin.minutes)) {
                                                                        if(![string]::IsNullOrEmpty($cfg.$config.relogin.badCount)) {
                                                                            if(![string]::IsNullOrEmpty($cfg.$config.relogin.badTime)) {
                                                                                $ret = $true;
                                                                            }
                                                                            else {ToLog "Relogin is defined but badTime values is not" -what 'error';}
                                                                        }
                                                                        else {ToLog "Relogin is defined but badCount values is not" -what 'error';}
                                                                    }
                                                                    else {ToLog "Relogin is defined but Minutes values is not" -what 'error';}
                                                                }
                                                                else {ToLog "Relogin is undefined" -what 'error';}
                                                            }
                                                            else {ToLog "Sendstatus is defined but BodyTemplate values is not" -what 'error';}
                                                        }
                                                        else {ToLog "Sendstatus is defined but SubjTemplate values is not" -what 'error';}
                                                    }
                                                    else {ToLog "Sendstatus is defined but ToMonitoring values is not" -what 'error';}
                                                }
                                                else {ToLog "Sendstatus is defined but Seconds values is not" -what 'error';}
                                            }
                                            else {ToLog "Sendstatus is not defined" -what 'error';}
                                        }
                                        else {ToLog "Smtp section is defined but Server is not" -what 'error';}
                                    }
                                    else {ToLog "Smtp is not defined" -what 'error';}
                                }
                                else {ToLog "Mail section is defined but Email field is not" -what 'error';}
                            }
                            else {ToLog "Mail section is not defined" -what 'error';}
                        }
                        else {ToLog "Sleepseconds defined but its value is not" -what 'error';}
                    }
                    else {ToLog "Sleepseconds is not defined" -what 'error';}
                }
                else {ToLog "There is no subject temaplte defined" -what 'error';}
            }
            else {ToLog "Email subject is not defined" -what 'error';}
        }
        else {ToLog "There are no groups to monitor" -what 'error';}
    }
    else {ToLog "Configuration is not defined" -what 'error';}
    $ret;
}

function OrderKeys($qqq) {
    [string[]]$res = $null;

    if($qqq -ne $null) {
        for($i=0; $i -lt $qqq.Count; $i++) {
            foreach($q in $qqq.Keys) {
                if($qqq[$q].Order -eq $i) {$res += $q; break;}
            }
        }
        $res;
    }
    else {$null;}
}

function RelogonCycle {
    param($login, $pass)
    $cnt= 0; $dat = Get-Date; 
    do {
        $qqq = $null;
        try {
            ToLog "Performing relogon..."
            $qqq = Relogon -login $login -pass $pass
            if($qqq -eq $null) {
                $tmpErr = "Error while doing relogon"; 
                if($Error.Count -gt 0) {
                    $tmpErr = "RelogonCycle: [$($Error[0].Exception.ToString())]"
                } 
                throw $tmpErr
            }
        }
        catch {
            ToLog $_ -what error
            $Error.Clear();
            ToLog "Pause between relogon attempts for [$($cfg.configuration.relogin.badPause)] seconds..." -what warning
            Sleep $cfg.configuration.relogin.badPause;            
        }
        finally {$cnt++; }
    } until ($qqq -eq $null -or $cnt -le $cfg.configuration.relogin.badCount -or ((Get-Date) - $dat).TotalSeconds -le $cfg.configuration.relogin.badTime)
    $qqq;
}

function Relogon {
    param($login, $pass)
    if(Logout) {
        $qqq= Prepare($uri);
        if($qqq -ne $null) {
            if(Login -login $login -pass $pass) {
                $qqq
            }
            else {$null}
        }
        else {$null}
    }
    else {$null}
}

function SendEmail {    
    param($email, $data, $Grp)

    try {
        if($data -ne $null) {
            $body = $cfg.$config.BodyTemplate;
            $subj = $cfg.$config.subject.template;

            $subj = $subj.Replace('{DateTime}', (Get-Date).ToString('dd.MM.yyyy HH:mm')).Replace('{Date}', (Get-Date).ToString('dd.MM.yyyy')).Replace('{Group}', $Grp);

            $body = $body.Replace('[','<').Replace(']','>').Replace('{DateTime}', (Get-Date).ToString('dd.MM.yyyy HH:mm')).Replace('{Date}', (Get-Date).ToString('dd.MM.yyyy')).Replace('{Group}', $Grp);
            
            $orderedKeys = OrderKeys($weNeedThisFields);
            $qqq = "<tr>";
            foreach($key in $orderedKeys) {
                $qqq += "<th>$($weNeedThisFields[$key].Caption)</th>";
            }
            $qqq += '</tr>';
            foreach($d in $data) {
                $qqq += "<tr>"
                foreach($key in $orderedKeys) {
                    $www = $d[$key];
                    if(![string]::IsNullOrEmpty($www)) {$www.ToString().Replace("`r",'<br>').ToString().Replace("`n",'<br>')}
                    $val = $d[$key];
                    if($key -eq 'Priority') {
                        $val = "Priority_$val";
                    }
                    if($key -eq 'OwnedBy') {
                        if([string]::IsNullOrEmpty($val)) {$val = 'NOT_OWNED'}
                    }
                    $qqq += "<td>$val</td>";
                }
                $qqq += '</tr>';
            }
             $body = $body.Replace('{TableBody}',$qqq);
            if([bool]::Parse($cfg.'configuration'.monitoring.sendaswellasgrp)) {
                $email += ",$($cfg.'configuration'.monitoring.email)";
            }
            $to = $email.split(',');
            if($to.Count -gt 0) {
                for($i=0; $i -lt $to.Count; $i++) {$to[$i] = $to[$i].trim()}
                #Send-MailMessage -From $cfg.$config.Mail.From -To $to -SmtpServer $cfg.$config.Smtp.Server -Subject $subj -Body $body -BodyAsHtml -Encoding UTF8
                Send-Email -From $cfg.$config.Mail.From -To $to -Subject $subj -Body $body -Server $cfg.configuration.smtp.server
            }
                else { ToLog "There are no recipients to send information to" -what 'error'
            }
            #$body > 'E:\TEMP\Cherwell\1.html'
            $true;
        }
        else {ToLog "Nothing to send. there is no any data" -what 'warning'; $false;}
    }
    catch{
        ToLog "There is a fatal error during Send E-Mail for a Group [$Grp]: [$($error[0].Exception.ToString())]" -what 'error'
        $false;
    }
}

function SaveLastData($prev) {
    $prev | Export-Clixml $idsFile;
}

function ReadLastData {
    Import-Clixml $idsFile;
}

Function Send-Email
{
    param ([string] $server, [object] $from, [object] $to, [object]$cc=$null, [string] $subject, [string] $body)
    try
    {
    <#
         $msg = new-object Net.Mail.MailMessage
         $smtp = new-object Net.Mail.SmtpClient($server)

         [System.Net.Mail.MailAddress]$addrFrom = New-Object System.Net.Mail.MailAddress($from,'Cherwell Tickets Monitor')         
         $msg.From = $addrFrom
         $msg.ReplyTo = $addrFrom
         foreach($t in $to)
         {
            if(![string]::IsNullOrEmpty($t)) {
                [System.Net.Mail.MailAddress]$addrTo = New-Object System.Net.Mail.MailAddress($t)
                $msg.To.Add($addrTo)
            }
         }
         if ($cc -ne $null)
         {
             foreach($c in $cc)
             {
                if(![string]::IsNullOrEmpty($c)) {
                    [System.Net.Mail.MailAddress]$addrCc = New-Object System.Net.Mail.MailAddress($c)
                    $msg.Cc.Add($addrCc)
                }
             }
         }

         $msg.subject = $subject
         $msg.body = $body

         $msg.IsBodyHtml = $true;
         $smtp.Send($msg)
         #>
     }
     catch
     {
        ToLog "Error while sending e-mail $($_)" -what error
        $Error.Clear();
     }
}


function SendLastStatus {
    $currDate = Get-Date;
    if([int]::Parse($cfg.configuration.sendstatus.seconds) -gt 0 -and ($lastStatusSent -eq $null -or ($currDate - $lastStatusSent).TotalSeconds -ge [int]::Parse($cfg.configuration.sendstatus.seconds))) {
        $to = ''; $email = '';
        if([int]::Parse($cfg.configuration.sendstatus.seconds) -gt 0) {
            if([string]::IsNullOrEmpty($cfg.configuration.sendstatus.email)) {
                $email += ",$($cfg.configuration.sendstatus.email)";
            }
            if($cfg.configuration.sendstatus.toMonitoring) {
                if(![string]::IsNullOrEmpty($cfg.configuration.monitoring.email)) {
                    $email += $cfg.configuration.monitoring.email;
                }
            }
            $to = $email.split(',');
            for($i=0; $i -lt $email.Count; $i++) {$to[$i] = $to[$i].trim(); $to = $to | ?{![string]::IsNullOrEmpty($_);}}
            if($to.Count -gt 0) {
                $subj = $cfg.configuration.sendstatus.subjtemplate.Replace('{Date}',(Get-Date).ToString('dd.MM.yyyy')).Replace('{DateTime}',(Get-Date).ToString('dd.MM.yyyy HH:mm'));
                $body = $cfg.configuration.sendstatus.bodytemplate.Replace('[', '<').Replace(']','>').Replace('{Date}',(Get-Date).ToString('dd.MM.yyyy')).Replace('{DateTime}',(Get-Date).ToString('dd.MM.yyyy HH:mm'));
                #Send-MailMessage -From $cfg.$config.Mail.From -To $to -SmtpServer $cfg.$config.Smtp.Server -Subject $subj -Body $body -BodyAsHtml -Encoding UTF8
                Send-Email -From $cfg.$config.Mail.From -To $to -Subject $subj -Body $body -Server $cfg.configuration.smtp.server
            }
        }
        $lastStatusSent = Get-Date;
        $true;
    }
    else {$false;}
}


$loggedIn = $false;
$Error.Clear();
$weNeedThisFields = @{
    'IncidentID'=(New-Object PSObject -Property @{FieldName='IncidentID'; Caption='ID'; TemplateName='IncId'; IsDateTime=$false; Order=3});
    'Status'=(New-Object PSObject -Property @{FieldName='Status'; Caption='Status'; TemplateName='Status'; IsDateTime=$false; Order=8});
    'Description'=(New-Object PSObject -Property @{FieldName='Description'; Caption='Description'; TemplateName='Descr'; IsDateTime=$false; Order=0});
    'SLAResolveByDeadline'=(New-Object PSObject -Property @{FieldName='SLAResolveByDeadline'; Caption='SLA Resolve By Deadline'; TemplateName='SLAResolveByDeadline'; IsDateTime=$true; Order=6});
    'IncidentType'=(New-Object PSObject -Property @{FieldName='IncidentType'; Caption='Type'; TemplateName='Type'; IsDateTime=$false; Order=2});
    'OwnedByTeam'=(New-Object PSObject -Property @{FieldName='OwnedByTeam'; Caption='Owned By Team'; TemplateName='Team'; IsDateTime=$false; Order=4});
    'CreatedDateTime'=(New-Object PSObject -Property @{FieldName='CreatedDateTime'; Caption='Date Logged'; TemplateName='Created'; IsDateTime=$true; Order=5});
    'BATOLAResolutionWarning'=(New-Object PSObject -Property @{FieldName='BATOLAResolutionWarning'; Caption='BAT - OLA Resolution Warning'; TemplateName='BATOLAResolutionWarning'; IsDateTime=$true; Order=1});
    'CustomerDisplayName'=(New-Object PSObject -Property @{FieldName='CustomerDisplayName'; Caption='Customer Name'; TemplateName='CustomerName'; IsDateTime=$false; Order=7});
    'Priority'=(New-Object PSObject -Property @{FieldName='Priority'; Caption='Priority'; TemplateName='Priority'; IsDateTime=$false; Order=9});
    'OwnedBy'=(New-Object PSObject -Property @{FieldName='OwnedBy'; Caption='Owned By'; TemplateName='OwnedBy'; IsDateTime=$false; Order=10});
};
;

try {
    $prev = $null;
    $scriptpath = Split-Path -parent $MyInvocation.MyCommand.Definition
    $cfgFile = $(Join-Path -Path $scriptpath -ChildPath $([System.IO.Path]::GetFileNameWithoutExtension($MyInvocation.MyCommand.Definition) + ".cfg"));
    $idsFile = $(Join-Path -Path $scriptpath -ChildPath $([System.IO.Path]::GetFileNameWithoutExtension($MyInvocation.MyCommand.Definition) + ".ids"));
    Set-Variable logFile $(Join-Path -Path $scriptpath -ChildPath $([System.IO.Path]::GetFileNameWithoutExtension($MyInvocation.MyCommand.Definition) + ".log")) -Scope Global -Option AllScope;
    Set-Variable lastStatusSent $null -Scope Global -Option AllScope;
    Set-Variable lastLogin $null -Scope Global -Option AllScope;
    $atLeastOneFound = $fale;
    $cfg = ReadCfg($cfgFile);
    if($cfg -ne $null) {
        if(ParseCfg($cfg)) {
            $config = 'configuration';
            SendLastStatus | Out-Null;
            $cw = Prepare($uri);
            if($cw -ne $null -and $Error.Count -eq 0) {
                ToLog("Preparation done");
                if(Login -login $login -pass $pass) {
                    $loggedIn = $true;                    

                    # Preparation for work in cycle
                    $prev = @{};
                    if([bool]::Parse($cfg.$config.uselastsaved.Value) -and (Test-Path $idsFile)) {
                        $prev = ReadLastData;
                    }
                    else {                    
                        foreach($c in $cfg.$config.Groups.Grp) {
                            $tickets = GetTicketsForTeam($c.Name);
                            if($tickets -ne $null) {$prev.Add($c.Name, ($tickets | select RecId))}
                            else {$prev.Add($c.Name, $null)}
                        }
                    }
                    

                    while(1 -eq 1) {
                        $atLeastOneFound = $fale;
                        if(((Get-Date) - $lastLogin).TotalMinutes -gt $cfg.configuration.relogin.minutes) {
                            ToLog "Relogging..."
                            $cw = RelogonCycle -login $login -pass $pass;
                            if($cw -eq $null) {throw "There is Fatal error during Relogin"}
                            ToLog "Done..."
                        }
                        foreach($c in $cfg.$config.Groups.Grp) {
                            $tickets = GetTicketsForTeam($c.Name);
                            if($tickets -ne $null) {$atLeastOneFound = $true; $currTickets = ($tickets | select RecId)}
                            else {$currTickets = $null;}
                            if($currTickets -ne $null) {
                                ########################
                                if($prev[$c.Name].count -ge 2) {
                                    $prev[$c.Name][0] = 'ddd';
                                    $prev[$c.Name][1] = 'aaa';
                                }
                                #######################
                                $diff = CompareArr -prev $prev[$c.Name] -curr $currTickets
                                if($diff -ne $null -or $diff.Count -gt 0) {
                                    ToLog "Found new ticket(s) for Group [$($c.Name)]";
                                    $total = @();                                
                                    foreach($id in $diff) {
                                        $data = $null;
                                        ToLog "Getting information about [$id]"
                                        $ticket = GetTicket($id);
                                        ToLog "Got info"
                                        if($ticket -ne $null) {
                                            foreach($t in $ticket) {
                                                if($weNeedThisFields[$t.Name] -ne $null) {
                                                    if($weNeedThisFields[$t.Name].IsDateTime) {
                                                        $qqq = Get-Date($t.'#text');
                                                    }
                                                    else {$qqq = $t.'#text';}
                                                    if($data -ne $null) {$data.Add($t.Name, $qqq);}
                                                    else {$data = @{$t.Name=$qqq;}}
                                                }
                                            }
                                            $total += $data;
                                        }
                                        else {
                                            ToLog "Found that there is a ticket with ID [$id] is new one, but when we try to get its info, we've got nothing." -what 'warning'
                                        }
                                    }
                                    if(SendEmail -email $c.Email -data $total -Grp $c.Name) {
                                        ToLog "E-mail to [$($c.Name)] was sent."
                                    }
                                    else {
                                        ToLog "E-mail to [$($c.Name)] was not sent." -what 'error'
                                    }
                                }
                                else {ToLog "There are no new tickets found for the group [$($c.Name)]"} 
                                $prev[$c.Name] = $currTickets;
                                SaveLastData($prev);
                            }
                            else {
                                ToLog "There are no tickets found for the group [$($c.Name)] at all"
                            }
                        }
                        SendLastStatus | Out-Null;
                        if(!$atLeastOneFound) {
                            ToLog "No tickets for all groups... it is strange..." -what 'warning';
                            ToLog "Relogging..."
                            $cw = RelogonCycle -login $login -pass $pass;
                            if($cw -eq $null) {throw "There is Fatal error during Relogin"}
                            ToLog "Done..."
                        }
                        ToLog "Will do nothing $($cfg.$config.Sleep.Seconds) seconds..."
                        Sleep($cfg.$config.Sleep.Seconds);
                    }
                }
                else {
                    ToLog "Can not log in with a given Credential" -what 'Error'
                }
            }
        }
        else {ToLog "Configuration file present, but contains wrong data. [$cfgFile]. Exiting" -what 'fatal'}
    }
    else {ToLog "Can not read CFG-file. You should make sure it is present and accessible. [$cfgFile]. Exiting" -what 'fatal'}

    if($Error.Count -gt 0) {
        foreach($e in $Error) {
            ToLog $e.ToString() -what 'error';
        }
    }
}
catch [Exception] {
    ToLog "There is a fatal error: [$($error[0].Exception.ToString())]. Program terminated. I'm so embarassed. I wish everybody else was dead." -what 'fatal'
}
finally {
    if($loggedIn) {Logout | Out-Null}
}