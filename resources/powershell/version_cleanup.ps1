#Include Settings
. "./resources/powershell/settings.ps1"
. "./resources/powershell/cmdlets.ps1"

#Cleanup App Code
redcap-deleteExpiredVersions $settings;