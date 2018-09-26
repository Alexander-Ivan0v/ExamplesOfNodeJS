'esversion: 6';

module.exports = new Cherwell();

function Cherwell() {
    var self = this;

    this._myModuleName = 'Cherwell';
    this.moduleName = function() { return self._myModuleName; };
    this.ver = function() { return '0.0.1'; };
    this.txtDescr = function() { return "This module intended for working with Cherwell ITSM Tool. It Functions are:\r\n1. Obtain Tickets from a given Groups\r\n2. Make a different kind of statistics"; };
    this.htmlDescr = function() { return "This module intended for working with Cherwell ITSM Tool. It Functions are:<ol><li>Obtain Tickets from a given Groups</li><li>Make a different kind of statistics<li></ol>"; };
    this._httpStatus = require('http-status-codes');
    this._soap = require('soap');
    this._fs = require('fs');
    this._xml2js = require('xml2js');
    this._crypto = require('crypto');
    this._jinq = require('jinq');
    this._os = require('os');
    this._path = require('path');
    this._nodemailer = require('nodemailer');    
    this.cherwellCfg = JSON.parse(self._fs.readFileSync(self._path.resolve(__dirname, 'cherwell.cfg'), 'utf8'));
    this._restClient = require('node-rest-client').Client;
    this._rest = new this._restClient(self.cherwellCfg.restClient);
    this.iterationNum = 0;
    this.excludeThisTickets = [];
    this.db = {};
    this._timoutTimer = null;
    this._badTimer = null;
    this._immediatePreparationTimer = null;
    this._common = null;
    this._const = null;
    this._sql = null;
    this._ad = null;
    this._auth = null;
    this._registerHandler = null;
    this._unregisterHandler = null;
    this._subscribers = null;
    this._newRoleBuilder = null;
    this._makeResponse = null;
    this._getHandlerPathPrefix = null;
    this.getLogLevel = null;
    this.id = null;

    this._cwCall = null;
    this._loggedIn = false;
    this.loggedIn = function(loggedIn) {
        if (loggedIn) self._loggedIn = loggedIn;
        else return self._loggedIn;
    };
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

        // Method: Get
        self._registerHandler('/about', 'get', self._getAbout, null, self, false, true, 'About Cherwell module', 'About Cherwell module', null);
        self._registerHandler('/queue', 'get', self._getQueue, self._newRoleBuilder().and('CherwellStatViewer').not('guest'), self, false, true, 'Get Tickets from all Queues', 'Get Tickets from all Queues', null);
        //self._registerHandler('/cqueue/:queueId', 'get', self._getTicket, self._newRoleBuilder().and('CherwellStatViewer').not('guest'), self, false, true, 'Get Tickets from Queue', 'Get Tickets from the specific Queue', null);
        self._registerHandler('/queue/:queueId', 'get', self._getQueue, self._null, self, false, true, 'Get Tickets from Queue', 'Get Tickets from the specific Queue', null);
        //self._registerHandler('/ticket/:ticketId', 'get', self._getTicket, self._newRoleBuilder().and('CherwellStatViewer').not('guest'), self, false, true, 'Get concreate Ticket', 'Get concreate Ticket', null);
        self._registerHandler('/ticket/:ticketId', 'get', self._getTicket, self._newRoleBuilder().and('CherwellStatViewer'), self, false, true, 'Get concreate Ticket', 'Get concreate Ticket', null);
        self._registerHandler('/ticket/:ticketId/:outType', 'get', self._getTicket, null, self, false, true, 'Get concreate Ticket', 'Get concreate Ticket', null);
        //self._registerHandler('/stat/:dateFrom/:dateTo', 'get', self._getMbx, self._newRoleBuilder().and('CherwellStatViewer').not('guest'), self, false, true, 'Get Tickets stat on period', 'Get Tickets statistics on the defined period', null);
        self._registerHandler('/stat/:dateFrom/:dateTo', 'get', self._getMbx, null, self, false, true, 'Get Tickets stat on period', 'Get Tickets statistics on the defined period', null);
        self._registerHandler('/queue/:queueId/stat/:dateFrom/:dateTo', 'get', self._getMbx, self._newRoleBuilder().and('CherwellStatViewer').not('guest'), self, false, true, 'Get Tickets stat on period', 'Get Tickets statistics on the defined period from concreate Queue', null);
        // Method: Post
        self._registerHandler('/ticket', 'post', self._getMbx, self._newRoleBuilder().and('CherwellStatViewer').not('guest'), self, false, true, 'Change Ticket data', 'Change some data on concreate Ticket', null);

        self.checkAndSyncDbScema();
        self._db.Rol.findOrCreate({ where: { Name: 'CherwellStatViewer', Descr: 'View all available Cherwell statistics' } }).spread(self._preparationCallback);

        return self;
    };
    this.checkAndSyncDbScema = function() {
        // Cherwell Database part
        self._db.Status = self._connection.define('Status', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true, unique: true },
            Name: { type: self._sql.STRING(50), allowNull: false, unique: true }
        }, { freezeTableName: true, timestamps: false }, { name: { singular: 'Status', plural: 'Status' } });
        self._db.Prty = self._connection.define('Prty', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true, unique: true },
            Name: { type: self._sql.INTEGER, allowNull: false, unique: true }
        }, { freezeTableName: true, timestamps: false }, { name: { singular: 'Prty', plural: 'Prty' } });
        self._db.IncidentType = self._connection.define('IncidentType', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true, unique: true },
            Name: { type: self._sql.STRING(50), allowNull: false, unique: true }
        }, { freezeTableName: true, timestamps: false }, { name: { singular: 'IncidentType', plural: 'IncidentType' } });
        self._db.ClosedBy = self._connection.define('ClosedBy', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true, unique: true },
            Name: { type: self._sql.STRING(100), allowNull: true, unique: true }
        }, { freezeTableName: true, timestamps: false }, { name: { singular: 'ClosedBy', plural: 'ClosedBy' } });
        self._db.DisplayName = self._connection.define('DisplayName', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true, unique: true },
            Name: { type: self._sql.STRING(100), allowNull: true, unique: true }
        }, { freezeTableName: true, timestamps: false }, { name: { singular: 'DisplayName', plural: 'DisplayName' } });
        self._db.OwnedBy = self._connection.define('OwnedBy', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true, unique: true },
            Name: { type: self._sql.STRING(100), allowNull: true, unique: true }
        }, { freezeTableName: true, timestamps: false }, { name: { singular: 'OwnedBy', plural: 'OwnedBy' } });
        self._db.LastModBy = self._connection.define('LastModBy', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true, unique: true },
            Name: { type: self._sql.STRING(100), allowNull: true, unique: true }
        }, { freezeTableName: true, timestamps: false }, { name: { singular: 'LastModBy', plural: 'LastModBy' } });
        self._db.Description = self._connection.define('Description', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true, unique: true },
            Name: { type: self._sql.STRING(32768), allowNull: true, unique: true },
            Hash: { type: self._sql.STRING(32), allowNull: false, unique: true }
        }, { freezeTableName: true, timestamps: false }, { name: { singular: 'Description', plural: 'Description' } });
        self._db.OwnedByTeam = self._connection.define('OwnedByTeam', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true, unique: true },
            Name: { type: self._sql.STRING(100), allowNull: true, unique: true }
        }, { freezeTableName: true, timestamps: false }, { name: { singular: 'OwnedByTeam', plural: 'OwnedByTeam' } });
        self._db.Modified = self._connection.define('Modified', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true, unique: true },
            LastModifiedDateTime: { type: self._sql.DATE, allowNull: true, unique: true }
        }, { freezeTableName: true, timestamps: false }, { name: { singular: 'Modified', plural: 'Modified' } });

        self._db.Ticket = self._connection.define('Ticket', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true },
            IncidentId: { type: self._sql.STRING(10), allowNull: false, unique: true },
            SLAResolveByDeadline: { type: self._sql.DATE, allowNull: true },
            CreatedDateTime: { type: self._sql.DATE, allowNull: false },
            BATOLAResolutionWarning: { type: self._sql.DATE, allowNull: true },
            CherwellId: { type: self._sql.STRING(50), allowNull: false, unique: true },
            Dat: { type: self._sql.DATE, allowNull: false, defaultValue: self._sql.NOW },
            ClosedDateTime: { type: self._sql.DATE, allowNull: true },
            IsNewOne: { type: self._sql.BOOLEAN, allowNull: true },
        }, { freezeTableName: true, timestamps: false });

        self._db.TicketStatus = self._connection.define('TicketStatus', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true },
            Ticket: { type: self._sql.BIGINT, allowNull: false, references: { model: self._db.Ticket, key: 'Id' } },
            Status: { type: self._sql.BIGINT, allowNull: false, references: { model: self._db.Status, key: 'Id' } },
            Dat: { type: self._sql.DATE, allowNull: false, defaultValue: self._sql.NOW },
        }, { freezeTableName: true, timestamps: false });
        self._db.TicketIncidentType = self._connection.define('TicketIncidentType', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true },
            Ticket: { type: self._sql.BIGINT, allowNull: false, references: { model: self._db.Ticket, key: 'Id' } },
            IncidentType: { type: self._sql.BIGINT, allowNull: false, references: { model: self._db.IncidentType, key: 'Id' } },
            Dat: { type: self._sql.DATE, allowNull: false, defaultValue: self._sql.NOW },
        }, { freezeTableName: true, timestamps: false });
        self._db.TicketPrty = self._connection.define('TicketPrty', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true },
            Ticket: { type: self._sql.BIGINT, allowNull: false, references: { model: self._db.Ticket, key: 'Id' } },
            Prty: { type: self._sql.BIGINT, allowNull: false, references: { model: self._db.Prty, key: 'Id' } },
            Dat: { type: self._sql.DATE, allowNull: false, defaultValue: self._sql.NOW },
        }, { freezeTableName: true, timestamps: false });
        self._db.TicketClosedBy = self._connection.define('TicketClosedBy', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true },
            Ticket: { type: self._sql.BIGINT, allowNull: false, references: { model: self._db.Ticket, key: 'Id' } },
            ClosedBy: { type: self._sql.BIGINT, allowNull: false, references: { model: self._db.ClosedBy, key: 'Id' } },
            Dat: { type: self._sql.DATE, allowNull: false, defaultValue: self._sql.NOW },
        }, { freezeTableName: true, timestamps: false });
        self._db.TicketOwnedBy = self._connection.define('TicketOwnedBy', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true },
            Ticket: { type: self._sql.BIGINT, allowNull: false, references: { model: self._db.Ticket, key: 'Id' } },
            OwnedBy: { type: self._sql.BIGINT, allowNull: false, references: { model: self._db.OwnedBy, key: 'Id' } },
            Dat: { type: self._sql.DATE, allowNull: false, defaultValue: self._sql.NOW },
        }, { freezeTableName: true, timestamps: false });
        self._db.TicketDisplayName = self._connection.define('TicketDisplayName', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true },
            Ticket: { type: self._sql.BIGINT, allowNull: false, references: { model: self._db.Ticket, key: 'Id' } },
            DisplayName: { type: self._sql.BIGINT, allowNull: false, references: { model: self._db.DisplayName, key: 'Id' } },
            Dat: { type: self._sql.DATE, allowNull: false, defaultValue: self._sql.NOW },
        }, { freezeTableName: true, timestamps: false });
        self._db.TicketOwnedByTeam = self._connection.define('TicketOwnedByTeam', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true },
            Ticket: { type: self._sql.BIGINT, allowNull: false, references: { model: self._db.Ticket, key: 'Id' } },
            OwnedByTeam: { type: self._sql.BIGINT, allowNull: false, references: { model: self._db.OwnedByTeam, key: 'Id' } },
            Dat: { type: self._sql.DATE, allowNull: false, defaultValue: self._sql.NOW },
        }, { freezeTableName: true, timestamps: false });
        self._db.TicketLastModBy = self._connection.define('TicketLastModBy', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true },
            Ticket: { type: self._sql.BIGINT, allowNull: false, references: { model: self._db.Ticket, key: 'Id' } },
            LastModBy: { type: self._sql.BIGINT, allowNull: false, references: { model: self._db.LastModBy, key: 'Id' } },
            Dat: { type: self._sql.DATE, allowNull: false, defaultValue: self._sql.NOW },
        }, { freezeTableName: true, timestamps: false });
        self._db.TicketDescription = self._connection.define('TicketDescription', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true },
            Ticket: { type: self._sql.BIGINT, allowNull: false, references: { model: self._db.Ticket, key: 'Id' } },
            Description: { type: self._sql.BIGINT, allowNull: false, references: { model: self._db.Description, key: 'Id' } },
            Dat: { type: self._sql.DATE, allowNull: false, defaultValue: self._sql.NOW },
        }, { freezeTableName: true, timestamps: false });
        self._db.TicketModified = self._connection.define('TicketModified', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true },
            Ticket: { type: self._sql.BIGINT, allowNull: false, references: { model: self._db.Ticket, key: 'Id' } },
            Modified: { type: self._sql.BIGINT, allowNull: false, references: { model: self._db.Modified, key: 'Id' } },
            Dat: { type: self._sql.DATE, allowNull: false, defaultValue: self._sql.NOW },
        }, { freezeTableName: true, timestamps: false });
        self._db.TicketDescription = self._connection.define('TicketDescription', {
            Id: { type: self._sql.BIGINT, primaryKey: true, autoIncrement: true },
            Ticket: { type: self._sql.BIGINT, allowNull: false, references: { model: self._db.Ticket, key: 'Id' } },
            Description: { type: self._sql.BIGINT, allowNull: false, references: { model: self._db.Description, key: 'Id' } },
        }, { freezeTableName: true, timestamps: false });




        //self._db.Ticket.belongsTo(self._db.IncidentType, { foreignKey: 'IncidentType', targetKey: 'Id', });
        //self._db.IncidentType.hasMany(self._db.Ticket, { foreignKey: 'IncidentType' });

        self._db.Ticket.belongsToMany(self._db.Status, { through: 'TicketStatus', foreignKey: 'Ticket' });
        self._db.Status.belongsToMany(self._db.Ticket, { through: 'TicketStatus', foreignKey: 'Status' });

        self._db.Ticket.belongsToMany(self._db.IncidentType, { through: 'TicketIncidentType', foreignKey: 'Ticket' });
        self._db.IncidentType.belongsToMany(self._db.Ticket, { plural: 'IncidentType', through: 'TicketIncidentType', foreignKey: 'IncidentType' });

        self._db.Ticket.belongsToMany(self._db.Prty, { through: 'TicketPrty', foreignKey: 'Ticket' });
        self._db.Prty.belongsToMany(self._db.Ticket, { through: 'TicketPrty', foreignKey: 'Prty' });

        self._db.Ticket.belongsToMany(self._db.ClosedBy, { through: 'TicketClosedBy', foreignKey: 'Ticket' });
        self._db.ClosedBy.belongsToMany(self._db.Ticket, { through: 'TicketClosedBy', foreignKey: 'ClosedBy' });

        self._db.Ticket.belongsToMany(self._db.OwnedBy, { through: 'TicketOwnedBy', foreignKey: 'Ticket' });
        self._db.OwnedBy.belongsToMany(self._db.Ticket, { through: 'TicketOwnedBy', foreignKey: 'OwnedBy' });

        self._db.Ticket.belongsToMany(self._db.DisplayName, { through: 'TicketDisplayName', foreignKey: 'Ticket' });
        self._db.DisplayName.belongsToMany(self._db.Ticket, { through: 'TicketDisplayName', foreignKey: 'DisplayName' });

        self._db.Ticket.belongsToMany(self._db.LastModBy, { through: 'TicketLastModBy', foreignKey: 'Ticket' });
        self._db.LastModBy.belongsToMany(self._db.Ticket, { through: 'TicketLastModBy', foreignKey: 'LastModBy' });

        self._db.Ticket.belongsToMany(self._db.OwnedByTeam, { through: 'TicketOwnedByTeam', foreignKey: 'Ticket' });
        self._db.OwnedByTeam.belongsToMany(self._db.Ticket, { through: 'TicketOwnedByTeam', foreignKey: 'OwnedByTeam' });

        self._db.Ticket.belongsToMany(self._db.Description, { through: 'TicketDescription', foreignKey: 'Ticket' });
        self._db.Description.belongsToMany(self._db.Ticket, { through: 'TicketDescription', foreignKey: 'Description' });

        self._db.Ticket.belongsToMany(self._db.Modified, { through: 'TicketModified', foreignKey: 'Ticket' });
        self._db.Modified.belongsToMany(self._db.Ticket, { through: 'TicketModified', foreignKey: 'Modified' });

        self._db.Ticket.belongsToMany(self._db.Description, { through: 'TicketDescription', foreignKey: 'Ticket' });
        self._db.Description.belongsToMany(self._db.Ticket, { through: 'TicketDescription', foreignKey: 'Description' });
    };
    // ---------------- Continuesly get Cherwell tickets from the selected group support start ---------------
    this.notifyAboutBadTimeout = function(req, res) {
        if(self._badTimer) {
            clearTimeout(self._badTimer);
            self._badTimer = null;
        }
        if (self._preparationCallbackTimer) {
            clearTimeout(self._preparationCallbackTimer);
            self._preparationCallbackTimer = null;
        }
        if (self._immediatePreparationTimer) {
            clearImmediate(self._immediatePreparationTimer);
            self._immediatePreparationTimer = null;
        }

        // Send notifications about Absence of connectivity
        try {
            // SMTP
            if(self.cherwellCfg.disconnection.email.send && self.cherwellCfg.disconnection.email.to && self.cherwellCfg.disconnection.email.mail.subject && self.cherwellCfg.disconnection.email.mail.body) {
                let transporter = self._nodemailer.createTransport({
                    host: self.cherwellCfg.smtp.server,
                    port: self.cherwellCfg.smtp.port,
                    ignoreTLS: true,
                });
                transporter.verify(function(err, success) {
                    if (err) {
                        err.error_message = err.message;
                        err.stack_trace = err.stack;
                        self._common.toLog(self.moduleName() + '.notifyAboutBadTimeout: SMTP Server is not ready to take our messages:\r\n' + JSON.stringify(err), "error");
                        transporter = null;
                    } else if(success){
                        self._common.toLog(self.moduleName() + '.notifyAboutBadTimeout: SMTP Server is ready to take our messages');
                    }
                });

                self._common.toLog("Sending e-mail to [" + self.cherwellCfg.disconnection.email.to + "] regarding absence of connectivity");
                transporter.sendMail({
                        from: self.cherwellCfg.smtp.from,
                        to: self.cherwellCfg.disconnection.email.to,
                        cc: self.cherwellCfg.disconnection.email.cc,
                        bcc: self.cherwellCfg.disconnection.email.bcc,
                        subject: self.cherwellCfg.disconnection.email.mail.subject.replace('{interval}', self.cherwellCfg.disconnection.interval),
                        html: self.cherwellCfg.disconnection.email.mail.body.replace('{interval}', self.cherwellCfg.disconnection.interval),
                    },
                    self.afterEmailSent
                );
            }
            // SMS
            if(self.cherwellCfg.disconnection.sms.send && self.cherwellCfg.disconnection.sms.to && self.cherwellCfg.disconnection.sms.text) {
                for (j = 0; j < self.cherwellCfg.groups[i].sms.to.length; j++) {
                    self._common.toLog("Sending SMS to [" + self.cherwellCfg.disconnection.sms.to[j] + "] regarding absence of connectivity");
                    var qqq = self.cherwellCfg.sms.uri
                        .replace('{id}', self.cherwellCfg.sms.id)
                        .replace('{key}', self.cherwellCfg.sms.key)
                        .replace('{from}', encodeURIComponent(self.cherwellCfg.sms.from))
                        .replace('{to}', encodeURIComponent(self.cherwellCfg.disconnection.sms.to[j].replace('+', '')))
                        .replace('{text}', encodeURIComponent(self.cherwellCfg.disconnection.sms.text.replace('{interval}', self.cherwellCfg.disconnection.interval)));
                    //self._rest.get( qqq, self.afterSmsSent).on('error', function (err) {
                    //    self._common.toLog(self.moduleName() + ".notifyAboutBadTimeout Send SMS Error:\r\n" + err.message + "\r\n" + JSON.stringify(err.request.options), "error");
                    //});
                }
            }
            // Voice            
            if(self.cherwellCfg.disconnection.voice.send && self.cherwellCfg.disconnection.voice.to) {
                for (j = 0; j < self.cherwellCfg.groups[i].voice.to.length; j++) {
                    self._common.toLog("Doing voice call to [" + self.cherwellCfg.disconnection.voice.to[j] + "] regarding absence of connectivity");
                    self._rest.get( self.cherwellCfg.voice.uri.replace('{to}', self.cherwellCfg.groups[i].voice.to[j].replace('+', '')), self.afterVoiceSent).on('error', function (err) {
                        self._common.toLog(self.moduleName() + ".notifyAboutBadTimeout Voice Call Error:\r\n" + err.message + "\r\n" + JSON.stringify(err.request.options), "error");
                    });
                }
            }            
    }
    catch(ex) {
        self._common.toLog(self.moduleName() + ".notifyAboutBadTimeout Exception: " + ex.message, "error");
    }

        // Engage timers to call getCherwellTickets again
        process.nextTick( self.waitForNewIteration, ["<Connectivity issue>"]);
    };
    this.getCherwellTickets = function(callback, req, res) {
        if (self._preparationCallbackTimer) {
            clearTimeout(self._preparationCallbackTimer);
            self._preparationCallbackTimer = null;
        }
        if (self._immediatePreparationTimer) {
            clearImmediate(self._immediatePreparationTimer);
            self._immediatePreparationTimer = null;
        }
        self._cwCall = new CwCall(req, res);
        self._soap.createClient(self.cherwellCfg.uri, function(err, client) {
            self._cwCall.err(err);
            self._cwCall.client(client);
            if (!err && client) {
                if(self._badTimer) {
                    clearTimeout(self._badTimer);
                    self._badTimer = null;
                }
                self.prepareSeq(client, callback, req, res);
                self.getUnnecessaryTicketIds();
            } else {
                // Switch on disconnection reporting timer
                if(!self._badTimer) {
                    self._badTimer = setTimeout(self.notifyAboutBadTimeout, self.cherwellCfg.disconnection.interval * 1000 * 60, req, res);
                }
                // Report error
                self._common.toLog( self.moduleName() + ".getCherwellTickets Error: [" + self._cwCall.err() + "]", "error");
                // Engage timers to call self again
                if(!self._preparationCallbackTimer) 
                    self._preparationCallbackTimer = setTimeout(self.getCherwellTickets, (self.id + 1) * 1000 * 20, self.getCherwellTicketsCallback, req, res);
                else 
                    self._immediatePreparationTimer = setImmediate(self.getCherwellTickets, self.getCherwellTicketsCallback, req, res);
            }
        });
    };
    this.getUnnecessaryTicketIds = function() {
        var sql = `
        select distinct 
            t.CherwellId CherwellId 
        from 
            Ticket t, TicketStatus ts, Status s
        where
            ts.Ticket = t.Id and
            ts.Status = s.Id and
            (s.Id in (select Id from Status where UPPER(Name) in ('CLOSED', 'RESOLVED')) and t.CreatedDateTime < datetime(datetime(),'-'||'{daysBack}'||' days')) or
            t.ClosedDateTime is not null            
    `;
        self._connection.query(sql.split('{daysBack}').join(self.cherwellCfg.oldTicketsAfter)).then(self.getUnnecessaryTicketIdsCallback).catch(self.getUnnecessaryTicketIdsCallback);
    };
    this.getUnnecessaryTicketIdsCallback = function(result) {
        if (result.message && result.stack) {
            self._common.toLog(self.moduleName() + ": getUnnecessaryTicketIds Error: This fact is slow down process of tickets getting hardly.\r\nMessage:\r\n" + result.message + "\r\nStack:\r\n" + result.stack, 'error');
            self.excludeThisTickets = null;
        } else self.excludeThisTickets = result[0];
        // Start sequence
        self._cwCall.call();
    };
    this.getCherwellTicketsCallback = function(rec, isLast) {
        var name = ['<unknown>'];
        if (rec) {
            name = rec.name.split('~');
            if (!name[1]) name.push("");
            self._common.toLog(self.moduleName() + "[" + self.id + "]: " + name[0] + " [" + name[1] + "] IsLast: " + isLast);
        }
        if (isLast) { self.waitForNewIteration(name); }
    };
    this.clearIsNewOneStatus = function() {
        self._connection.query('update Ticket set IsNewOne = 0')
            .then(function(result) {
                self._common.toLog(self.moduleName() + ":clearIsNewOneStatus. Statuses cleared");
            }).catch(function(err) {
                err.error_message = err.message;
                err.stack_trace = err.stack;
                self._common.toLog(self.moduleName() + ":clearIsNewOneStatus. Error:" + JSON.stringify(err), "error");
            });
    };
    this.waitForNewIteration = function(name) {
        if (self.id === 0 || self.id == 1) {
            // If we are in debug or just #1 (first) instance in Throng do Mail, Sms & Voice notification
            if ((self.cherwellCfg.notFromFirstTime && self.iterationNum > 0) || !self.cherwellCfg.notFromFirstTime) {
                self.doNotification(null);
            }
        }
        // increment iteration number
        self.iterationNum++;

        if (self._cwCall) {
            delete self._cwCall;
            self.cwCall = null;
        }
        // Planning new time to start check
        self._common.toLog(self.moduleName() + "[" + self.id + "]: " + name[0] + ". Engage timer to check this queue again through " + self.cherwellCfg.checkInerval + " sec.");
        if (self._timoutTimer) clearInterval(self._timoutTimer);
        self._timoutTimer = setTimeout(process.nextTick, self.cherwellCfg.checkInerval * 1000, self.getCherwellTickets, self.getCherwellTicketsCallback);
    };
    // ---------------- Continuesly get Cherwell tickets from the selected group support end   ---------------

    this._preparationCallback = function(rol, created) {
        if (rol.dataValues) {
            self._common.toLog(self.moduleName() + "[" + self.id + "]: Necessary rights were set");
            // Clear all IsNewOne flags if below flag is false
            if (!self.cherwellCfg.holdPreviousIsNewOne) self.clearIsNewOneStatus();
            // Start to work randomly
            self._preparationCallbackTimer = setTimeout(self.getCherwellTickets, self.id * 500, self.getCherwellTicketsCallback);
        } else {
            self._common.toLog(self.moduleName() + "[" + self.id + "]: Error. Can't set necessary rights for module.");
            throw self.moduleName() + "[" + self.id + "]: Error. Can't set necessary rights for module.";
        }
    };
    this.getTicketsForGroup = function(result, grpName) {
        var tmp = [];
        for (j = 0; j < result.length; j++) {
            for (k = 0; k < result[j].OwnedByTeams.length; k++) {
                if (result[j].OwnedByTeams[k].Name.toLowerCase() == grpName.toLowerCase()) {
                    tmp.push(result[j]);
                }
            }
        }
        return tmp;
    };
    this.doNotification = function(param) {
        self._common.toLog(self.moduleName() + "[" + self.id + "]: Sending notification about new ticket(s)");
        self.getTicketEager({ IsNewOne: 1 }, function(err, result, param) {
            if (err) {

            } else {
                if (result && result.length && result.length > 0) {
                    let transporter = self._nodemailer.createTransport({
                        host: self.cherwellCfg.smtp.server,
                        port: self.cherwellCfg.smtp.port,
                        ignoreTLS: true,
                    });
                    // Email preparation
                    transporter.verify(function(err, success) {
                        if (err) {
                            err.error_message = err.message;
                            err.stack_trace = err.stack;
                            self._common.toLog('SMTP Server is not ready to take our messages:\r\n' + JSON.stringify(err), "error");
                            transporter = null;
                        } else if(success){
                            self._common.toLog('SMTP Server is ready to take our messages');
                        }
                    });

                    for (i = 0; i < self.cherwellCfg.groups.length; i++) {
                        var tmp = self.getTicketsForGroup(result, self.cherwellCfg.groups[i].name);
                        if (tmp && tmp.length && tmp.length > 0) {
                            // Email
                            if (self.cherwellCfg.groups[i].email.send && self.cherwellCfg.groups[i].email.to.length > 0) {
                                let txt = '',
                                    atLeastOneTicket = false;
                                tmp.forEach(function(itm, idx, arr) {
                                    if (self.cherwellCfg.groups[i].email.prty.indexOf(itm.Prties[0].Name) >= 0) {
                                        atLeastOneTicket = true;
                                        txt += self.cherwellCfg.smtp.tableRow
                                            .replace('{ticket}', itm.IncidentId)
                                            .replace('{ticketDate}', self._common.dateToStr(itm.CreatedDateTime))
                                            .replace('{date}', self._common.dateToStr(self._common.getDateTime()))
                                            .replace('{prty}', itm.Prties[0].Name)
                                            .replace('{descr}', itm.Descriptions[0].Name)
                                            .replace('{group}', self.cherwellCfg.groups[i].name) + "\r\n";
                                    }
                                });
                                txt = self.cherwellCfg.smtp.text.replace('{table}', self.cherwellCfg.smtp.tableHdr + txt);
                                if (transporter) {
                                    self._common.toLog("Sending e-mail to [" + self.cherwellCfg.groups[i].email.to + "] regarding new tickets count [" + tmp.length + "] for the group: [" + self.cherwellCfg.groups[i].name + "]");
                                    transporter.sendMail({
                                            from: self.cherwellCfg.smtp.from,
                                            to: self.cherwellCfg.groups[i].email.to,
                                            cc: self.cherwellCfg.groups[i].email.cc,
                                            bcc: self.cherwellCfg.groups[i].email.bcc,
                                            subject: self.cherwellCfg.smtp.subject.replace('{group}', self.cherwellCfg.groups[i].name).replace('{date}', self._common.dateToStr(self._common.getDateTime())),
                                            //text: txt,
                                            html: txt
                                        },
                                        self.afterEmailSent
                                    );
                                } else { self._common.toLog("There is no SMTP transport configured. It seems because it unable to send e-mail. See error(s) around.", "warn"); }
                            }
                            // Sms
                            if (self.cherwellCfg.groups[i].sms.send && self.cherwellCfg.groups[i].sms.to.length > 0) {
                                let txt = '',
                                    atLeastOneTicket = false;
                                tmp.forEach(function(itm, idx, arr) {
                                    if (self.cherwellCfg.groups[i].sms.prty.indexOf(itm.Prties[0].Name) >= 0) {
                                        atLeastOneTicket = true;
                                        txt += self.cherwellCfg.sms.text
                                            .replace('{ticket}', itm.IncidentId)
                                            .replace('{ticketDate}', self._common.dateToStr(itm.CreatedDateTime))
                                            .replace('{date}', self._common.dateToStr(self._common.getDateTime()))
                                            .replace('{prty}', itm.Prties[0].Name)
                                            .replace('{group}', self.cherwellCfg.groups[i].name) + "\r\n";
                                    }
                                });
                                if (atLeastOneTicket) {
                                    for (j = 0; j < self.cherwellCfg.groups[i].sms.to.length; j++) {
                                        var wholeText = self.cherwellCfg.sms.hdr
                                            .replace('{group}', self.cherwellCfg.groups[i].name)
                                            .replace('{date}', self._common.dateToStr(self._common.getDateTime())) + "\r\n" + txt +
                                            self.cherwellCfg.sms.ftr
                                            .replace('{group}', self.cherwellCfg.groups[i].name)
                                            .replace('{date}', self._common.dateToStr(self._common.getDateTime()));
                                        self._common.toLog("Sending SMS to [" + self.cherwellCfg.groups[i].sms.to[j] + "] regarding new tickets for the group: [" + self.cherwellCfg.groups[i].name + "] with text: \r\n----------------------------\r\n" + wholeText + "\r\n----------------------------\r\n");
                                        var qqq = self.cherwellCfg.sms.uri
                                            .replace('{id}', self.cherwellCfg.sms.id)
                                            .replace('{key}', self.cherwellCfg.sms.key)
                                            .replace('{from}', encodeURIComponent(self.cherwellCfg.sms.from))
                                            .replace('{to}', encodeURIComponent(self.cherwellCfg.groups[i].sms.to[j].replace('+', '')))
                                            .replace('{text}', encodeURIComponent(wholeText));
                                        //self._rest.get(qqq, self.afterSmsSent).on('error', function (err) {
                                        //    self._common.toLog(self.moduleName() + ".doNotification send Sms Error:\r\n" + err.message + "\r\n" + JSON.stringify(err.request.options), "error");
                                        //});
                                    }
                                }
                            }
                            //Voice
                            if (self.cherwellCfg.groups[i].voice.send && self.cherwellCfg.groups[i].voice.to.length > 0) {
                                let txt = '',
                                    atLeastOneTicket = false;
                                tmp.forEach(function(itm, idx, arr) {
                                    if (self.cherwellCfg.groups[i].voice.prty.indexOf(itm.Prties[0].Name) >= 0) { atLeastOneTicket = true; }
                                });
                                if (atLeastOneTicket) {
                                    for (j = 0; j < self.cherwellCfg.groups[i].voice.to.length; j++) {
                                        self._common.toLog("Doing voice call to [" + self.cherwellCfg.groups[i].voice.to[j] + "] regarding new tickets for the group: [" + self.cherwellCfg.groups[i].name + "]");
                                        //self._rest.get(self.cherwellCfg.voice.uri.replace('{to}', self.cherwellCfg.groups[i].voice.to[j].replace('+', '')), self.afterVoiceSent).on('error', function (err) {
                                        //    self._common.toLog(self.moduleName() + ".doNotification Vice Call Error:\r\n" + err.message + "\r\n" + JSON.stringify(err.request.options), "error");
                                        //});
                                    }
                                }
                            }
                        }
                    }

                    self.clearIsNewOneStatus();
                }
            }
        }, param);

    };
    this.afterEmailSent = function(err, info) {
        if (err) {} else { self._common.toLog(self.moduleNamne() + "Mail sent. Info: " + info); }
    };
    this.afterSmsSent = function(data, response) {
        if (response && response.statusCode == 200 && data && data.status === 0) {
            self._common.toLog(self.moduleName() + ": SMS sent OK. ID:[" + data.description + "]");
        } else { self._common.toLog(self.moduleName() + ": Send SMS error: [" + response.statusCode + "] message: [" + response.statusMessage + "]. SMS Status:[" + data.status + "] SMS Description:[" + data.description + "]"); }
    };
    this.afterVoiceSent = function(data, response) {
        if (response && response.statusCode == 200 && data && data.result == 1) {
            self._common.toLog(self.moduleName() + ": Call has been done. Medi Session ID:[" + data.media_session_access_url + "]");
        } else { self._common.toLog(self.moduleName() + ": Voice call error: [" + response.statusCode + "] message: [" + response.statusMessage + "]. SMS Status:[" + data.result + "] Message:[" + data.Content + "]"); }
    };
    // ================== HTTP Methods work start =====================
    this._getAbout = function(req, res) {
        res.status(self._httpStatus.OK).send(
            self._makeResponse(self._httpStatus.OK, { name: self.moduleName(), ver: self.ver(), txtDescr: self.txtDescr(), htmlDescr: self.htmlDescr() })
        );
        return;
    };

    this._getQueue = function(req, res) {
        if (self._sql.connected()) {
            switch (req.route.path) {
                case self._path.join(self._getHandlerPathPrefix(), '/cherwell/queue/:queueId').split('\\').join('/'):
                    {
                        break;
                    }
                case self._path.join(self._getHandlerPathPrefix(), '/cherwell/queue').split('\\').join('/'):
                    {
                        break;
                    }
            }
        } else {
            res.status(self._httpStatus.INTERNAL_ERROR).send(
                self._makeResponse(self._httpStatus.INTERNAL_ERROR, { message: "There is no connection to SQL" })
            );
        }
        return;
    };

    this._getTicket = function(req, res) {
        if (self._connection.connected()) {
            switch (req.route.path) {
                case self._path.join(self._getHandlerPathPrefix(), '/cherwell/ticket/:ticketId').split('\\').join('/'):
                    {
                        self.getTicketEager({ $or: [{ IncidentId: req.params.ticketId }, { CherwellId: req.params.ticketId }] }, self.getTicketCallback, { req: req, res: res });
                        break;
                    }
                case self._path.join(self._getHandlerPathPrefix(), '/cherwell/ticket/:ticketId/:outType').split('\\').join('/'):
                    {
                        if (req.params.outType.toLowerCase() == 'json' || req.params.outType.toLowerCase() == 'pdf' || req.params.outType.toLowerCase() == 'html') {

                        } else {
                            res.status(self._httpStatus.NOT_FOUND).send(
                                self._makeResponse(self._httpStatus.NOT_FOUND, { message: "Unknown output format: [" + req.params.outType + "]" })
                            );
                        }
                    }
            }
        } else {
            res.status(self._httpStatus.INTERNAL_ERROR).send(
                self._makeResponse(self._httpStatus.INTERNAL_ERROR, { message: "There is no connection to SQL" })
            );
        }
        return;
    };

    this._getMbx = function(req, res) {
        //
    };
    // ================== HTTP Methods work end   =====================

    // ================= HTTP Methods callbacks start =================
    this.convertTicketDatesToDateTime = function(itm) {
        if (itm.BATOLAResolutionWarning && typeof itm.BATOLAResolutionWarning == 'string') itm.BATOLAResolutionWarning = new Date(itm.BATOLAResolutionWarning);
        if (itm.ClosedDateTime && typeof itm.ClosedDateTime == 'string') itm.ClosedDateTime = new Date(itm.ClosedDateTime);
        if (itm.CreatedDateTime && typeof itm.CreatedDateTime == 'string') itm.CreatedDateTime = new Date(itm.CreatedDateTime);
        if (itm.Dat && typeof itm.Dat == 'string') itm.Dat = new Date(itm.Dat);
        if (itm.LastModifiedDateTime && typeof itm.LastModifiedDateTime == 'string') itm.LastModifiedDateTime = new Date(itm.LastModifiedDateTime);
        if (itm.SLAResolveByDeadline && typeof itm.SLAResolveByDeadline == 'string') itm.SLAResolveByDeadline = new Date(itm.SLAResolveByDeadline);

    };
    this.getTicketCallback = function(err, result, param) {
        if (err) {
            self._makeResponse(self._httpStatus.INTERNAL_ERROR, { message: err.message });
        } else if (result && result.length > 0) {
            result.recordset.forEach(function(itm, idx, arr) {
                self.convertTicketDatesToDateTime(itm);
            });
        }
        param.res.status(self._httpStatus.OK).send(self._makeResponse(self._httpStatus.OK, result));
    };
    // ================= HTTP Methods callbacks end   =================

    // ================ Work with WSDL commands sequence start ==================
    this.prepareSeq = function(client, callback, req, res) {
        var param = { client: client, callback: callback, req: req, res: res };
        // Login
        self._cwCall.add({ name: "Login", func: client.Login, param: [{ userId: self.cherwellCfg.login, password: self.cherwellCfg.pass }], callback: self.wsdlMethodCallback, callbackParam: param });
        if (self.cherwellCfg.groups && self.cherwellCfg.groups.length > 0) {
            self.cherwellCfg.groups.forEach(function(itm, idx, arr) {
                // Get Tickets for group
                self._cwCall.add({ name: "GetTicketsForGroup~" + itm.name, func: client.QueryByFieldValue, param: [{ busObNameOrId: "Incident", fieldNameOrId: "OwnedByTeam", value: itm }], callback: self.wsdlMethodCallback, callbackParam: param });
            });
        }
        // Logoff
        self._cwCall.add({ name: "Logout", func: client.Logout, param: [], callback: self.wsdlMethodCallback, callbackParam: param });
    };
    this.calcMyTicketsToProcess = function(ticketsForGroup) {
        var ret = [],
            each = 0,
            start = 0,
            len = 0;
        try {
            if (ticketsForGroup && ticketsForGroup.length && ticketsForGroup.length > 0) {
                len = ticketsForGroup.length;
                if (!self._common.isInDebug() && self._os.cpus().length > 1) {
                    // Not in Debug and Multiple CPU used
                    // If throng used, then IDs starts from 1. If we are in debug, ID is single one and = 0;
                    each = Math.floor(ticketsForGroup.length / self._os.cpus().length);
                    start = (self.id - 1) * each;
                    len = each;
                    if (self.id == self._os.cpus().length) {
                        // Last instance will takes care about each + rest
                        len += ticketsForGroup.length % self._os.cpus().length;
                    }
                }
                for (i = start; i < start + len; i++) {
                    ret.push(ticketsForGroup[i]);
                }
            }
        } catch (ex) {
            self._common.toLog("Cherwell[" + self.id + "].calcMyTicketsToProcess Exception: []" + ex.message + "]", "error");
        } finally {
            self._common.toLog("Cherwell[" + self.id + "]. My tickets will be from [" + start + "] length [" + len + "] from [" + ticketsForGroup.length + "] total");
            return ret;
        }
    };
    this.wsdlMethodCallback = function(err, result, param) {
        if (err) {
            self._common.toLog(self.moduleName() + ".wsdlMethodCallback Error: Error: [" + JSON.stringify(err) + "].", "error");
            process.nextTick(self.waitForNewIteration, ["<WSDL Error>"]);
        }
        else {
            try {
                if(self._cwCall) {
                    var cmd = self._cwCall.current();
                }
                else {self._common.toLog(self.moduleName() + ".wsdlMethodCallback Warning: There is no _cwCall variable defined!","warn");}
            }
            catch(ex) {self._common.toLog(self.moduleName() + ".wsdlMethodCallback Error: [" + ex.message + "]","error");}
            if (cmd) {
                if (!err && result) {
                    switch (cmd.name.split('~')[0]) {
                        case 'Login':
                            {
                                // Login
                                if (result.LoginResult) {
                                    self.loggedIn(true);
                                    // Adding appropriate Cookie to the all further requests
                                    param.client.addHttpHeader("Cookie", param.client.lastResponseHeaders['set-cookie'][0]);
                                } else {
                                    self._common.toLog(self.moduleName() + "[" + self.id + "]: Login Error. Sequence will be skipped.", "error");
                                    self.loggedIn(false);
                                    // self.waitForNewIteration(['Login']);
                                }
                                break;
                            }
                        case 'GetTicketsForGroup':
                            {
                                // Get Tickets for Group
                                if (self.loggedIn() && result && result.QueryByFieldValueResult) {
                                    self._xml2js.parseString(result.QueryByFieldValueResult, { trim: true }, function(err, result) {
                                        if (err) { self._common.toLog('Cherwell[' + self.id + '].GetTicketsForGroup: xml2json convertion error.'); } else {
                                            if (result.CherwellQueryResult.Record && result.CherwellQueryResult.Record.length > 0) {
                                                var startStopTicketsForMe = self.calcMyTicketsToProcess(result.CherwellQueryResult.Record);
                                                if (startStopTicketsForMe.length > 0) {
                                                    startStopTicketsForMe.forEach(function(itm, idx, arr) {
                                                        // Check if they are necessary or they are Closed or Old ones
                                                        var tmp = new self._jinq()
                                                            .from(self.excludeThisTickets)
                                                            .where(function(row, idx) { return row.CherwellId == itm.$.RecId; })
                                                            .select();
                                                        if (!tmp || !tmp.length || tmp.length === 0) {
                                                            self._cwCall.insertAfter(
                                                                self._cwCall.currentIdx(), {
                                                                    name: "GetTicket~" + itm.$.RecId,
                                                                    func: param.client.GetBusinessObject,
                                                                    param: [{ busObNameOrId: "Incident", busObRecId: itm.$.RecId, includeHtmlFields: true }],
                                                                    callback: self.wsdlMethodCallback,
                                                                    callbackParam: param
                                                                });
                                                        } else self._common.toLog(self.moduleName() + "[" + self.id + "].GetTicketsForGroup skipped [" + itm.$.RecId + "] it is Closed or Old one", "warning");
                                                    });
                                                } else { self._common.toLog(self.moduleName() + "[" + self.id + "].GetTicketsForGroup: There is no items to process."); }
                                            }
                                        }
                                    });
                                }
                                break;
                            }
                        case 'GetTicket':
                            {
                                //if (!self.enough) {
                                self.enough = true;
                                // Get Tickets for Group
                                if (self.loggedIn() && result && result.GetBusinessObjectResult) {
                                    self._xml2js.parseString(result.GetBusinessObjectResult, { trim: true }, function(err, result) {
                                        if (err) { self._common.toLog('Cherwell[' + self.id + ']. : xml2json convertion error.'); } else {
                                            if (result.BusinessObject &&
                                                result.BusinessObject.FieldList &&
                                                result.BusinessObject.FieldList.length > 0 &&
                                                result.BusinessObject.FieldList[0].Field &&
                                                result.BusinessObject.FieldList[0].Field.length > 0) {
                                                var fld = {
                                                    cherwellId: null,
                                                    incidentId: null,
                                                    status: null,
                                                    description: null,
                                                    createdDateTime: null,
                                                    sLAResolveByDeadline: null,
                                                    incidentType: null,
                                                    ownedByTeam: null,
                                                    bATOLAResolutionWarning: null,
                                                    customerDisplayName: null,
                                                    priority: null,
                                                    ownedBy: null,
                                                    closedDateTime: null,
                                                    closedBy: null,
                                                    lastModifiedDateTime: null,
                                                    lastmodBy: null,
                                                };
                                                var nullDate = "0001-01-01T00:00:00";
                                                result.BusinessObject.FieldList[0].Field.forEach(function(itm, idx, arr) {
                                                    switch (itm.$.Name.toLowerCase()) {
                                                        case 'recid':
                                                            {
                                                                fld.cherwellId = itm._;
                                                                break;
                                                            }
                                                        case 'incidentid':
                                                            {
                                                                fld.incidentId = itm._;
                                                                break;
                                                            }
                                                        case 'status':
                                                            {
                                                                fld.status = itm._;
                                                                break;
                                                            }
                                                        case 'description':
                                                            {
                                                                fld.description = itm._.split("'").join("`");
                                                                break;
                                                            }
                                                        case 'slaresolvebydeadline':
                                                            {
                                                                if (itm._ !== nullDate) fld.sLAResolveByDeadline = new Date(itm._);
                                                                break;
                                                            }
                                                        case 'incidenttype':
                                                            {
                                                                fld.incidentType = itm._;
                                                                break;
                                                            }
                                                        case 'ownedbyteam':
                                                            {
                                                                if (!itm._) itm._ = null;
                                                                fld.ownedByTeam = itm._;
                                                                break;
                                                            }
                                                        case 'createddatetime':
                                                            {
                                                                if (itm._ !== nullDate) fld.createdDateTime = new Date(itm._);
                                                                break;
                                                            }
                                                        case 'batolaresolutionwarning':
                                                            {
                                                                if (itm._ !== nullDate) fld.bATOLAResolutionWarning = new Date(itm._);
                                                                break;
                                                            }
                                                        case 'customerdisplayname':
                                                            {
                                                                if (itm._) fld.customerDisplayName = itm._;
                                                                break;
                                                            }
                                                        case 'priority':
                                                            {
                                                                fld.priority = itm._;
                                                                break;
                                                            }
                                                        case 'ownedby':
                                                            {
                                                                if (!itm._) itm._ = null;
                                                                fld.ownedBy = itm._;
                                                                break;
                                                            }
                                                        case 'closeddatetime':
                                                            {
                                                                if (itm._ !== nullDate) fld.closedDateTime = new Date(itm._);
                                                                break;
                                                            }
                                                        case 'closedby':
                                                            {
                                                                if (itm._) fld.closedBy = itm._;
                                                                break;
                                                            }
                                                        case 'lastmodifieddatetime':
                                                            {
                                                                if (itm._ !== nullDate) fld.lastModifiedDateTime = new Date(itm._);
                                                                break;
                                                            }
                                                        case 'lastmodby':
                                                            {
                                                                if (itm._) fld.lastModBy = itm._;
                                                                break;
                                                            }
                                                    }
                                                });
                                                // --- Save To Database ---
                                                self.saveToDb(fld, function(err, result, param) {
                                                    if (err) {
                                                        err.error_message = err.message;
                                                        err.stack_trace = err.stack;
                                                        self._common.toLog(self.moduleName() + '[' + self.id + ']. : SaveToDb.Error [' + JSON.stringify(err) + ']', 'error');
                                                    } else { /*self._common.toLog(self.moduleName() + '[' + self.id + ']' + JSON.stringify(result));*/ }
                                                });
                                            }
                                        }

                                    });
                                }
                                break;
                                //} // if(!self.enough)
                            }
                        case 'Logout':
                            {
                                // Logoff
                                if (result.LogoutResult) self.loggedIn(false);
                                self._common.toLog(self.moduleName() + "[" + self.id + "]: Logged out");
                                break;
                            }
                    } // switch (cmd.name.split(' ')[0]) {
                }
            }
        }
        if (param && param.callback && typeof param.callback == 'function') { process.nextTick(param.callback, cmd, param.isLast); }
        if (param.isLast) {
            // All data received
        }
    };
    // ================ Work with WSDL commands sequence end   ==================

    // =============== SaveToDatabase start ==================
    this.saveToDb = function(fld, callback) {
        try {
            self._db.Modified.findOrCreate({ where: { LastModifiedDateTime: fld.lastModifiedDateTime } })
                .spread(function(recordset, created) {
                    fld.modifiedId = recordset.dataValues.Id;
                    self._db.Status.findOrCreate({ where: { Name: fld.status } })
                        .spread(function(recordset, created) {
                            fld.statusId = recordset.dataValues.Id;
                            self._db.IncidentType.findOrCreate({ where: { Name: fld.incidentType } })
                                .spread(function(recordset, created) {
                                    fld.incidentTypeId = recordset.dataValues.Id;
                                    self._db.Prty.findOrCreate({ where: { Name: fld.priority } })
                                        .spread(function(recordset, created) {
                                            fld.priorityId = recordset.dataValues.Id;
                                            self._db.ClosedBy.findOrCreate({ where: { Name: fld.closedBy } })
                                                .spread(function(recordset, created) {
                                                    fld.closedById = recordset.dataValues.Id;
                                                    self._db.OwnedBy.findOrCreate({ where: { Name: fld.ownedBy } })
                                                        .spread(function(recordset, created) {
                                                            fld.ownedById = recordset.dataValues.Id;
                                                            self._db.DisplayName.findOrCreate({ where: { Name: fld.customerDisplayName } })
                                                                .spread(function(recordset, created) {
                                                                    fld.displayNameId = recordset.dataValues.Id;
                                                                    self._db.OwnedByTeam.findOrCreate({ where: { Name: fld.ownedByTeam } })
                                                                        .spread(function(recordset, created) {
                                                                            fld.ownedByTeamId = recordset.dataValues.Id;
                                                                            self._db.LastModBy.findOrCreate({ where: { Name: fld.lastModBy } })
                                                                                .spread(function(recordset, created) {
                                                                                    fld.lastModById = recordset.dataValues.Id;
                                                                                    var hash = self._crypto.createHash('md5').update(fld.description).digest('hex');
                                                                                    self._db.Description.findAll({ where: { Hash: hash } })
                                                                                        .then(function(recordset) {
                                                                                            if (!recordset || recordset.length === 0) {
                                                                                                self._db.Description.findOrCreate({ where: { Name: fld.description, Hash: hash } })
                                                                                                    .spread(function(recordset, created) {
                                                                                                        fld.descriptionId = recordset.dataValues.Id;
                                                                                                        self.saveTicket(fld, callback);
                                                                                                    }).catch(function(err) { process.nextTick(callback, self.moduleName() + ". saveToDb.[Description].Error:" + err, null, fld); });
                                                                                            } else {
                                                                                                fld.descriptionId = recordset[0].dataValues.Id;
                                                                                                self.saveTicket(fld, callback);
                                                                                            }
                                                                                        }).catch(function(err) { process.nextTick(callback, self.moduleName() + ". saveToDb.[find Description].Error:" + err, null, fld); });
                                                                                }).catch(function(err) { process.nextTick(callback, self.moduleName() + ". saveToDb.[LastModBy].Error:" + err, null, fld); });
                                                                        }).catch(function(err) { process.nextTick(callback, self.moduleName() + ". saveToDb.[OwnedByTeam].Error:" + err, null, fld); });
                                                                }).catch(function(err) { process.nextTick(callback, self.moduleName() + ". saveToDb.[DisplayName].Error:" + err, null, fld); });
                                                        }).catch(function(err) { process.nextTick(callback, self.moduleName() + ". saveToDb.[OwnedBy].Error:" + err, null, fld); });
                                                }).catch(function(err) { process.nextTick(callback, self.moduleName() + ". saveToDb.[ClosedBy].Error:" + err, null, fld); });
                                        }).catch(function(err) { process.nextTick(callback, self.moduleName() + ". saveToDb.[Priority].Error:" + err, null, fld); });
                                }).catch(function(err) { process.nextTick(callback, self.moduleName() + ". saveToDb.[IncidentType].Error:" + err, null, fld); });
                        }).catch(function(err) { process.nextTick(callback, self.moduleName() + ". saveToDb.[Status].Error:" + err, null, fld); });
                }).catch(function(err) {
                    process.nextTick(callback, self.moduleName() + ". saveToDb.[Modified].Error:" + err, null, fld);
                });
        } catch (ex) { process.nextTick(callback, ex, res); }
    };
    this.updateTicketAsNewOne = function(ticketId) {
        if ((self.cherwellCfg.notFromFirstTime && self.iterationNum > 0) || !self.cherwellCfg.notFromFirstTime) {
            self._connection.query('update Ticket set IsNewOne = 1 where Id = ' + ticketId)
                .then(function(result) {
                    self._common.toLog(self.moduleName() + ": Ticket with Id=" + ticketId + " marked as NewOne");
                }).catch(function(err) {
                    err.error_message = err.message;
                    err.stack_trace = err.stack;
                    self._common.toLog(self.moduleName() + ":updateTicketAsNewOne. Error:" + JSON.stringify(err), "error");
                });
        }
    };
    this.createLink = function(table, fieldsAndTheyValues, newFldName, param) {
        // insert table
        table.create(fieldsAndTheyValues)
            .then(function(record) {
                param.fld[newFldName] = record.dataValues.Id;
            }).catch(function(err) {
                process.nextTick(param.callback, self.moduleName() + ". createLink.[" + table.name + "].Error:" + err, null, param.fld);
            });
    };
    this.updateTicketLinks = function(err, ticket, param) {
        if (err)
            process.nextTick(callback, self.moduleName() + ". saveTicket.[TicketStatus].Error:" + err, null, param.fld);

        if (ticket && ticket.length && ticket.length == 1 && param.fld) {

            // TicketModified
            self._db.TicketModified.findOrCreate({ where: { Ticket: ticket[0].Id, Modified: param.fld.modifiedId } })
                .spread(function(recordset, created) {
                    param.fld.ticketModifiedId = recordset.dataValues.Id;
                    // TicketStatus
                    var tbl = 'TicketStatus';
                    self._db.TicketStatus.findAll({
                            where: { Ticket: ticket[0].Id },
                            order: [
                                ['Dat', 'DESC']
                            ],
                            limit: 1
                        })
                        .then(function(recordset) {
                            if (recordset && recordset.length && recordset.length == 1) {
                                if (recordset[0].dataValues.Status != param.fld.statusId) {
                                    // It needs to track changing of some statuses:
                                    if (ticket[0].Statuses[0].dataValues.Name.toLowerCase() == 'closed' && ticket[0].Statuses[0].dataValues.Name.toLowerCase() != param.fld.status.toLowerCase()) {
                                        // Closed -> any other
                                        self.updateTicketAsNewOne(ticket[0].Id);
                                    } else if (ticket[0].Statuses[0].dataValues.Name.toLowerCase() == 'resolved' && ticket[0].Statuses[0].dataValues.Name.toLowerCase() != param.fld.status.toLowerCase() && ticket[0].Statuses[0].dataValues.Name.toLowerCase() != 'closed') {
                                        // Resolved -> any other except Closed
                                        self.updateTicketAsNewOne(ticket[0].Id);
                                    }
                                    self.createLink(self._db.TicketStatus, { Ticket: ticket[0].Id, Status: param.fld.statusId }, 'ticketStatusId', param);
                                }
                            } else { self.createLink(self._db.TicketStatus, { Ticket: ticket[0].Id, Status: param.fld.statusId }, 'ticketStatusId', param); }
                        }).catch(function(err) { process.nextTick(param.callback, self.moduleName() + ". updateTicketLinks.[" + tbl + ".findAll].Error:" + err, null, param.fld); });

                    // TicketIncidentType
                    tbl = 'TicketIncidentType';
                    self._db.TicketIncidentType.findAll({
                            where: { Ticket: ticket[0].Id },
                            order: [
                                ['Dat', 'DESC']
                            ],
                            limit: 1
                        })
                        .then(function(recordset) {
                            if (recordset && recordset.length && recordset.length == 1) {
                                if (recordset[0].dataValues.IncidentType != param.fld.incidentTypeId) { self.createLink(self._db.TicketIncidentType, { Ticket: ticket[0].Id, IncidentType: param.fld.incidentTypeId }, 'ticketIncidentTypeId', param); }
                            } else { self.createLink(self._db.TicketIncidentType, { Ticket: ticket[0].Id, IncidentType: param.fld.incidentTypeId }, 'ticketIncidentTypeId', param); }
                        }).catch(function(err) { process.nextTick(param.callback, self.moduleName() + ". updateTicketLinks.[" + tbl + ".findAll].Error:" + err, null, param.fld); });

                    // TicketClosedBy
                    tbl = 'TicketClosedBy';
                    self._db.TicketClosedBy.findAll({
                            where: { Ticket: ticket[0].Id },
                            order: [
                                ['Dat', 'DESC']
                            ],
                            limit: 1
                        })
                        .then(function(recordset) {
                            if (recordset && recordset.length && recordset.length == 1) {
                                if (recordset[0].dataValues.ClosedBy != param.fld.closedById) { self.createLink(self._db.TicketClosedBy, { Ticket: ticket[0].Id, ClosedBy: param.fld.closedById }, 'ticketClosedById', param); }
                            } else { self.createLink(self._db.TicketClosedBy, { Ticket: ticket[0].Id, ClosedBy: param.fld.closedById }, 'ticketClosedById', param); }
                        }).catch(function(err) { process.nextTick(param.callback, self.moduleName() + ". updateTicketLinks.[" + tbl + ".findAll].Error:" + err, null, param.fld); });

                    // TicketPrty
                    tbl = 'TicketPrty';
                    self._db.TicketPrty.findAll({
                            where: { Ticket: ticket[0].Id },
                            order: [
                                ['Dat', 'DESC']
                            ],
                            limit: 1
                        })
                        .then(function(recordset) {
                            if (recordset && recordset.length && recordset.length == 1) {
                                if (recordset[0].dataValues.Prty != param.fld.priorityId) { self.createLink(self._db.TicketPrty, { Ticket: ticket[0].Id, Prty: param.fld.priorityId }, 'ticketPrtyId', param); }
                            } else { self.createLink(self._db.TicketPrty, { Ticket: ticket[0].Id, Prty: param.fld.priorityId }, 'ticketPrtyId', param); }
                        }).catch(function(err) { process.nextTick(param.callback, self.moduleName() + ". updateTicketLinks.[" + tbl + ".findAll].Error:" + err, null, param.fld); });

                    // TicketOwnedBy
                    tbl = 'TicketOwnedBy';
                    self._db.TicketOwnedBy.findAll({
                            where: { Ticket: ticket[0].Id },
                            order: [
                                ['Dat', 'DESC']
                            ],
                            limit: 1
                        })
                        .then(function(recordset) {
                            if (recordset && recordset.length && recordset.length == 1) {
                                if (recordset[0].dataValues.OwnedBy != param.fld.ownedById) { self.createLink(self._db.TicketOwnedBy, { Ticket: ticket[0].Id, OwnedBy: param.fld.ownedById }, 'ticketOwnedById', param); }
                            } else { self.createLink(self._db.TicketOwnedBy, { Ticket: ticket[0].Id, OwnedBy: param.fld.ownedById }, 'ticketOwnedById', param); }
                        }).catch(function(err) { process.nextTick(param.callback, self.moduleName() + ". updateTicketLinks.[" + tbl + ".findAll].Error:" + err, null, param.fld); });

                    // TicketOwnedByTeam
                    tbl = 'TicketOwnedByTeam';
                    self._db.TicketOwnedByTeam.findAll({
                            where: { Ticket: ticket[0].Id },
                            order: [
                                ['Dat', 'DESC']
                            ],
                            limit: 1
                        })
                        .then(function(recordset) {
                            if (recordset && recordset.length && recordset.length == 1) {
                                if (recordset[0].dataValues.OwnedByTeam != param.fld.ownedByTeamId) {
                                    self.updateTicketAsNewOne(ticket[0].Id);
                                    self.createLink(self._db.TicketOwnedByTeam, { Ticket: ticket[0].Id, OwnedByTeam: param.fld.ownedByTeamId }, 'ticketOwnedByTeamId', param);
                                }
                            } else {
                                // Team changed. It needs to send notifications
                                self.updateTicketAsNewOne(ticket[0].Id);
                                self.createLink(self._db.TicketOwnedByTeam, { Ticket: ticket[0].Id, OwnedByTeam: param.fld.ownedByTeamId }, 'ticketOwnedByTeamId', param);
                            }
                        }).catch(function(err) { process.nextTick(param.callback, self.moduleName() + ". updateTicketLinks.[" + tbl + ".findAll].Error:" + err, null, param.fld); });

                    // TicketDisplayName
                    tbl = 'TicketDisplayName';
                    self._db.TicketDisplayName.findAll({
                            where: { Ticket: ticket[0].Id },
                            order: [
                                ['Dat', 'DESC']
                            ],
                            limit: 1
                        })
                        .then(function(recordset) {
                            if (recordset && recordset.length && recordset.length == 1) {
                                if (recordset[0].dataValues.DisplayName != param.fld.displayNameId) { self.createLink(self._db.TicketDisplayName, { Ticket: ticket[0].Id, DisplayName: param.fld.displayNameId }, 'ticketDisplayNameId', param); }
                            } else { self.createLink(self._db.TicketDisplayName, { Ticket: ticket[0].Id, DisplayName: param.fld.displayNameId }, 'ticketDisplayNameId', param); }
                        }).catch(function(err) { process.nextTick(param.callback, self.moduleName() + ". updateTicketLinks.[" + tbl + ".findAll].Error:" + err, null, param.fld); });

                    // TicketLastModBy
                    tbl = 'TicketLastModBy';
                    self._db.TicketLastModBy.findAll({
                            where: { Ticket: ticket[0].Id },
                            order: [
                                ['Dat', 'DESC']
                            ],
                            limit: 1
                        })
                        .then(function(recordset) {
                            if (recordset && recordset.length && recordset.length == 1) {
                                if (recordset[0].dataValues.LastModBy != param.fld.lastModById) { self.createLink(self._db.TicketLastModBy, { Ticket: ticket[0].Id, LastModBy: param.fld.lastModById }, 'ticketLastModById', param); }
                            } else { self.createLink(self._db.TicketLastModBy, { Ticket: ticket[0].Id, LastModBy: param.fld.lastModById }, 'ticketLastModById', param); }
                        }).catch(function(err) { process.nextTick(param.callback, self.moduleName() + ". updateTicketLinks.[" + tbl + ".findAll].Error:" + err, null, param.fld); });

                    // TicketDescription
                    tbl = 'TicketDescription';
                    self._db.TicketDescription.findAll({
                            where: { Ticket: ticket[0].Id },
                            order: [
                                ['Dat', 'DESC']
                            ],
                            limit: 1
                        })
                        .then(function(recordset) {
                            if (recordset && recordset.length && recordset.length == 1) {
                                if (recordset[0].dataValues.Description != param.fld.descriptionId) { self.createLink(self._db.TicketDescription, { Ticket: ticket[0].Id, Description: param.fld.descriptionId }, 'ticketDescriptionId', param); }
                            } else { self.createLink(self._db.TicketDescription, { Ticket: ticket[0].Id, Description: param.fld.descriptionId }, 'ticketDescriptionId', param); }
                        }).catch(function(err) { process.nextTick(param.callback, self.moduleName() + ". updateTicketLinks.[" + tbl + ".findAll].Error:" + err, null, param.fld); });
                }).catch(function(err) { process.nextTick(param.callback, self.moduleName() + ". updateTicketLinks.[TicketModify.findOrCreate].Error:" + err, null, param.fld); });
            self.getTicketEager({ CherwellId: param.fld.cherwellId }, param.callback, param.fld);
        } else { process.nextTick(param.callback, self.moduleName() + ". updateTicketLinks.Error: There is no Ticket or Fields defined", null, param.fld); }
    };
    this.saveTicket = function(fld, callback) {
        try {
            self._db.Ticket.findAll({ where: { CherwellId: fld.cherwellId } })
                .then(function(recordset) {
                    if (!recordset || (recordset && recordset.length === 0)) {
                        var isNewOne = false;
                        if ((self.cherwellCfg.notFromFirstTime && self.iterationNum > 0) || !self.cherwellCfg.notFromFirstTime) isNewOne = true;
                        self._db.Ticket.create({
                                IncidentId: fld.incidentId,
                                SLAResolveByDeadline: fld.sLAResolveByDeadline,
                                CreatedDateTime: fld.createdDateTime,
                                BATOLAResolutionWarning: fld.bATOLAResolutionWarning,
                                CherwellId: fld.cherwellId,
                                ClosedDateTime: fld.closedDateTime,
                                IsNewOne: isNewOne,
                            })
                            .then(function(recordset) {
                                if (recordset && recordset.dataValues && recordset.dataValues.Id) {
                                    fld.ticketId = recordset.dataValues.Id;
                                    self.getTicketEager({ CherwellId: fld.cherwellId }, self.updateTicketLinks, { callback: callback, fld: fld });
                                } else { process.nextTick(callback, self.moduleName() + ". saveTicket.[Ticket].Error: Ticket record was not created", null, fld); }
                            }).catch(function(err) { process.nextTick(callback, self.moduleName() + ". saveTicket.[Ticket].Error:" + err, null, fld); });
                    } else {
                        fld.ticketId = recordset[0].dataValues.Id;
                        // Ticket exists. Check if there were some new fields
                        if (fld.new) {
                            // Ticket exists but should be updated because something was changed.
                        }
                        self.getTicketEager({ CherwellId: fld.cherwellId }, self.updateTicketLinks, { callback: callback, fld: fld });
                    }
                }).catch(function(err) { process.nextTick(callback, self.moduleName() + ". saveToDb.[find Ticket].Error:" + err, null, fld); });
        } catch (ex) { process.nextTick(callback, "saveTicket.Exception: " + ex, res); }
    };
    this.getTicketEager = function(where, callback, param) {
        self._db.Ticket.findAll({
            where: where,
            include: [{
                    model: self._db.Status,
                    through: {
                        attributes: ['Dat'],
                        order: [
                            ['Dat', 'DESC']
                        ],
                    }
                },
                {
                    model: self._db.OwnedBy,
                    through: {
                        attributes: ['Dat'],
                        order: [
                            ['Dat', 'DESC']
                        ],
                    }
                },
                {
                    model: self._db.OwnedByTeam,
                    through: {
                        attributes: ['Dat'],
                        order: [
                            ['Dat', 'DESC']
                        ],
                    }
                },
                {
                    model: self._db.ClosedBy,
                    through: {
                        attributes: ['Dat'],
                        order: [
                            ['Dat', 'DESC']
                        ],
                    }
                },
                {
                    model: self._db.LastModBy,
                    through: {
                        attributes: ['Dat'],
                        order: [
                            ['Dat', 'DESC']
                        ],
                    }
                },
                {
                    model: self._db.DisplayName,
                    through: {
                        attributes: ['Dat'],
                        order: [
                            ['Dat', 'DESC']
                        ],
                    }
                },
                {
                    model: self._db.Prty,
                    through: {
                        attributes: ['Dat'],
                        order: [
                            ['Dat', 'DESC']
                        ],
                    }
                },
                {
                    model: self._db.IncidentType,
                    through: {
                        attributes: ['Dat'],
                        order: [
                            ['Dat', 'DESC']
                        ],
                    }
                },
                {
                    model: self._db.Modified,
                    through: {
                        attributes: ['Dat'],
                        order: [
                            ['Dat', 'DESC']
                        ],
                    }
                },
                {
                    model: self._db.Description,
                },
            ]
        }).then(function(ticket) {
            var tmp = [];
            for (i = 0; i < ticket.length; i++) { tmp.push(ticket[i].dataValues); }
            //if (ticket.length === 1) process.nextTick(callback, null, tmp[0], param);
            //else 
            process.nextTick(callback, null, tmp, param);
        }).catch(function(err) {
            process.nextTick(callback, self.moduleName() + ". getTicketEager.[findAll].Error:" + err, null, param);
        });

    };
    // =============== SaveTodatabase end   ==================

    this.finalize = function() {
        if (self._timoutTimer) clearTimeout(self._timoutTimer);
        self._timoutTimer = null;
        if (self.loggedIn() && self._cwCall) {
            var func = new self._jinq().from(self._func).where(function(row, index) { return row.name.toLowerCase() === "Login"; }).select();
            if (func) func.func();
        }
        if (self._cwCall) delete self._cwCall;
        self._common.toLog(self.moduleName() + '[' + self.id + '].Finalize. Called from ' + self._myModuleName + ' module');
    };
}


