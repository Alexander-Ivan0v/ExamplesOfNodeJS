module.exports = new Common();

function Common() {
    var self = this;

    this._myModuleName = 'Common';
    this.moduleName = function() { return self._myModuleName; };
    this._logPath = null;
    this._const = null;
    this._fs = require('fs');
    var path = require('path');


    this.init = function(constModule, logPath, subscribers) {
        self._const = constModule;
        self._logPath = logPath;
        subscribers.push({ name: self._myModuleName, onExit: self.finalize });
        return self;
    };
    this.getDateTime = function() {
        var dat = new Date();
        dat.setTime(dat.getTime());
        return dat;
    };
    this.dateToStr = function(date) {
        return date.toISOString()
            .replace(/T/, ' ')
            .replace(/\..+/, '');
    };
    this.toLog = function(msg, name, stack) {
        var dat = self.getDateTime();
        var tmp = '[' + dat.getFullYear() + '-' + self.intAsTwoDigit(dat.getMonth()) + '-' + self.intAsTwoDigit(dat.getDate()) + ' ' + self.intAsTwoDigit(dat.getHours()) + ':' + self.intAsTwoDigit(dat.getMinutes()) + ':' + self.intAsTwoDigit(dat.getSeconds()) + '] ';

        if (msg && name && stack) {
            // Exception
            tmp += '[' + self._const.msgException + '] (' + name + ') ' + msg + '\r\n' + stack;
            console.error(tmp);
        } else if (msg && name) {
            // Message or Error or whaterer you want
            tmp += '[' + name + ']  ' + msg;
            switch (name.toLowerCase()) {
                case 'error':
                case 'fatal':
                    {
                        console.error(tmp);
                        break;
                    }
                case 'warn':
                case 'warning':
                    {
                        console.warn(tmp);
                        break;
                    }
                default:
                    {
                        console.log(tmp);
                    }
            }
        } else {
            // Just a Message
            tmp += '[' + self._const.msgInfo + ']  ' + msg;
            console.log(tmp);
        }

        self._fs.appendFile(self._logPath, tmp + '\r\n', function(err) {
            if (err) {
                console.error('Error while writing to the file [' + self._const.logFileName + ']');
            } else {
                // done
            }
        });
    };
    this.isInDebug = function() {
        if (process.execArgv.length > 0) {
            for (i = 0; i < process.execArgv.length; i++) {
                if (process.execArgv[i].indexOf('--debug-brk') > -1 || process.execArgv[i].indexOf('--inspect') > -1)
                    return true;
            }
        }
        return false;
    };
    this.isFileExists = function(filepath) {
        var flag = false;
        try {
            if (self._fs) {
                self._fs.accessSync(filepath, self._fs.F_OK);
                flag = true;
            }
        } catch (e) {}
        return flag;
    };
    this.isPathMatchToOneFromArray = function(path, pathArray) {
        var yes = false;
        if (path && pathArray && pathArray.length > 0) {
            for (i = 0; i < pathArray.length; i++) {
                if (path.match(pathArray[i])) { yes = true; break; }
            }
        }
        return yes;
    };
    this.intAsTwoDigit = function(myNumber) {
        return ("0" + myNumber).slice(-2);
    };
    this.DateDiff = function(from, to) {
        var res = null;
        if ((from instanceof Date) && (to instanceof Date)) {
            var diffMs = Math.abs(from - to);
            res = {
                ms: diffMs,
                sec: diffMs / 1000,
                min: diffMs / 1000 / 60,
                hrs: diffMs / 1000 / 60 / 60,
                days: diffMs / 1000 / 60 / 60 / 24,
            };
        }
        return res;
    };
    this.guid = function() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    };
    this.getRandomFloat = function(min, max) {
        // Возвращает случайное число между min (включительно) и max (не включая max)
        return Math.random() * (max - min) + min;
    };
    this.getRandomInt = function(min, max) {
        // Возвращает случайное целое число между min (включительно) и max (не включая max)
        // Использование метода Math.round() даст вам неравномерное распределение!
        return Math.floor(Math.random() * (max - min)) + min;
    };

    this.finalize = function() {
        // self._common.toLog('Finalize. Called from ' + self._myModuleName + ' module');
    };
}