#Include Settings & Functions
. "./resources/powershell/settings.ps1"
. "./resources/powershell/cmdlets.ps1"

#Get Current Version (Passes it to JS)
redcapVersion-toFile $settings;

#Copy Application Code
redCap-createBackup $settings;
redCap-copyUpgrade $settings;


