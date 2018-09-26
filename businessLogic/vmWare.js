'esversion: 6';

module.exports = new VmWare();

function VmWare() {
    var self = this;

    this._myModuleName = 'VmWare';
    this.moduleName = function() { return self._myModuleName; };
    this.ver = function() { return '0.0.1'; };
    this.txtDescr = function() { return "This module intended for working with " + self.moduleName(); };
    this.htmlDescr = function() { return "This module intended for working with " + self.moduleName(); };
    this._fs = require('fs');
    this._path = require('path');
    this._jinq = require('jinq');
    this.dateFormat = require('date-format');
    // OS
    this._os = require('os');
    // Basic authentication
    this._basicAuth = require('basic-auth');
    // Http Status Codes
    this._httpStatus = require('http-status-codes');
    this.intervalConst = 1000 * 60 * 60; // One request per 3 hours
    this.vmwareCfg = JSON.parse(self._fs.readFileSync(self._path.resolve(__dirname, 'vmware.cfg'), 'utf8'));
        this.init = function(id, app, srv, constModule, commonModule, sqlConnection, sequelize, db, adModule, authModule, cfg, registerHandler, unregisterHandler, subscribers, newRoleBuilder, makeResponse, getHandlerPathPrefix, getLogLevel, async, getUserLogin, enc, dec, validator) {
        //self._fs.appendFileSync(self._path.resolve(__dirname, 'cherwell.cfg'), JSON.stringify(self.cherwellCfg), 'utf8');
        self.id = id;
        self._common = commonModule;
        self._const = constModule;
        self._connection = sqlConnection;
        self._sql = sequelize;
        self._db = db;
        self._ad = adModule;
        self.getLogLevel = getLogLevel;
        self._app = app;
        self._srv = srv;
        self._auth = authModule;
        self._appCfg = cfg;
        self._registerHandler = registerHandler;
        self._unregisterHandler = unregisterHandler;
        self._subscribers = subscribers;
        self._subscribers.push({ name: self._myModuleName, onExit: self.finalize });
        self._newRoleBuilder = newRoleBuilder;
        self._makeResponse = makeResponse;
        self._getHandlerPathPrefix = getHandlerPathPrefix;
        self._async = async;
        self.getUserLogin = getUserLogin;
        self._enc = enc;
        self._dec = dec;
        self._validator = validator;

        // -----------------------------------------------------------------

        self.auth = {path: '/api/sessions', method: 'POST', accept: 'application/*+xml;version=5.5'};
        self.allVapp = {path: '/api/query?type=vApp', method: 'GET', accept: 'application/*+xml;version=5.5'};
        self.vApp = {path: '/api/vApp/vapp-{vAppId}', method: 'GET', accept: 'application/*+xml;version=5.5'};
        self.vAppLeaseSection = {path: '/api/vApp/vapp-{vAppId}/leaseSettingsSection/', method: 'PUT', accept: 'application/*+xml;version=1.5'};

        self.myVappId = [];
        self.vCloudPipe = [];

        self.roleVappRefresher = 'vAppRefresher';

        self.actRefreshVappLease = 'Refresh vApp Lease';
        self.actRefreshAllVappLease = 'Refresh All vApp Lease';
        self.actCheckLogin = 'Check Login';

        // my part of Database description
        self.describeTables();


        self._db.Rol.findOrCreate({ where: { Name: self.roleVappRefresher, Descr: 'Automatically refresh vApp in vCloud' } }).spread(self._preparationCallback);
        self._db.vcAct.findOrCreate({ where: { Name: self.actRefreshVappLease } }).spread(self._preparationCallback);
        self._db.vcAct.findOrCreate({ where: { Name: self.actRefreshAllVappLease } }).spread(self._preparationCallback);
        self._db.vcAct.findOrCreate({ where: { Name: self.actCheckLogin } }).spread(self._preparationCallback);

        // Prepare the HTTP request.
        self.myHttpOptions = {
            host: self.vmwareCfg.httpHost,
            port: self.vmwareCfg.httpPort,
            path: '',
            method: '',
            rejectUnauthorized: false,
            requestCert: true,
            agent: false,
            auth: '',
            headers: {}
        };

        // -----------------------------------------------------------------
        // Method: Get
        self._registerHandler('/about', 'get', self._getAbout, null, self, false, true, 'About VMWare module', 'About VMWare module', null);
        self._registerHandler('/me', 'get', self._getMe, null, self, false, true, 'All my stat', 'All my stat', null);
        self._registerHandler('/cred/:email', 'get', self._getCred, null, self, false, true, 'Change Email and password', 'Change Email and password', null);
        self._registerHandler('/stop/:stop', 'get', self._getStop, null, self, false, true, 'Add youself to ability to Refresh your vApps', 'Add youself to ability to Refresh your vApps', null);
        self._registerHandler('/renew', 'get', self._getRenew, null, self, false, true, 'Refresh vApp lease for all your vApp. Currently is now working', 'Refresh vApp lease for all your vApp. Currently is now working', null);
        self._registerHandler('/renew/:vAppName', 'get', self._getRenew, null, self, false, true, 'Refresh vApp lease for a concreate vApp. Currently is now working', 'Refresh vApp lease for a concreate vApp. Currently is now working', null);
        
        return self;
    };    
    this.toLog = function(msg, what) {
        self._common.toLog(self.moduleName() + "[" + self.id + "]. " + msg, what);
    };
    // ------------------ Tables description ----------------
    this.describeTables = function() {
        self._db.vcCred = self._connection.define('vcCred', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true, unique: true },
            Login: { type: self._sql.STRING(50), allowNull: false, unique: true },
            Pass: { type: self._sql.STRING(1024), allowNull: false, unique: false },
            Email: { type: self._sql.STRING(100), allowNull: false, unique: false },
            Stop: { type: self._sql.BOOLEAN, allowNull: false, unique: false },
            Dat: { type: self._sql.DATE, allowNull: false, unique: false, defaultValue: self._sql.NOW },
        }, { freezeTableName: true, timestamps: false }, { name: { singular: 'vcCred', plural: 'vcCred' } });
        self._db.vcAct = self._connection.define('vcAct', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true, unique: true },
            Name: { type: self._sql.STRING(50), allowNull: false, unique: true },
        }, { freezeTableName: true, timestamps: false }, { name: { singular: 'vcAct', plural: 'vcAct' } });
        self._db.vcApp = self._connection.define('vcApp', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true, unique: true },
            AppId: { type: self._sql.STRING(50), allowNull: false, unique: true },
            Name: { type: self._sql.STRING(50), allowNull: false, unique: false },
            Interval: { type: self._sql.BIGINT, allowNull: false, unique: false },
        }, { freezeTableName: true, timestamps: false }, { name: { singular: 'vcApp', plural: 'vcApp' } });
        self._db.vcCredvcApp = self._connection.define('vcCredvcApp', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true, unique: true },
            vcCred: { type: self._sql.BIGINT, allowNull: false, unique: false, references: { model: self._db.vcCred, key: 'Id' } },
            vcApp: { type: self._sql.BIGINT, allowNull: false, unique: false, references: { model: self._db.vcApp, key: 'Id' } },
            Dat: { type: self._sql.DATE, allowNull: false, unique: false, defaultValue: self._sql.NOW },
        }, { freezeTableName: true, timestamps: false }, { name: { singular: 'vcCredvcApp', plural: 'vcCredvcApp' } });
        self._db.vcCredvcAct = self._connection.define('vcCredvcAct', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true, unique: true },
            vcCred: { type: self._sql.BIGINT, allowNull: false, unique: false, references: { model: self._db.vcCred, key: 'Id' } },
            vcAct: { type: self._sql.BIGINT, allowNull: false, unique: false, references: { model: self._db.vcAct, key: 'Id' } },
            Dat: { type: self._sql.DATE, allowNull: false, unique: false, defaultValue: self._sql.NOW },
            Success: { type: self._sql.BOOLEAN, allowNull: true, unique: false },
        }, { freezeTableName: true, timestamps: false }, { name: { singular: 'vcCredvcAct', plural: 'vcCredvcAct' } });

        self._db.vcCred.belongsToMany(self._db.vcAct, { through: {model: self._db.vcCredvcAct, unique: false}, foreignKey: 'vcCred', constraints: false });
        self._db.vcAct.belongsToMany(self._db.vcCred, { through: {model: self._db.vcCredvcAct, unique: false}, foreignKey: 'vcAct', constraints: false });

        self._db.vcCred.belongsToMany(self._db.vcApp, { through: {model: self._db.vcCredvcApp, unique: false}, foreignKey: 'vcCred', constraints: false });
        self._db.vcApp.belongsToMany(self._db.vcCred, { through: {model: self._db.vcCredvcApp, unique: false}, foreignKey: 'vcApp', constraints: false });
    };

    this.getAllFromDb = function(whereCond, callback, param) {
        self._db.vcCred.findAll({ 
                // where: { Stop: false },
                where: whereCond,
                order: 
                [
                    ['Dat', 'DESC']
                ], 
                // include: [{ all: true }]
                
                include: [                    
                    {
                        model: self._db.vcAct,
                        as: "vcActs",
                        through: {
                            where: {Dat: {$not: null}},
                            attributes: ['Dat'],
                            order: [
                                ['Dat', 'DESC']
                            ],
                        }
                    },
                    {
                        model: self._db.vcApp,
                        as: "vcApps",
                        through: {
                            attributes: ['Dat'],
                            order: [
                                ['Dat', 'DESC']
                            ],
                        }
                    },
                ]
                
            })
            .then(function(recordset) {
                if (!recordset || recordset.length === 0) {
                    self.toLog("getAllFromDb: Nothing to do", "warn");
                }                
                process.nextTick(callback, null, JSON.parse(JSON.stringify(recordset)), param);
            }).catch(function(err) { process.nextTick(callback, self.moduleName() + "[" + self.id + "]. getAllFromDb.[find vcCred].Error:" + err, null, param); });
    };
    this.vCloudPipeCallback = function(err, data, param) {
        if(!err) {
            self.toLog(data);
            if(self.vCloudPipe && self.vCloudPipe.length === 0) {
                // All Tasks are processed                
                self.toLog("Will meet you in " + self.vmwareCfg.interval + " hours.");
                setTimeout(self.getAllFromDb, self.vmwareCfg.interval * self.intervalConst, {Stop: false}, self.startWorkCallback, {httpOptions: JSON.parse(JSON.stringify(self.myHttpOptions))});
            }
        }
        else if(err || !data.Task) {
           self.toLog("There is no update Lease Task created or the error: " + err, "error"); 
        }
        // Save to Database
        self.saveAction( param.rec.Id, param.act, (data.Task != null && data.Task != undefined) );
    };
    this.saveAction = function (id, act, success) {
        // Save Action result to Database        
        self._connection.query("insert into vcCredvcAct(vcCred, vcAct, Dat, Success) values(" + id + ",(select Id from vcAct where Name='" + act + "'), '" + self.dateFormat('yyyy-MM-dd hh:mm:ss.SSSO', self._common.getDateTime()) + "', " + (success == true ? 1 : 0) + ")").spread(function(results, metadata) {
            self.toLog("Database was updated with action completed. Success = [" + (success == 1 ? 'yes' : 'no') + "]");
        });
    };
    this.startSingleVcloudPipe = function(rec, callback, param) {
        if(rec.vcApps && rec.vcApps.length && rec.vcApps.length > 0)
            param.act = self.actRefreshVappLease;
        else param.act = self.actRefreshAllVappLease;
        param.rec = rec;
        param.httpHost = self.vmwareCfg.httpHost;
        param.httpPort = self.vmwareCfg.httpPort;
        param.httpOptions = JSON.parse(JSON.stringify(self.myHttpOptions));
        self.vCloudPipe.push(new VcloudPipe(self, callback, param, null, null).start());
    };
    this.startWorkCallback = function(err, tbl, param) {
        if(!err) {
            if (self.id === 0) {
                // We are in Debug mode. All records for users
                self.start = 0;
                self.len = tbl.length;
            }
            else {
                // Not in Debug and Multiple CPU used
                // If throng used, then IDs starts from 1. If we are in debug, ID is single one and = 0;
                each = Math.floor(tbl.length / self._os.cpus().length);
                self.start = (self.id - 1) * each;
                self.len = each;
                if (self.id == self._os.cpus().length) {
                    // Last instance will takes care about each + rest
                    self.len += tbl.length % self._os.cpus().length;
                }
            }
            if(self.len > 0) {                
                for(i = self.start; i < self.start + self.len; i++) {
                    self.startSingleVcloudPipe(tbl[i], self.vCloudPipeCallback, param);                
                }
            }
        }
        else {
            self.toLog(err, "error");
            setInterval(self.getAllFromDb, self.vmwareCfg.interval * self.intervalConst, param);
        }
    }
    // ------------------ Callbacks -------------------------
    this._preparationCallback = function(tbl, created) {
        tbl = JSON.parse(JSON.stringify(tbl));
        if (tbl) {            
            if(tbl.Name == self.actRefreshVappLease) {
                self.toLog("Necessary Action(s) stored");
                process.nextTick(self.getAllFromDb, {Stop: false}, self.startWorkCallback, {httpOptions: JSON.parse(JSON.stringify(self.myHttpOptions))});
            }
            else if(tbl.Name == self.roleVappRefresher) self.toLog("Necessary rights were set");
        } else {
            var msg = '';
            if(tbl.Name == self.actRefreshVappLease) msg = self.moduleName() + "[" + self.id + "]: Error. Can't store necessary actions for module.";
            else if(tbl.Name == self.roleVappRefresher) self.moduleName() + "[" + self.id + "]: Error. Can't set necessary rights for module."
            self.toLog(msg);
            throw msg;
        }
    };
    this.updateUserPassCallback = function(err, data, param) {
        if(!err) {
            param.res.status(self._httpStatus.OK).send(                
                self._makeResponse(self._httpStatus.OK, { message: "Information accepted" })
            );
        }
        else {
            param.res.status(self._httpStatus.INTERNAL_ERROR).send(                
                self._makeResponse(self._httpStatus.INTERNAL_ERROR, { message: "There is an error:" + err })
            );
        }
    };

    this.updateUserPass = function(sql, callback, param) {
        self._connection.query(sql).spread(function(results, metadata) {
            process.nextTick(callback, null, results, param);
        });
    }
