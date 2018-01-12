$settings = @{
    staging = @{
        application = 'redcap';
    }
    
    parsing = @{
        version = @{
            match = 'redcap_v'
        }
    };

    formatting = @{
        backup = @{
            name = 'redcap[DATE]-v[VERISON]'
        }
    };

    directories = @{
        live = '\\lsredcaptest\d$\inetpub\wwwroot\redcap';
        backup = '\\lsredcaptest\d$\inetpub\wwwroot\node\redcap_admin\output\backup';
        staging = '\\lsredcaptest\d$\temp\Staging';
        temp = '\\lsredcaptest\d$\inetpub\wwwroot\node\redcap_admin\temp'
    };

}