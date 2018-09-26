module.exports = new Ps();

function Ps() {
    var self = this;

    this._myModuleName = 'PS';
    this.moduleName = function() { return self._myModuleName; };
    this.const = null;
    this._common = null;
    this._cfg = null;
    this._ps = null;
    this._callback = null;
    this._param = null;
    this._output = null;
    this._error = null;
    this.getLogLevel = null;
    // PowerShell
    this._shell = require('powershell');
    this.init = function(constModule, commonModule, executionPolicy, debugMsg, noProfile, subscribers, getLogLevel) {
        self._common = commonModule;
        self._const = constModule;
        self.getLogLevel = getLogLevel;
        subscribers.push({ name: self.moduleName(), onExit: self.finalize });

        return self;
    };
    this.run = function(script, callback, param) {
        self._callback = callback;
        self._param = param;
        self.output = null;
        self.error = null;
        self.errorOutput = null;

        if (self._ps) {
            delete self._ps;
            self._ps = null;
        }
        self._ps = new self._shell(script);

        self._ps.on("end", (function(code) {
            self._common.toLog(self.moduleName() + '.onEnd = ' + code);
            self._param.result = {
                data: self.output,
                errorOutput: self.errorOutput,
                errorMsg: self.error,
                rc: code,
            }
            delete self._ps;
            self._ps = null;
            self._callback(self._param);
        }));
        self._ps.on("error", (function(err) {
            self.error = err;
        }));
        self._ps.on("output", (function(data) {
            self.output = null;
            try {
                self.output = JSON.parse(data);
            } catch (ex) { if (!self.error) self.error = ex.message; }
        }));
        self._ps.on("error-output", (function(data) {
            self.errorOutput = data;
        }));


    };
    this.finalize = function() {
        'Finalize. Called from ' + self.moduleName() + ' module';
        if (self._ps) {
            self._ps.dispose();
            self.ps = null;
        }
    };
}