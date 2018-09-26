module.exports = new Ad();

function Ad() {
    var self = this;

    this._myModuleName = 'Ad';
    this.moduleName = function() { return self._myModuleName; };
    this._common = null;
    this._const = null;
    this._ldapServer = 'MSSDC';
    this._ldapDomain = 'dc=mss,dc=local';
    this._ldapAdDomain = null;
    this._ldapPort = 389;
    this._ldapAdminLogin = 'Administrator@mss.local';
    this._ldapAdminPassword = 'P@ssw0rd';
    this._AD = null;
    this._ad = null;
    this._currentLogin = null;
    this.getLogLevel = null;
    this._config = {
        url: '',
        baseDN: null,
        username: null,
        password: null,
    };
    this.init = function(constModule, commonModule, ldapAdDomain, ldapServer, ldapAdminLogin, ldapAdminPassword, ldapPort, subscribers, getLogLevel) {
        self._common = commonModule;
        self._const = constModule;
        self.getLogLevel = getLogLevel;

        self._ldapAdDomain = ldapAdDomain;
        var qqq = ldapAdDomain.split('.');
        var www = '';
        for (i = 0; i < qqq.length; i++) { www += 'dc=' + qqq[i] + ','; }
        www = www.slice(0, -1);
        self._ldpDomain = www;

        self._ldapServer = ldapServer;
        self._ldapAdminLogin = ldapAdminLogin;
        self._ldapAdminPassword = ldapAdminPassword;

        if (ldapPort) { self._ldapPort = ldapPort; }
        self._config.url = 'ldap://' + self._ldapServer + '.' + self._ldapAdDomain + ":" + self._ldapPort;
        self._config.baseDN = self._ldapDomain;
        self._config.username = self._ldapAdminLogin + '@' + self._ldapAdDomain;
        self._config.password = self._ldapAdminPassword;

        self._AD = require('activedirectory2').promiseWrapper;
        self._ad = new self._AD(self._config);

        subscribers.push({ name: self.moduleName(), onExit: self.finalize });

        return self;
    };
    this.auth = function(userLogin, password, callback, param) {
        var tmp = userLogin.split('\\');
        userLogin = tmp.length == 2 ? tmp[1] : tmp[0];
        self._ad.authenticate(userLogin + '@' + self._ldapAdDomain, password, function(err, auth) {
            if (err) {
                err.error_message = err.message;
                err.stack_trace = err.stack;
                self._common.toLog('[' + userLogin + '] AD: Auth ERROR [' + JSON.stringify(err) + ']');
                process.nextTick(callback, false, param);
            }
            if (auth) {
                self._common.toLog('[' + userLogin + '] Authenticated.');
                process.nextTick(callback, true, param);
            } else {
                self._common.toLog('[' + userLogin + '] Authentication failed.', self._const.msgErr);
                process.nextTick(callback, false, param);
            }
        });
    };
    this.isUserMemberOfGroup = function(userLogin, groupName, callback, param) {
        var tmp = userLogin.split('\\');
        userLogin = tmp.length == 2 ? tmp[1] : tmp[0];
        self._ad.isUserMemberOf(userLogin, groupName, function(err, isMember) {
            if (err) {
                err.error_message = err.message;
                err.stack_trace = err.stack;
                self._common.toLog('AD.isUserMemberOfGroup Error: ' + JSON.stringify(err));
            }
            process.nextTick(callback, err, isMember, param);
        });
    };
    this.getGroupMembershipForUser = function(userLogin, callback, param) {
        var tmp = userLogin.split('\\');
        userLogin = tmp.length == 2 ? tmp[1] : tmp[0];
        self._ad.getGroupMembershipForUser(userLogin, function(err, groups) {
            if (err) {
                err.error_message = err.message;
                err.stack_trace = err.stack;
                self._common.toLog('AD.getGroupMembershipForUser Error: ' + JSON.stringify(err));
            }
            process.nextTick(callback, err, groups, param);
        });
    };
    this.findUser = function(userLogin, callback, param) {
        var tmp = userLogin.split('\\');
        userLogin = tmp.length == 2 ? tmp[1] : tmp[0];
        self._ad.findUser(userLogin, function(err, usr) {
            if (err) {
                err.error_message = err.message;
                err.stack_trace = err.stack;
                self._common.toLog('AD.findUser Error: ' + JSON.stringify(err));
            }
            process.nextTick(callback, err, usr, param);
        });
    };

    this.finalize = function() { self._common.toLog('Finalize. Called from ' + self.moduleName() + ' module'); };
}