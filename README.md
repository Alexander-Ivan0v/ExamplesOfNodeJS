# ExamplesOfNodeJS
Here there are two examples of work in Node.JS

In brief:
main file: server.js. It provides a plugin functionality. Also it provides common WebPI with common function realized.
Like: About and so on. You can get WebAPI with descriptions and examplees forthe main module and all plugins also. 
All Business logic scoped in businessLogic folder. Currently there are 2 tasks there

1. Work with well known Cherwell ITSM Tool (https://www.cherwell.com/). Get tickets, put them into the Database. Database could be of any type. 
   Also here provided a WebAPI to access to those tickets. WebAPI: (businessLogic/cherwell.js str:78 - 90)
2. Work with VMWare in order to renew lease of someone's vApp. All actions fixed in the Database and you can review them afterward.
   WebAPI: (businessLogic/vwvare.js str:92 - 97)

Both plugins work with the Databases for their own properties.
For load balansing used Throng (only in prod mode. Under debugging Throng is not used)
Also there is a plain site supported by this solution. It located in site folder.

Also in businessLogic/1 folder you can see wor with Cherwell in PowerShell.
