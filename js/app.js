/* Magic Mirror
 * The Core App (Server)
 *
 * By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */

var fs = require("fs");
var Server = require(__dirname + "/server.js");
var defaultModules = require(__dirname + "/../modules/default/defaultmodules.js");
var path = require("path");

// The next part is here to prevent a major exception when there
// is no internet connection. This could probable be solved better.
process.on("uncaughtException", function (err) {
	console.log("Whoops! There was an uncaught exception...");
	console.error(err);
	console.log("MagicMirror will not quit, but it might be a good idea to check why this happened. Maybe no internet connection?");
	console.log("If you think this really is an issue, please open an issue on GitHub: https://github.com/MichMich/MagicMirror/issues");
});

/* App - The core app.
 */
var App = function() {
	var nodeHelpers = [];

	/* loadConfig(callback)
	 * Loads the config file. combines it with the defaults,
	 * and runs the callback with the found config as argument.
	 *
	 * argument callback function - The callback function.
	 */

	var loadConfig = function(callback) {
		console.log("Loading config ...");
		var defaults = require(__dirname + "/defaults.js");
		var configFilename = path.resolve(__dirname + "/../config/config.js");
		try {
			fs.accessSync(configFilename, fs.F_OK);
			var c = require(configFilename);
			var config = Object.assign(defaults, c);
			callback(config);
		} catch (e) {
			console.error("WARNING! Could not find config. Please create one.");
			callback(defaults);
		}
	};

	/* loadModule(module)
	 * Loads a specific module.
	 *
	 * argument module string - The name of the module (including subpath).
	 */
	var loadModule = function(module) {

		var elements = module.split("/");
		var moduleName = elements[elements.length - 1];
		var moduleFolder =  __dirname + "/../modules/" + module;

		if (defaultModules.indexOf(moduleName) !== -1) {
			moduleFolder =  __dirname + "/../modules/default/" + module;
		}

		var helperPath = moduleFolder + "/node_helper.js";

		var loadModule = true;
		try {
			fs.accessSync(helperPath, fs.R_OK);
		} catch (e) {
			loadModule = false;
			console.log("No helper found for module: " + moduleName + ".");
		}

		if (loadModule) {
			var Module = require(helperPath);
			var m = new Module();
			m.setName(moduleName);
			m.setPath(path.resolve(moduleFolder));
			nodeHelpers.push(m);
		}
	};

	/* loadModules(modules)
	 * Loads all modules.
	 *
	 * argument module string - The name of the module (including subpath).
	 */
	var loadModules = function(modules) {
		console.log("Loading module helpers ...");

		for (var m in modules) {
			loadModule(modules[m]);
		}

		console.log("All module helpers loaded.");
	};

	/* start(callback)
	 * This methods starts the core app.
	 * It loads the config, then it loads all modules.
	 * When it"s done it executs the callback with the config as argument.
	 *
	 * argument callback function - The callback function.
	 */
	this.start = function(callback) {

		loadConfig(function(c) {
			config = c;

			var modules = [];

			for (var m in config.modules) {
				var module = config.modules[m];
				if (modules.indexOf(module.module) === -1) {
					modules.push(module.module);
				}
			}

			loadModules(modules);

			var server = new Server(config, function(app, io) {
				console.log("Server started ...");

				for (var h in nodeHelpers) {
					var nodeHelper = nodeHelpers[h];
					nodeHelper.setExpressApp(app);
					nodeHelper.setSocketIO(io);
					nodeHelper.start();
				}

				console.log("Sockets connected & modules started ...");

				if (typeof callback === "function") {
					callback(config);
				}

			});
		});
	};
};

module.exports = new App();

/*****************************************
MY ATEMPT AT UTILIZING RASPBERRY PI PINS
*****************************************/

/** setup(channel[,direction,edge],callback)
Set up the channel to read or write. MUST BE CALLED BEFORE THE CHANNEL CAN BE USED!
@param channel - the pin being used
@param direction - set pin to input or output (DIR_IN/DIR_OUT), default is outerHeight
@param edge - set interrupt mode to EDGE_NONE, EDGE_RISING, or EDGE_FALLING, default is none
@param callback - callback function that defines what to do with the channel. Passes an error as first argument in case of an error.
*/

/** read(channel,callback)
Reads the value on the channel
@param channel - the pin to read from
@param callback - Provides Error as the first argument if an error occured, otherwise the pin value boolean as the second argument.
*/

/** write(channel,value,[,callback])
Writes the value to the the channel.
@param channel - pin to write to
@param value - Boolean value to specify if whether the channel will turn on or off.
@param callback - Optional error handling function. Passes error as the first argument in case of an error.
*/

/** setMode(mode)
Sets the channel referencing mode to either Raspberry Pi or SoC/BCM schema
@param mode - mode for pin reference. Use MODE_RPI for raspberry pi or MODE_BCM for SoC/BCM, defaults to MODE_RPI
*/

/** destroy()
Removes ALL previously setup channels, making them unuseable until setup() is run for the channel
*/

/** EVENTS
"change" - emitted when the value of a channel has changed. Emits channel and value.
*/

/** A NOTE ON PINS!
There are 40 pins. Holding the raspberry pi so that the USB ports are facing to the right and pins are point up, the pins are as follows:

SoC/BCM Pin Numbering
  5v, 5v, G, 14, 15, 18,  G, 23,   24,  G, 25,  8, 7, EEPROM, G, 12, G, 16, 20, 21
3.3v,  2, 3,  4,  G, 17, 27, 22, 3.3v, 10,  9, 11, G, EEPROM, 5, 6, 13, 19, 26,  G

Raspberry Pi Numbering - NOTE: Despite all pins having a number, you must refer to the SoC/BCM numbering to determine what each pin is for. SoC/BCM numbered pins are IO pins.
2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40
1, 3, 5, 7,  9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39
*/

//ACTUAL CODE FOR USING PINS
/*
var io = require('rpi-gpio'); //reference gpio api to use the pins. This is required.

io.setup(7, io.DIR_IN, readPin); //runs setup for pin 7 in Raspberry Pi mode, runs readPin on immediately

//log the value of the pin, NOTE: This is doing nothing with the error, but since it is being passed, it must be a parameter
function readPin(){
	io.read(7, function(err, value) {
		console.log('Value read on pin: ' + value);
	});
};

//set up an event handler for when the value of a pin has changed
io.on('change', function(channel, value){
	console.log('Channel: ' + channel + ' has value: ' + value);
});

//set up pin 14 with an interrupt that fires on either positive or negative edge
io.setup(14, io.DIR_IN, io.EDGE_BOTH);
//set up pin 15 with an interrupt that fires on either positive or negative edge
io.setup(15, io.DIR_IN, io.EDGE_BOTH);

//Disables all currently setup pins.
//io.destroy();

//Disables all currently setup pins and runs the defined function.
//io.destroy(function(){
	console.log('Disabled all pins');
});
*/