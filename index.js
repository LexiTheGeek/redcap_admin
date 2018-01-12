//Constants
const shell = require('node-powershell')

//Imports
var fs = require("fs");
var merge = require('merge');
var mysql = require('mysql');
var mysqlDump = require('mysqldump');
var rp = require('request-promise');
var cheerio = require('cheerio'); // Basically jQuery for node.js
var ps = new shell();

var files = {
	version : "D:/inetpub/wwwroot/node/redcap_admin/temp/version.txt"
	
}

 //Backup Destinations
 var output = {
		backup : {
			sql : "./output/backup/database.sql"
		}
	 }
 
//Connection Information
var connections = {
	redcap : {
		host				: "lsredcapdbtst01.lsmaster.lifespan.org",
		user				: "redcapuser",
		password			: "@sagan",
		database 			: "redcap"
	}
};

//URL Requests
var requests = {
	login : {
		captureHiddenElements : {
			uri: 'http://lsredcaptest.lifespan.org/redcap/',
			transform : function(body){
				return cheerio.load(body);
			}
		},
		auth : {
			method : 'POST',
			uri: 'http://lsredcaptest.lifespan.org/redcap/',
			formData: {
				username : 'Alexia.Hurley',
				password : 'redcapAdmin1'
			},
			followAllRedirects : true,
			jar : true
		}
	},
	system_status : {
		captureElements : {
			uri : "http://lsredcaptest.lifespan.org/redcap/redcap_v[VERSION]/ControlCenter/general_settings.php",
			jar : true,
			transform : function(body){
				return cheerio.load(body);
			}
		},
		toggle : {
			method : 'POST',
			uri : "http://lsredcaptest.lifespan.org/redcap/redcap_v[VERSION]/ControlCenter/general_settings.php",
			formData : {}, 
			jar : true
			
		}		
	},
	database : {
		upgrade : {
			method : 'GET',
			uri : 'http://lsredcaptest.lifespan.org/redcap/redcap_v[VERSION]/upgrade.php',
			jar : true,
			transform : function(body){
				return cheerio.load(body);
			}
		}
	}
};

var version = '';


/****************************************************************************************************************************/

//Backup Database
mysqlDump( merge(connections.redcap, {dest : output.backup.sql}) )

/****************************************************************************************************************************/

//Backup Application Code
ps.addCommand('D:/inetpub/wwwroot/node/redcap_admin/resources/powershell/upgrade_app_code.ps1');

//Capture Current Version
ps.invoke().then(function(){
	//Get Current Version
	version = fs.readFileSync(files.version, 'utf8');

	//Update Paths With Version
	requests.system_status.captureElements.uri = requests.system_status.captureElements.uri.replace('[VERSION]', version);
	requests.system_status.toggle.uri = requests.system_status.toggle.uri.replace('[VERSION]', version);
}).then(function(){
	ps.dispose().then(function(){
		
		//Login: Capture Hidden Elements
		rp(requests.login.captureHiddenElements)
			.then(function ($) {
				//Local Variables
				l_hidden = {};
			   
				//Capture Key-Val of Hidden Fields
				$("#left_col form input[type='hidden']").each(function(){
					l_hidden[$(this).attr("name")] = $(this).val();
				})		
				
				//Update auth formData
				Object.assign(requests.login.auth.formData, l_hidden) 
			})
			.then(function(){
				
				//Login: Attempt Login
				rp(requests.login.auth) //jar=true will save cookies for remaining requests
					
					//Success
					.then(function(){
						
						//System Status: Capture Elements
						rp(requests.system_status.captureElements)
							
							//Capture Key-Val of Hidden Fields & 'system_offline'. Toggle system_offline val
							.then(function($){
								//Local Variables
								l_fields = {};
								
								//Save Hidden
								$('#form input[type="hidden"]').each(function(){
									l_fields[$(this).attr("name")] = $(this).val();
								})		
								
								//Save Offline Status
								l_fields['system_offline'] = 1;
								
								//Update system_status.toggle.formData
								Object.assign(requests.system_status.toggle.formData, l_fields) 
								
							})
							.then(function(){
								//System Status: Toggle Status (Switches to Offline)
								rp(requests.system_status.toggle)
								
									//Upgrade Database
									.then(function(){
										
										//CALL POWERSHELL to GET NEW REDCAP Version
										ps.addCommand('D:/inetpub/wwwroot/node/redcap_admin/resources/powershell/capture_redcap_version.ps1');
										
										ps.invoke().then(function(){
											//Get Current Version
											version = fs.readFileSync(files.version, 'utf8');

											//Update Paths With Version
											requests.database.upgrade.uri = requests.system_status.captureElements.uri.replace('[VERSION]', version);
										}).then(function(){
											ps.dispose().then(function(){
												
												//Database: Capture Upgrade SQL
												rp(requests.database.upgrade) 
													.then(function($){
														
														//Connect to DB
														var connection = mysql.createConnection( merge(connections.redcap, {multipleStatements : true}) ); 
														
														//Perform Update
														connection.query($("textarea").first().text(), function(err, results, fields){})
														
														//End Connection
														connection.end()
													
													}).then(function(){
														//Switch to Online Mode
														//System Status: Capture Elements
														rp(requests.system_status.captureElements)
															
															//Capture Key-Val of Hidden Fields & 'system_offline'. Toggle system_offline val
															.then(function($){
																//Local Variables
																l_fields = {};
																
																//Save Hidden
																$('#form input[type="hidden"]').each(function(){
																	l_fields[$(this).attr("name")] = $(this).val();
																})		
																
																//Save Offline Status
																l_fields['system_offline'] = 0;
																
																//Update system_status.toggle.formData
																Object.assign(requests.system_status.toggle.formData, l_fields) 
																
															})
															.then(function(){
																//System Status: Toggle Status (Switches to Online)
																rp(requests.system_status.toggle)
															})
														
													})
											})
										})										
									})
							})
					})
			})		
	})
//Cleanup Old Application Code	
}).then(function(){
	ps.addCommand('D:/inetpub/wwwroot/node/redcap_admin/resources/powershell/version_cleanup.ps1');
	
	ps.invoke().then(function(){
		ps.dispose().then(function(){
			
		})
	})
});