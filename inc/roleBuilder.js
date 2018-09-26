module.exports = new RoleBuilder();

function RoleBuilder() {
    var self = this;

    // https://jinqjs.readme.io/docs/what-is-jinqjs
    this._jinq = require('jinq');

    this._and = [];
    this._not = [];


    this.and = function(name) {
        if (typeof name == 'string') {
            self._and.push(name.toLowerCase());
        }
        return self;
    };
    this.not = function(name) {
        if (typeof name == 'string') {
            self._not.push(name.toLowerCase());
        }
        return self;
    };
    this.get = function() {
        return { and: self._and, not: self._not };
    };
    this.isEmpty = function() {
        if (self._and.length === 0 && self._not.length === 0) return true;
        else return false;
    };
    this.isThisOk = function(roles) {
        var ret = false;

        if (self.isEmpty()) ret = true;
        else if (roles instanceof Array) {
            // Roles are Objects ?
            if (roles.length > 0) {
                if (typeof roles[0] == 'object') {
                    var tmp = [];
                    roles.forEach(function(itm, idx, arr) { tmp.push(itm.name.toLowerCase()); });
                    roles = tmp;
                }
            }

            for (i = 0; i < roles.length; i++) { if (typeof roles[i] == 'string') roles[i] = roles[i].toLowerCase(); }
            // Not
            var data = new self._jinq().from(roles).in(self._not).select();
            if (data && data.length === 0) {
                // And
                data = new self._jinq().from(roles).in(self._and).select();
                if (data && data.length === self._and.length) {
                    ret = true;
                }
            }
        }

        return ret;
    };
}