// ======================= HTTP Methods ===========================
// ================== HTTP Methods work start =====================
    this._getAbout = function(req, res) {
        res.status(self._httpStatus.OK).send(
            self._makeResponse(self._httpStatus.OK, { name: self.moduleName(), ver: self.ver(), txtDescr: self.txtDescr(), htmlDescr: self.htmlDescr() })
        );
        return;
    };
    this._getCredCallback = function(err, data, param) {
        if(!err) {
            if(param.user) {
                if(param.act == 'cred') {                    
                    // Cred
                    if(data && data.length > 0 && self.getUserLogin()) {
                        self.toLog("Changing e-mail or password action for [" + self.getUserLogin() + "]");
                        data.forEach(function(itm, idx, arr) {
                            if( itm.Login.toLowerCase() == self.getUserLogin().toLowerCase() && !itm.Stopped) {
                                self.updateUserPass("UPDATE vcCred SET Email='" + param.email + "', Pass='" + self._enc(param.pass) + "', Dat='" + self.dateFormat('yyyy-MM-dd hh:mm:ss.SSSO', self._common.getDateTime()) + "' WHERE Id = " + itm.Id, self.updateUserPassCallback, param);
                            }
                        });                
                    } else {
                        self.updateUserPass("INSERT INTO vcCred(Login, Pass, Email, Dat, Stop) VALUES('" + param.user + "', '" + self._enc(param.pass) + "', '" + param.email + "', '" + self.dateFormat('yyyy-MM-dd hh:mm:ss.SSSO', self._common.getDateTime()) + "', 0)" , self.updateUserPassCallback, param);
                    }
                } else if(param.act == 'me' && data && data.length > 0 && self.getUserLogin()) { 
                    // Me                   
                    data[0].Pass = null;
                    param.res.status(self._httpStatus.OK).send(                
                        self._makeResponse(self._httpStatus.OK, { youAre: data })
                    );
                } 
                else if(param.act == 'stop' && data && data.length > 0 && self.getUserLogin()) {
                    // Stop
                    self.toLog("Changing Stop flag action for [" + self.getUserLogin() + "]");
                    var stop = param.val.toLowerCase() == 'true' ? 1 : 0;
                    data.forEach(function(itm, idx, arr) {
                        if( itm.Login.toLowerCase() == self.getUserLogin().toLowerCase() && !itm.Stopped) {
                            self.updateUserPass("UPDATE vcCred SET Stop=" + stop + " WHERE Id = " + itm.Id, self.updateUserPassCallback, param);
                        }
                    });
                }
                else {
                    res.status(self._httpStatus.FORBIDDEN).send(                
                        self._makeResponse(self._httpStatus.FORBIDDEN, { message: "It seems your credential is Stopped on this server" })
                    );
                }
            } else {self.toLog("Request came but user is not authenticated. Ignored. [" + param.email + "]");}
        } else {
            err.error_message = err.message;
            err.stack_trace = err.stack;
            res.status(self._httpStatus.INTERNAL_ERROR).send(                
                self._makeResponse(self._httpStatus.INTERNAL_ERROR, { message: "There is an error:" + err })
            );
        }
        return;
    }
    this._getCred = function(req, res) {
        var user = self.getUserLogin();
        if(user) {
            self._user = self._basicAuth(req);        
            if (self._user) {
                if(self._validator.isEmail(decodeURI(req.params.email))) {
                    self._user.login = self._user.name;
                    self._user.name = null;
                    self.getAllFromDb(null, self._getCredCallback, {act: 'cred', req: req, res: res, user: user, email: decodeURI(req.params.email), pass: self._user.pass});
                }
                else {
                    res.status(self._httpStatus.FORBIDDEN).send(                
                        self._makeResponse(self._httpStatus.FORBIDDEN, { message: "E-mail Address [" + decodeURI(req.params.email) + "] has incorrect format" })
                    );
                }
            }
            else {
                res.status(self._httpStatus.UNAUTHORIZED).send(                
                    self._makeResponse(self._httpStatus.UNAUTHORIZED, { message: "There is an error:" + err })
                );
            }
        }
        else {
            res.status(self._httpStatus.UNAUTHORIZED).send(                
                self._makeResponse(self._httpStatus.UNAUTHORIZED, { message: "There is an error:" + err })
            );
        }
    };
    this._getStop = function(req, res) {
        var user = self.getUserLogin();
        if(user) {
            self._user = self._basicAuth(req);        
            if (self._user) {
                self._user.login = self._user.name;
                self._user.name = null;
                self.getAllFromDb(null, self._getCredCallback, {act: 'stop', val: req.params.stop, req: req, res: res, user: user});
            }
        }
        else {
            res.status(self._httpStatus.UNAUTHORIZED).send(                
                self._makeResponse(self._httpStatus.UNAUTHORIZED, { message: "There is an error:" + err })
            );
        }
    };
    this._getMe = function(req, res) {
        var user = self.getUserLogin();
        if(user) {
            self._user = self._basicAuth(req);        
            if (self._user) {
                self._user.login = self._user.name;
                self._user.name = null;
                self.getAllFromDb(null, self._getCredCallback, {act: 'me', val: req.params.stop, req: req, res: res, user: user});
            }
        }
        else {
            res.status(self._httpStatus.UNAUTHORIZED).send(                
                self._makeResponse(self._httpStatus.UNAUTHORIZED, { message: "There is an error:" + err })
            );
        }
    };
    this._getRenew = function(req, res) {
        
        var user = self.getUserLogin();
        if(user) {
            switch (req.route.path) {
                case self._path.join(self._getHandlerPathPrefix(), self.moduleName().toLowerCase() + "/renew/:vAppName").split('\\').join('/'): {
                    // Only selected vApp
                    
                    break;
                }
                case self._path.join(self._getHandlerPathPrefix(), self.moduleName().toLowerCase() + "/renew").split('\\').join('/'): {
                    // All vApps
                    self.getAllFromDb( {Stop: false, Login: user}, self.getRenewCallback, {httpOptions: JSON.parse(JSON.stringify(self.myHttpOptions)), req: req, res: res} );
                    break;
                }
            }
        } else {
            res.status(self._httpStatus.UNAUTHORIZED).send(                
                self._makeResponse(self._httpStatus.UNAUTHORIZED, { message: "Unauthorized" })
            );
        }        
        return;
    }
    this.getRenewCallback = function(err, tbl, param) {
        if(!err) {
            if(tbl && tbl.length && tbl.length == 1) {
                self.startSingleVcloudPipe(tbl[0], self.getRenewCallbackEnd, param);
            } else {
                param.res.status(self._httpStatus.INTERNAL_ERROR).send(                
                    self._makeResponse(self._httpStatus.INTERNAL_ERROR, { message: "Returned inproper count of rows" })
                );
            } 
        } else {
            param.res.status(self._httpStatus.INTERNAL_ERROR).send(                
                self._makeResponse(self._httpStatus.INTERNAL_ERROR, { message: "Unauthorized" })
            );
        } 
    };
    this.getRenewCallbackEnd = function(err, tbl, param) {
        if(!err) {
            if(tbl && tbl.Task) {
                param.res.status(self._httpStatus.OK).send(                
                    self._makeResponse(self._httpStatus.OK, { Task: tbl.Task })
                );
            } else {
                param.res.status(self._httpStatus.INTERNAL_ERROR).send(                
                    self._makeResponse(self._httpStatus.INTERNAL_ERROR, { message: "Returned inproper count of rows" })
                );
            }            
        } else {
            param.res.status(self._httpStatus.INTERNAL_ERROR).send(                
                self._makeResponse(self._httpStatus.INTERNAL_ERROR, { message: "Unauthorized" })
            );
        }
        self.saveAction( param.rec.Id, param.act, (!err && tbl && (tbl.Task != null && tbl.Task != undefined)) );
    };
    
    
    this.finalize = function() {
        self.toLog('Finalize. Called from ' + self._myModuleName + ' module');
    };
}

