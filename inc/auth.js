module.exports = new Auth();

function Auth() {
    var self = this;

    this._myModuleName = 'Auth';
    this.moduleName = function() { return self._myModuleName; };
    this.jinq = require('jinq');
    this._common = null;
    this._const = null;
    this._ad = null;
    this._sql = null;
    this._authType = null; // 'ad', 'adauth' or 'sql'
    this.rolesPrefix = null;
    this.getLogLevel = null;
    this.init = function(constModule, commonModule, adModule, sqlModule, dbModel, authType, rolesPrefix, subscribers, getLogLevel, enc, dec, adAuthAutoCreate) {
        self._common = commonModule;
        self._const = constModule;
        self._ad = adModule;
        self._db = dbModel;
        self._sql = sqlModule;
        self._authType = authType;
        self.getLogLevel = getLogLevel;
        self._enc = enc;
        self._dec = dec;
        self.adAuthAutoCreate = adAuthAutoCreate;
        if (rolesPrefix) self._rolesPrefix = rolesPrefix;
        else self._rolesPrefix = '';
        subscribers.push({ name: self.moduleName(), onExit: self.finalize });

        return self;
    };
    // Authentication
    this.authorize = function(userLogin, userPass, callback, param) {
        if (typeof callback !== 'function') { throw self.moduleName() + ": auth Callback is not a function." };
        if (self.getLogLevel() == 3) self._common.toLog('Auth: User [' + userLogin + ']. trying to authenticate...');
        var tmp = userLogin.split('\\');
        if (tmp.length == 2) { userLogin = tmp[1]; }
        switch (self._authType) {
            case 'ad':
            case 'adauth':
                {
                    self._ad.auth(userLogin, userPass, function(auth, param) {
                        if (self.getLogLevel() == 3) self._common.toLog('Auth: User [' + param.userLogin + '] is authenticated = [' + auth + ']');
                        if (auth) {
                            switch (self._authType) {
                                case 'ad':
                                    {
                                        self._ad.getGroupMembershipForUser(param.userLogin, function(err, roles, param) {
                                            var rolesFinal = [];
                                            if (err) { self._common.toLog(self.moduleName() + ": authorize.Error: " + err.message + "\r\n--------------Stack:\r\n-------------------\r\n" + err.stack, "error"); }
                                            if (roles) {
                                                roles.forEach(function(itm, idx, arr) {
                                                    if (self._rolesPrefix === '' || itm.cn.startsWith(self._rolesPrefix))
                                                        rolesFinal.push({ id: self._common.guid(), name: itm.cn.replace(self._rolesPrefix, '').toLowerCase(), descr: itm.description });
                                                });
                                            }
                                            process.nextTick(callback, self.getAuthorizationTemplate(self._common.guid(), userLogin, 'AD User', rolesFinal), param);
                                        }, param);
                                        break;
                                    }
                                case 'adauth':
                                    {                                        
                                        self.findUserInSql(null, function(userWithRoles, param) {
                                            if(!userWithRoles || !userWithRoles.id) {
                                                if(self.adAuthAutoCreate) {
                                                    self._sql.query("insert into Usr(Login, Pass, Name, IsLocked) values('" + userLogin + "', '" + self._enc(userPass) + "', 'AD User', 0)").spread(function(results, metadata) {
                                                        self.findUserInSql(null, callback, param);
                                                    });
                                                } else process.nextTick(callback, userWithRoles, param);
                                            } else process.nextTick(callback, userWithRoles, param);
                                        }, param);
                                        break;
                                    }
                            }
                        } else { process.nextTick(callback, self.getAuthorizationTemplate(), param); }
                    }, { next: param.next, req: param.req, res: param.res, userLogin: userLogin, });
                    break;
                }
            case 'sql':
                {
                    self.findUserInSql(userPass, callback, param);
                    break;
                }
        }
    };
    this.findUserInSql = function(userPass, callback, param) {
        var tmp = param.userLogin.split('\\');
        tmp = tmp.length == 2 ? tmp[1] : tmp[0];
        var whereCond = {Login: tmp.toLowerCase()};
        if(userPass) whereCond.Pass = self._enc(userPass);
        self._db.Usr.findOne({
                where: whereCond,
                include: [{
                    model: self._db.Rol,
                }],
            })
            .then(function(result) {
                param.Pass = null;
                if (result && result.dataValues) {
                    var tmp = [];
                    if (result.Rols && result.Rols.length > 0) {
                        result.Rols.forEach(function(itm, idx, arr) {
                            tmp.push({ id: itm.dataValues.Id, name: itm.dataValues.Name, descr: itm.dataValues.Descr, });
                        });
                    }
                    process.nextTick(callback, self.getAuthorizationTemplate(result.Id, result.Login, result.Name, tmp), param);
                } else { process.nextTick(callback, self.getAuthorizationTemplate(), param); }
            })
            .catch(function(err) {
                param.Pass = null;
                if (err) {
                    process.nextTick(callabck, self.getAuthorizationTemplate(), param);
                    self._common.toLog(self.moduleName() + ": Error: " + err.message + "\r\n------------------------\r\n" + err.stack, "error");
                } else { self._common.toLog(self.moduleName() + ": findUserInSql.catch called but there is no error passed", "error"); }
            });
    };
    this.getAuthorizationTemplate = function(id, login, name, roles) {
        if (!id) id = null;
        if (!login) login = null;
        if (!name) name = null;
        if (!roles) roles = [];
        return { id: id, login: login, name: name, roles: roles };
    };

    // Is User is in Role
    this.isUserInRole = function(userLogin, groupName, callback, param) {
        switch (self._authType) {
            case 'ad':
                {
                    self._ad.isUserMemberOfGroup(userLogin, self._rolesPrefix + groupName, function(err, isMember) {
                        process.nextTick(callback, err, isMember, param);
                    }, param);
                    break;
                }
            case 'sql':
            case 'adauth':
                {
                    var res = false; param.userLogin = userLogin;
                    self.findUserInSql(null, function(usrWithRoles, param) {
                        if (usrWithRoles && usrWithRoles.roles && usrWithRoles.roles.length > 0) {
                            if (new self._jinq().from(usrWithRoles.roles).where(function(row, idx) { return row.name.toLowerCase() == groupName.toLowerCase(); }).select().length == 1)
                                res = true;
                        }
                    }, param);
                    process.nextTick(callback, null, res, param);
                    break;
                }
        }
    };

    this.finalize = function() { self._common.toLog('Finalize. Called from ' + self.moduleName() + ' module'); };
}