// --------------- Cherwell Call seq -----------------------
function CwCall(req, res, client, err) {
    var self = this;

    this._req = req;
    this._res = res;
    this._client = client;
    this._err = err;
    this._idx = 0;
    this._func = [];
    this._jinq = require('jinq');
    this._async = require('async');
    this.first = function() {
        if (self._func.length > 0) {
            self._idx = 0;
        }
    };
    this.last = function() {
        if (self._func.length > 0) {
            self._idx = self._func.length - 1;
        }
    };
    this.current = function() {
        if (self._func.length > 0 || self._idx < self._func.length) {
            return self._func[self._idx];
        } else return null;
    };
    this.currentIdx = function() {
        if (self._func.length > 0 || self._idx < self._func.length) {
            return self._idx;
        } else return null;
    };
    this.add = function(func) {
        if (typeof func === 'object') {
            func.param.push(self.callback);
            self._func.push(func);
        }
    };
    this.remove = function(name) {
        if (self._func.length > 0) {
            self._func = new self._jinq().from(self._func).delete().at(function(col, index) { return col[index].name.toLowerCase() === name.toLowerCase(); }).select();
        }
    };
    this.insertAfter = function(idx, item) {
        if (self._func.length > 0 && idx < self._func.length && typeof item == 'object') {
            item.param.push(self.callback);
            self._func.splice(idx + 1, 0, item);
        }
    };
    this.insertBefore = function(idx, item) {
        if (self._func.length > 0 && idx < self._func.length && typeof item == 'object') {
            item.param.push(self.callback);
            self._func.splice(idx - 1, 0, item);
        }
    };
    this.err = function(err) {
        if (!err) return self._err;
        else self._err = err;
    };
    this.client = function(client) {
        if (!client) return self._client;
        else self._client = client;
    };
    this.call = function() {
        // {name, func, param. callbackParam}
        if (self._func.length > 0 || self._idx < self._func.length) {
            //if (self._idx == 1 || self._idx == 2) {
            //    self._func[self._idx].callbackParam.client.QueryByFieldValue({ busObNameOrId: "Incident", fieldNameOrId: "OwnedByTeam", value: "WINDOWS 10 SCCM Support" }, self.callback);
            //} else 
            if (self._func[self._idx])
                self._func[self._idx].func.apply(this, self._func[self._idx].param);
        }
    };
    this.callback = function(err, result) {
        if (self._func.length > 0 || self._idx < self._func.length) {
            if(self._func[self._idx].callbackParam) 
                self._func[self._idx].callbackParam.isLast = (self._idx == self._func.length - 1 ? true : false);
            self._async.series([
                    function(callback) {
                        self._func[self._idx].callback(err, result, self._func[self._idx].callbackParam);
                        callback(null);
                    },
                    function(callback) {
                        self._idx++;
                        callback(null);
                    }
                ],
                function(err, results) {}
            );
            self.call();
        }
    };
}