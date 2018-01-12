function redCap-backupDirName($p_settings){    
    #Name Parts
    $version = (redCap-version $p_settings).name
    $date = (get-date -format 'yyyy-MM-dd');

    #Apply Vals to Template
    $dest = $p_settings.formatting.backup.name -replace '\[DATE\]', $date
    $dest = $dest -replace '\[VERISON\]', $version

    return ($p_settings.directories.backup + '\' + $dest);
}


function redCap-installedVersions($p_settings){
    $versions = dir $p_settings.directories.live  | select name, fullname | where {$_.name -match $p_settings.parsing.version.match} 
    $versions | % {$_.name = $_.name -replace $p_settings.parsing.version.match}

    return $versions; 
}


function redCap-version($p_settings){
    #Get Current RedCap Verison
    $versions = redCap-installedVersions $p_settings;

    return ($versions | sort -Property name -Descending)[0];
}

function redCap-upgradeDir($p_settings){
    return ((dir ($p_settings.directories.staging + '\' + $p_settings.staging.application))[0] | select fullname).fullname 
}

function redCap-copyUpgrade($p_settings){
    #Local Variables
    $upgradePath = (redCap-upgradeDir $p_settings); #Upgrade Location
    $newDir = ($upgradePath -split '\\' )[-1] #Name of Upgrade

    robocopy $upgradePath ($p_settings.directories.live + '\' + $newDir) /s  /NFL /NDL /NJH /NJS /nc /ns /np
}

function redCap-createBackup($p_settings){ 
    Copy-Item $p_settings.directories.live (redCap-backupDirName $p_settings) -Recurse
}

function redcap-expiredVersions($p_settings){
    $versions = (redCap-installedVersions $p_settings | sort -Property name -Descending | select name, fullname)
    return $versions[2 .. $versions.length]
}

function redcap-deleteExpiredVersions($p_settings){
    $expired = (redcap-expiredVersions $settings).fullname;
    $expired | % {
        remove-item $_ -Recurse; 
    }
}

function redcapVersion-toFile($p_settings){
    (redCap-version $p_settings).name | set-content ($p_settings.directories.temp + "\version.txt")
}
