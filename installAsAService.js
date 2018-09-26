// Home of the project:
// https://github.com/coreybutler/node-windows
//
// NGN is a platform for building web systems
// https://github.com/ngnjs/NGN

var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
    name: 'Alex\`s NodeJs Web Service',
    script: 'c:\\Projects\\NodeSrvTst\\server.js'
});

svc.user.domain = 'mss';
svc.user.account = 'Administrator';
svc.user.password = 'P@ssw0rd';

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install', function() {
    svc.start();
    console.log('Service successfully installed.');
});

svc.on('alreadyinstalled', function() {
    console.log('Service already installed.');
});

svc.on('invalidinstallation', function() {
    console.log('Invalid parameters during installation.');
});

svc.on('uninstall', function() {
    console.log('Uninstall complete.');
    console.log('The service exists: ', svc.exists);
});

svc.install();

// Uninstall the service.
// svc.uninstall();