// ============================== VcloudPipe ==================================
function  VcloudPipe(parent, callback, param, req, res) {
    var self = this;
    this.sect = `<?xml version="1.0" encoding="UTF-8"?>
    <vcloud:LeaseSettingsSection xmlns:ovf="http://schemas.dmtf.org/ovf/envelope/1" 
        xmlns:vcloud="http://www.vmware.com/vcloud/v1.5"
        href="https://vcloud.example.com/api/vApp/vapp-{vAppId}/leaseSettingsSection/"
        ovf:required="false"
        type="application/vnd.vmware.vcloud.leaseSettingsSection+xml">
    <ovf:Info>Lease settings section</ovf:Info>
    <vcloud:Link
        href="https://vcloud.example.com/api/vApp/vapp-{vAppId}/leaseSettingsSection/"
        rel="edit"
        type="application/vnd.vmware.vcloud.leaseSettingsSection+xml"/>
    <vcloud:DeploymentLeaseInSeconds>604800</vcloud:DeploymentLeaseInSeconds>
    <vcloud:StorageLeaseInSeconds>2592000</vcloud:StorageLeaseInSeconds>
    </vcloud:LeaseSettingsSection>`;
    this.param = param;
    this.req = req;
    this.res = res;
    this.callback = callback;
    this.cookie = '';
    this.stop = false;
    this.parent = parent;
    this.toLog = function(msg, what) {
        self.parent._common.toLog(self.parent.moduleName() + "[" + self.parent.id + "]: VcloudPipe.vcCred[" + self.rec.Id + "] " + msg, what);
    }
    this.start = function() {
        self.xml2js = require('xml2js');
        self.dateFormat = require('date-format');
        self.https = require('https');
        self.httpHost = param.httpHost;
        self.httpPort = param.httpPort;
        self.httpOptions = param.httpOptions;
        self.rec = param.rec;
        self.auth = {path: '/api/sessions', method: 'POST', accept: 'application/*+xml;version=5.5'};
        self.allVapp = {path: '/api/query?type=vApp', method: 'GET', accept: 'application/*+xml;version=5.5'};
        self.vApp = {path: '/api/vApp/vapp-{vAppId}', method: 'GET', accept: 'application/*+xml;version=5.5'};
        self.vAppLeaseSection = {path: '/api/vApp/vapp-{vAppId}/leaseSettingsSection/', method: 'PUT', accept: 'application/*+xml;version=1.5'};
        self.chunk = "";
        self.vAppId = [];
        self.err = null;
        self.data = null;
        // Start chain
        process.nextTick(self.vcLogin);
        return self;
    };
    this.vcLogin = function() {
        self.toLog("Logging in...");
        self.httpOptions.method = self.auth.method;
        self.httpOptions.path = self.auth.path;
        self.httpOptions.headers.Accept = self.auth.accept;
        self.httpOptions.auth = self.rec.Login + "@is:" + self.parent._dec(self.rec.Pass);
        self.https.request(self.httpOptions, self.vcLoginCallback).end();
    };
    this.vcLoginCallback = function(res) {
        res.on('error', function(err) {
            self.err = err;
            self.toLog("Authorization Error: " + err, "error");
            self.done();
        });
        res.on('data', function(chunk) {

        });
        res.on('end', function() {
            self.toLog("Login complete. Analyzing it");
            if (res.statusCode == 200) {                
                if(res.headers['set-cookie']) {
                    // After authentication
                    //self.toLog("Session ID:\n" + res.headers['set-cookie']);
                    var cookieValue = res.headers['set-cookie'];
                    self.httpOptions.headers.Cookie = cookieValue;
                    self.httpOptions.auth = null;
                    if(param.act == self.parent.actRefreshAllVappLease || param.act == self.parent.actRefreshVappLease)
                        process.nextTick(self.vcGetAllVapps, self.myHttpOptions);
                    else if(param.act == self.parent.actCheckLogin) {
                        self.data = 'OK';
                        process.nextTick(self.vcLogoff);
                    }
                }
                else {
                    self.err = 'Cookies are not returned';
                    self.toLog("Authorization Error", "error");
                    self.done();
                }
            }
            else {
                var msg = "Authorization Error [" + res.statusCode + "] " + res.statusMessage;
                self.err = msg
                self.toLog(msg, "error"); 
                self.done();
            }
        });
    
    };    
    this.vcGetAllVapps = function() {
        self.chunk = "";
        self.vAppId = [];
        self.httpOptions.method = self.allVapp.method;
        self.httpOptions.path = self.allVapp.path;
        self.httpOptions.headers.Accept = self.allVapp.accept;
        self.https.request( self.httpOptions, self.vcGetAllVappsCallback).end();        
    };
    this.vcGetAllVappsCallback = function(res) {
        res.on('error', function(err) {
            self.err = err;
            self.toLog("GetAllVApps Error: " + err, "error");
            self.done();
        })
        res.on('data', function(chunk) {            
            self.chunk += chunk;
        })
        res.on('end', function() {
            self.xml2js.parseString(self.chunk, { trim: true }, function(err, result) {
                if(!err) {
                    if(result && result.QueryResultRecords && result.QueryResultRecords.VAppRecord && result.QueryResultRecords.VAppRecord.length > 0) {
                        // All available vApps
                        result.QueryResultRecords.VAppRecord.forEach(function(itm, idx, arr) {
                                var appId = itm['$'].href.split('/api/vApp/vapp-');
                                if(appId.length == 2) {
                                    self.vAppId.push({AppId: appId[1], Name: itm['$'].name, Owner: itm['$'].ownerName, refreshed: false});
                                }
                        });
                        if(self.vAppId && self.vAppId.length && self.vAppId.length > 0) {
                            if(self.rec.vcApps && self.rec.vcApps.length && self.rec.vcApps.length > 0 && self.act != self.parent.actRefreshAllVappLease) {
                                // Only selected vApps
                                var qqq = [];
                                self.rec.vcApps.forEach(function(itm, idx, arr) {
                                    qqq.push({Name: itm.Name});
                                });
                                self.vAppId = new self.parent._jinq().from(self.vAppId).join(qqq).on('Name').select();
                                process.nextTick(self.vcRefresh);
                            }
                            else {
                                // All available vApps                                
                                process.nextTick(self.vcRefresh);
                            }

                        }
                        else {
                            self.toLog("No VApps found in vCloud for this account.", "warn");
                            process.nextTick(self.vcLogoff);
                        }
                    }
                    else {
                        self.toLog("vcGetAllVappsCallback. Requested part is not found.", "error");
                        process.nextTick(self.vcLogoff);
                    }
                }
                else {
                    var msg = "vcGetAllVappsCallback. Parse XML Error: " + err;
                    self.err = msg;
                    self.toLog(msg, "error");
                    process.nextTick(self.vcLogoff);
                }
            });
        })
    };
    this.vcRefresh = function(appNameOrId) {
        self.chunk = '';
        var tmp = new self.parent._jinq().from(self.vAppId).where(function(row, idx) {return !row.refreshed}).select();
        if(tmp && tmp.length && tmp.length > 0) {
            sect = self.sect.split('{vAppId}').join(tmp[0].AppId);
            self.httpOptions.method = self.vAppLeaseSection.method;
            self.httpOptions.path = self.vAppLeaseSection.path.replace('{vAppId}', tmp[0].AppId);
            self.httpOptions.headers.Accept = self.vAppLeaseSection.accept;
            self.httpOptions.headers['Content-Type'] = "application/vnd.vmware.vcloud.leaseSettingsSection+xml; charset=ISO-8859-1";
            self.httpOptions.headers['Content-Length'] = sect.length;
            var qqq = self.https.request( self.httpOptions, self.vcRefreshCallback);
            qqq.write(sect);
            qqq.end();
            self.toLog("Refresh called");
        }
        else {
            self.toLog("vcRefresh: Nothing to do. Logging off");
            process.nextTick(self.vcLogoff);
        }
    };
    this.vcRefreshCallback = function(res) {
        res.on('error', function(err) {
            self.err = err;
            self.toLog("Refresh Lease rror: " + err,"error");
        })
        res.on('data', function(chunk) {
            self.chunk += chunk.toString();
        })
        res.on('end', function() {
            self.toLog("All data for Refresh has been got.");
            self.xml2js.parseString(self.chunk, { trim: true }, function(err, result) {
                if(!err) {
                    if(result && result.Task) {
                        // Task after Lease update
                        self.data = result;
                        self.err = null;
                        self.toLog("Lease update Task created. Owner: [" + result.Task.Owner[0]['$'].name + "] User :[" + result.Task.User[0]['$'].name + "]");
                        // Mark this vApp as Refreshed
                        var tmp = new self.parent._jinq().from(self.vAppId).where(function(row, idx) {return !row.refreshed}).select();
                        if(tmp && tmp.length && tmp.length > 0) {
                            new self.parent._jinq().from(self.vAppId).update( function(coll,index){ coll[index].refreshed = true;} ).at('Name = ' + tmp[0].Name);
                        }
                        // Check if there are some unrefreshed vApps present
                        var tmp = new self.parent._jinq().from(self.vAppId).where(function(row, idx) {return !row.refreshed}).select();                                                
                        if(tmp && tmp.length && tmp.length > 0) {process.nextTick(self.vcRefresh);}
                        else process.nextTick(self.vcLogoff);
                    }
                }
                else {
                    var msg = "vcRefreshCallback. Parse XML Error: " + err;
                    self.err = msg;
                    self.toLog(msg, "error");
                    process.nextTick(self.vcLogoff);
                }
            });            
        })
    };
    this.vcLogoff = function() {
        self.toLog("Logged off");
        self.done();
        /*
        self.httpOptions.method = self.auth.method;
        self.httpOptions.path = self.auth.path;
        self.httpOptions.headers.Accept = self.auth.accept;
        //self.hHttpOptions.headers.Cookie = null;
        self.httpOptions.auth = null;
        self.https.request(self.httpOptions, self.vcLogoffCallback).end();
        */
    };
    this.vcLogoffCallback = function(res) {
        // End of process. Call callback
        res.on('error', function(err) {
            self.toLog("Logoff error " + err,"error");
        })
        res.on('data', function(chunk) {
            self.toLog("LogoffCallback: " + chunk.toString());
        })
        res.on('end', function() {
            self.done();
        })
    };
    this.stop = function() {
        self.stop = true;
    };
    this.done = function() {
        self.parent.vCloudPipe = new self.parent._jinq().from(self.parent.vCloudPipe).delete().at(function(col, index) { return col[index].rec.Id === self.rec.Id; }).select();
        delete self;
        if(self.callback) process.nextTick(callback, self.err, self.data, self.param);
    };
};