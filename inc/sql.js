module.exports = new Sql();

function Sql() {
    var self = this;

    // ---While we are in transaction start ---
    this._maxTriesCount = 10;
    this._triesCnt = 0;
    this._triesInterval = 300; //Milliseconds
    this._transactionResetTimeout = 5; // Minutes
    // ---While we are in transaction end  ---

    this._myModuleName = 'Sql';
    this.moduleName = function() { return self._myModuleName; };
    this._mssql = null;
    // Linq to JS Objects
    // https://jinqjs.readme.io/docs/what-is-jinqjs
    this._jinq = require('jinq');
    this._path = require('path');
    this._fs = require('fs');
    // Create SQL strings to  Postgres, MSSQL, MySQL
    // https://hiddentao.com/squel/
    this._squel = require('squel');

    this._id = null;
    this._querySqlStr = '';
    this._queryOriginalCallback = null;
    this._queryParam = null;
    this._modifySqlStr = '';
    this._modifyOriginalCallback = null;
    this._modifyParam = null;
    this._query = [];
    this._transactionGlobalResetTimeout = 60;

    this._request = null;
    this._sqlite3Db = null;
    this._config = null;
    this._transaction = null;
    this._needRollback = false;
    this.getLogLevel = null;
    this._globalResetTimerInterva = null;
    this._transactionInProgress = { date: null, inProgress: false };
    this.isTransactionTookPlace = function() {
        if (!date && !inProgress) return false;
        else return true;
    }
    this.transactionInProgress = function(inProgress) {
        self._transactionInProgress.inProgress = inProgress;
        if (inProgress)
            self._transactionInProgress.date = self._common.getDateTime();
    };
    this.isTransactionInProgress = function() { return self._transactionInProgress.inProgress; };
    this.getTransactionStartDate = function() {
        if (self.isTransactionInProgress()) return self._transactionInProgress.date;
        else return null;
    };
    this.getLastTransactionStartDate = function() { return self._transactionInProgress.date; };
    this.needRollback = function(isItNeeds) { self._needRollback = isItNeeds; };
    this.isRollbackNeeds = function() { return self._needRollback; };
    this.init = function(sqltype, config, constModule, commonModule, isCached, subscribers, getLogLevel) {
        self._common = commonModule;
        self._const = constModule;
        self.getLogLevel = getLogLevel;
        self._sqltype = sqltype;
        self._config = config;
        self._isCached = isCached;
        self._connected = { state: self._const.msgDisconnected, date: self._common.getDateTime(), error: null };
        switch (self._sqltype) {
            case self._const.dbType.mssql:
                {
                    self._sql = require('mssql');
                    break;
                }
            case self._const.dbType.sqlite:
                {
                    self._sql = require('sqlite3').verbose();
                    var TransactionDatabase = require("sqlite3-transactions").TransactionDatabase;
                    self._sqlite3Db = new TransactionDatabase(new self._sql.Database(self._config.file)); // ':memory:' - database in memory
                    // Create if necessary
                    if (!self._common.isFileExists(self._path.dirname(self._config.file))) {
                        self._fs.mkdirSync(self._path.dirname(self._config.file))
                    }
                    if (!self._common.isFileExists(self._config.file)) {
                        self._sqlite3Db.serialize(function() {

                        });
                    }
                    self._sqlite3Db.exec(self._config.dbCreateScript);
                    break;
                }
        }
        subscribers.push({ name: self.moduleName(), onExit: self.finalize });
        return self;
    };
    this._transactionGlobalReset = function() {
        if (self.isTransactionInProgress()) {
            if (self._common.DateDiff(self._common.getDateTime(), self.getTransactionStartDate()).min > self._transactionResetTimeout) {
                self.needRollback(true);
                setImmediate(self.transaction, 'finish');
            }
        }
    };
    this._transactionStartCallback = function(err, transaction) {
        if (!err) {
            switch (self._sqltype) {
                case self._const.dbType.sqlite:
                    {
                        self._transaction = transaction;
                        break;
                    }
                case self._const.dbType.mssql:
                    {
                        if (!self._request) { self._request = new self._sql.Request(); }
                        break;
                    }
            }
            self._common.toLog('Transaction Started.');
            self.transactionInProgress(true);

            if (!self._globalResetTimerInterval)
                self._globalResetTimerInterval = setInterval(self._transactionGlobalReset, self._transactionGlobalResetTimeout * 1000);

        } else { self._common.toLog(self.moduleName() + '.Transaction begin error: ' + err, self._const.msgErr); }
    };
    this._transactionCommitCallback = function(err) {
        if (err) {
            self._common.toLog(self.moduleName() + '.Transaction commit error: ' + err, self._const.msgErr);
        } else { self._common.toLog('Transaction Commited.'); }
        self.transactionInProgress(false);
    };
    this._transactionRollbackCallback = function(err) {
        if (err) {
            self._common.toLog(self.moduleName() + '.Transaction rollback error: ' + err, self._const.msgErr);
        } else self._common.toLog('Transaction Rolled back.');
        self.transactionInProgress(false);
    };
    this.transaction = function(what) {
        if (what == 'start' && self.isTransactionInProgress()) {
            if (self._triesCnt <= self._maxTriesCount) {
                self._triesCnt++;
                setTimeout(self.transaction, self._triesInterval, what);
            } else {
                self._triesCnt = 0;
                throw "Transaction repeat counter exceeded. We've waited for " + self._maxTriesCoun * self._triesInterval / 1000 + "sec. We are still in transaction. SQL: \r\n" + self._modifySqlStr;
            }
        } else {
            self._triesCnt = 0;
            switch (what) {
                case 'start':
                    {
                        self.needRollback(false);
                        switch (self._sqltype) {
                            case self._const.dbType.mssql:
                                { self._transaction.begin(self._transactionStartCallback); break; }
                            case self._const.dbType.sqlite:
                                { self._sqlite3Db.beginTransaction(self._transactionStartCallback); break; }
                        }
                        break;
                    }
                case 'commit':
                    {
                        self._transaction.commit(self._transactionCommitCallback);
                        break;
                    }
                case 'rollback':
                    {
                        self._transaction.rollback(self._transactionRollbackCallback);
                        break;
                    }
                case 'finish':
                    {
                        if (self.isTransactionInProgress()) {
                            if (!self.isRollbackNeeds()) {
                                self._transaction.commit(self._transactionCommitCallback);
                            } else {
                                self._transaction.rollback(self._transactionRollbackCallback);
                            }
                        }
                        break;
                    }
                default:
                    { self._common.toLog('Try to do unknown action for Transaction', self._const.msgErr); }
            }
        }
    };
    this.isConnected = function() {
        if (self._connected.state == self._const.msgConnected) return true;
        else return false;
    };
    this.isCached = function() { return this._isCached; };
    this._connectCallback = function(err) {
        var state = self._const.msgConnected;
        if (err) { state = self._const.msgDisconnected; }

        switch (self._sqltype) {
            case self._const.dbType.mssql:
                {
                    self._transaction = new self._sql.Transaction();
                    break;
                }
            case self._const.dbType.sqlite:
                {}
        }

        self._connected = { state: state, date: self._common.getDateTime(), error: err };
        if (self._callback) { self._callback(self._connected, self._param); }
    };
    this._queryCallback = function(err, recordset, foundInCache) {
        var state = self._const.msgOk;
        if (err) { state = self._const.msgErr; }
        var isFromCache = false;

        if (typeof foundInCache == "boolean" && foundInCache === true) isFromCache = true;
        var tmp = self.makeQueryResults(recordset, state, (err === undefined ? null : err), isFromCache);

        if (self.isCached() && (!foundInCache || foundInCache === false || foundInCache === 0)) {
            var data = new self._jinq().from(self._query)
                .where(function(row, index) { return row.sqlStr.toLowerCase() === self._querySqlStr.toLowerCase(); })
                .select();
            if (data && data.length > 0) {
                self._query = new self._jinq().from(self._query).delete().at(function(col, index) { return col[index].sqlStr.toLowerCase() === self._querySqlStr.toLowerCase(); }).select();
            }
            self._query.push({ date: self._common.getDateTime(), sqlStr: self._querySqlStr, result: tmp });
        }
        if (self._callback) { self._queryOriginalCallback(tmp, self._queryParam); }
    };
    this.makeQueryResults = function(recordset, state, error, isFromCache, date) {
        if (!date) date = self._common.getDateTime();
        if (!error) error = null;
        if (!isFromCache) isFromCache = false;
        if (!recordset) recordset = null;
        if (!state) state = self._const.msgOk;
        return { date: date, error: error, isFromCache: isFromCache, recordset: recordset, state: state };
    };
    this._modifyCallback = function(err, recordset) {
        if (err) {
            self.needRollback(true);
            self._common.toLog(self.moduleName() + '.modify error: ' + err.message + '\r\n Stack:\r\n-----\r\n' + err.stack, self._const.msgErr);
        }
        //self.transactionInProgress(false);
        self._modifyOriginalCallback(err, self._modifyParam);
    };
    this.connect = function(callback, param) {
        self._callback = callback;
        self._param = param;
        self._id = param.id;

        try {
            switch (self._sqltype) {
                case self._const.dbType.mssql:
                    { self._sql.connect(self._config, self._connectCallback); break; }
                case self._const.dbType.sqlite:
                    {
                        setImmediate(self._connectCallback, null);
                        break;
                    }
            }

        } catch (err) {
            self._common.toLog(self.moduleName() + '.Connect Exception: ' + err.message, err.name, err.stack);
        }

        return;
    };
    this._sqlite3ExecSql = function() {
        self._sqlite3Db.all(self._querySqlStr, self._queryCallback);
    };
    this.query = function(sql, callback, param, doNotUseCache) {
        self._querySqlStr = sql;
        self._queryOriginalCallback = callback;
        self._queryParam = param;
        var www = [];
        var foundInCache = false;

        if (!doNotUseCache) {
            // Cached ?
            if (self.isCached()) {
                var data = new self._jinq().from(self._query)
                    .where(function(row, index) { return row.sqlStr.toLowerCase() === self._querySqlStr.toLowerCase(); })
                    .select();
                if (data && data.length == 1) {
                    foundInCache = true;
                    //setImmediate(self._queryCallback, undefined, www.result.recordset, foundInCache)
                    self._queryCallback(data[0].result.error, data[0].result.recordset, foundInCache);
                }
            }
        }

        if (!foundInCache) {
            // Don't found in Cache or it hasn't been cached
            switch (self._sqltype) {
                case self._const.dbType.mssql:
                    {
                        try {
                            if (!self._request) { self._request = new self._sql.Request(); }
                            self._request.query(sql, self._queryCallback);
                        } catch (err) { self._common.toLog(self.moduleName() + '.Query Exception: ' + err.message, err.name, err.stack); }
                        break;
                    }
                case self._const.dbType.sqlite:
                    {
                        self._sqlite3Db.serialize(self._sqlite3ExecSql);
                        break;
                    }
            }
        }
        return;
    };
    this.modify = function(sql, callback, param) {
        try {
            self.transactionInProgress(true);
            self._modifySqlStr = sql;
            self._modifyOriginalCallback = callback;
            self._modifyParam = param;
            switch (self._sqltype) {
                case self._const.dbType.mssql:
                    {
                        if (!self._request) { self._request = new self._sql.Request(); }
                        self._request.query(sql, self._modifyCallback);
                        break;
                    }
                case self._const.dbType.sqlite:
                    {
                        if (self._transaction)
                            self._transaction.exec(sql, self._modifyCallback);
                        else
                            self._sqlite3Db.exec(sql, self._modifyCallback);
                        break;
                    }
            }

        } catch (err) {
            self._common.toLog(err.message, err.name, err.stack);
        }
    };
    // =================== Update Table if it needs ======================


    // TODO: Select for SQlite preparing in wrong way for DateTime field


    this.updateIfItNeeds = function(table, fields, callback, param) {
        param._originalCallback = callback;
        param.table = table;
        param.fields = fields;

        var whereCondition = '';
        fields.forEach(function(itm, idx, arr) {
            // {name: name, val: value, type: type, option: options}
            // type: string, datetime, number
            // option: matchCase (default: ignoreCase)
            var val = '';
            switch (itm.type.toLowerCase()) {
                case 'string':
                    { val = "'" + itm.val + "'"; break; }
                case 'datetime':
                    {
                        var tmp = itm.val.getFullYear() + '-' +
                            self._common.intAsTwoDigit(itm.val.getMonth()) + '-' +
                            self._common.intAsTwoDigit(itm.val.getDate()) + ' ' +
                            self._common.intAsTwoDigit(itm.val.getHours()) + ':' +
                            self._common.intAsTwoDigit(itm.val.getMinutes()) + ':' +
                            self._common.intAsTwoDigit(itm.val.getSeconds());
                        val = "'" + tmp + "'";
                        break;
                    }
                case 'number':
                    { val = itm.val; break; }
                default:
                    { val = "'" + itm.val + "'"; break; }
            }
            if (itm.val) {
                if (!itm.option || (itm.option && itm.option == 'ignoreCase')) {
                    if ((itm.type.toLowerCase()) === 'string') whereCondition += 'UPPER(' + itm.name + ") = UPPER(" + val + ") and ";
                    else whereCondition += itm.name + " = " + val + " and ";
                } else whereCondition += itm.name + " = " + val + " and ";
            } else {
                whereCondition += itm.name + " is " + itm.val + " and ";
            }
        }); // fields.forEach(function(itm, idx, arr) {

        // ------------ Select SQL -------------------
        whereCondition = whereCondition.slice(0, -5);

        param.querySql = self._squel.useFlavour('mssql')
            .select({ autoQuoteTableNames: false, autoQuoteFieldNames: false })
            .field('*').from(table).where(whereCondition)
            .toString();
        // --------------------------------------------

        // ------------- Insert SQL -------------------
        var setStr = [];
        fields.forEach(function(itm, idx, arr) {
            if (itm.type == 'datetime') {
                var tmp = itm.val.getFullYear() + '-' +
                    self._common.intAsTwoDigit(itm.val.getMonth()) + '-' +
                    self._common.intAsTwoDigit(itm.val.getDate()) + ' ' +
                    self._common.intAsTwoDigit(itm.val.getHours()) + ':' +
                    self._common.intAsTwoDigit(itm.val.getMinutes()) + ':' +
                    self._common.intAsTwoDigit(itm.val.getSeconds());
                itm.val = tmp;
            }
            setStr.push({ name: itm.name, val: itm.val });
        });

        param.modifySql = self._squel.useFlavour('mssql')
            .insert({ autoQuoteTableNames: false, autoQuoteFieldNames: false })
            .into(table)
        for (i = 0; i < setStr.length; i++) {
            param.modifySql.set(setStr[i].name, setStr[i].val)
        }
        param.modifySql = param.modifySql.toString();
        // ---------------------------------------------


        self.query(param.querySql, self._checkIfItNeedsCallback, param, true);
    };
    this._checkIfItNeedsCallback = function(result, param) {
        if (!result.error && result.state != self._const.msgErr) {
            if (result.recordset && result.recordset.length == 1) {
                param._originalCallback(result, param);
            } else {
                // self.transaction('start');
                // setTimeout(self.modify, 300, param.modifySql, self._modifyIfItNeedsCallback, param);
                self.modify(param.modifySql, self._modifyIfItNeedsCallback, param);
            }
        } else {
            param._originalCallback(result, param);
        }
    };
    this._modifyIfItNeedsCallback = function(err, param) {
        // self.transaction('finish');
        if (!err) {
            //setTimeout(self.query, 300, param.querySql, self._checkIfItNeedsCallback, param, true);
            self.query(param.querySql, self._checkIfItNeedsCallback, param, true);
        } else {
            var result = self.makeQueryResults();
            result.error = err;
            result.state = self._const.msgErr;
            param._originalCallback(result, param);
        }
    };
    // =================== Update Table if it needs ======================


    this.finalize = function() {
        if (self._globalResetTimerInterval) {
            clearInterval(self._globalResetTimerInterval);
            self._globalResetTimerInterval = null;
        };

        self._common.toLog('Finalize. Called from ' + self.moduleName() + ' module');
        try {
            switch (self._sqltype) {
                case self._const.dbType.mssql:
                    { self._sql.end(); break; }
                case self._const.dbType.sqlite:
                    { self._sqlite3Db.close(); break; }
            }

        } catch (err) {
            self._common.toLog(err.message, err.name, err.stack);
        }
    };

}