module.exports = {
    /*
    Upon loading, the ClientTZ.getBrowserTZ() function is executed, which sets:
    ClientTZ.UTCoffset to the browser time offset from UTC in minutes (e.g., CST is −360 minutes, which is −6.0 hours from UTC);
    ClientTZ.UTCoffsetT to the offset in the form '±hhmmD' (e.g., '-0600D'), where the suffix is D for DST and S for standard (non-DST);
    ClientTZ.hasDST (to true or false).
    */
    ClientTZ: {
        UTCoffset: 0, // Browser time offset from UTC in minutes
        UTCoffsetT: '+0000S', // Browser time offset from UTC in '±hhmmD' form
        hasDST: false, // Browser time observes DST

        // Determine browser's timezone and DST
        getBrowserTZ: function() {
            var self = ClientTZ;

            // Determine UTC time offset
            var now = new Date();
            var date1 = new Date(now.getFullYear(), 1 - 1, 1, 0, 0, 0, 0); // Jan
            var diff1 = -date1.getTimezoneOffset();
            self.UTCoffset = diff1;

            // Determine DST use
            var date2 = new Date(now.getFullYear(), 6 - 1, 1, 0, 0, 0, 0); // Jun
            var diff2 = -date2.getTimezoneOffset();
            if (diff1 != diff2) {
                self.hasDST = true;
                if (diff1 - diff2 >= 0)
                    self.UTCoffset = diff2; // East of GMT
            }

            // Convert UTC offset to ±hhmmD form
            diff2 = (diff1 < 0 ? -diff1 : diff1) / 60;
            var hr = Math.floor(diff2);
            var min = diff2 - hr;
            diff2 = hr * 100 + min * 60;
            self.UTCoffsetT = (diff1 < 0 ? '-' : '+') + (hr < 10 ? '0' : '') + diff2.toString() + (self.hasDST ? 'D' : 'S');

            return self.UTCoffset;
        }
    }
};