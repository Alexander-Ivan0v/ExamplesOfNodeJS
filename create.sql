CREATE TABLE IF NOT EXISTS [Usr](
	[ID] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Login] VARCHAR(50) NULL,
	[Pass] VARCHAR(50) NOT NULL,
	[Name] VARCHAR(50) NOT NULL,
	[IsLocked] BOOLEAN NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Usr_Id on Usr(ID ASC);

CREATE TABLE IF NOT EXISTS [Rol](
	[ID] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[NAME] VARCHAR(50),
	[Descr] VARCHAR(100)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Rol_Id on Rol(ID ASC);

CREATE TABLE IF NOT EXISTS [UsrRol](
	[ID] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Usr] INTEGER NOT NULL,
	[Rol] INTEGER NOT NULL,

	FOREIGN KEY(Usr) REFERENCES Usr(ID),
	FOREIGN KEY(Rol) REFERENCES Rol(ID)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_UsrRol_Id on UsrRol(ID ASC);

CREATE TABLE IF NOT EXISTS [Module](
	[ID] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[NAME] VARCHAR(50),
	[Descr] VARCHAR(100)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Module_Id on Module(ID ASC);

CREATE TABLE IF NOT EXISTS [Log](
	[ID] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Uri] VARCHAR(1024),
	[Data] VARCHAR(4096),

	FOREIGN KEY(Usr) REFERENCES Usr(ID),
	FOREIGN KEY(Module) REFERENCES Module(ID)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Log_Id on Log(ID ASC);

CREATE TABLE IF NOT EXISTS [LogUsr](
	[ID] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Log] INTEGER NOT NULL,
	[Usr] INTEGER NOT NULL,	
	[Dat] TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

	FOREIGN KEY(Log) REFERENCES Log(ID),
	FOREIGN KEY(Usr) REFERENCES Usr(ID)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_LogUsr_Id on LogUsr(ID ASC);

CREATE TABLE IF NOT EXISTS [LogModule](
	[ID] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Log] INTEGER NOT NULL,
	[Module] INTEGER NOT NULL,
	[Dat] TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

	FOREIGN KEY(Log) REFERENCES Log(ID),
	FOREIGN KEY(Module) REFERENCES Module(ID)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_LogModule_Id on LogModule(ID ASC);

CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_LogModule_LogModule on LogModule(Log, Module ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_LogUsr_LogUsr on LogUsr(Log, Usr ASC);
                       
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Module_Name on Module(Name ASC);

CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Usr_Login on Usr(Login ASC);
CREATE INDEX IF NOT EXISTS IDX_Usr_Name on Usr(Name ASC);
CREATE INDEX IF NOT EXISTS IDX_Usr_Pass on Usr(Pass ASC);

CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Rol_Name on Rol(Name ASC);

CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Rol_UsrRol on UsrRol(Usr, Rol ASC);
CREATE INDEX IF NOT EXISTS IDX_UsrRol_Usr on UsrRol(Usr ASC);
CREATE INDEX IF NOT EXISTS IDX_UsrRol_Rol on UsrRol(Rol ASC);


------------------------ Cherwell -------------------------------

------------------------ Dictionaries ---------------------------

CREATE TABLE IF NOT EXISTS [Description](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Name] VARCHAR(32768) NOT NULL,
	[Hash] CHAR(32) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Description_Id on Description(Id ASC);

CREATE TABLE IF NOT EXISTS [IncidentType](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Name] VARCHAR(50) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_IncidentType_Id on IncidentType(Id ASC);

CREATE TABLE IF NOT EXISTS [Status](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Name] VARCHAR(50) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Status_Id on Status(Id ASC);

CREATE TABLE IF NOT EXISTS [DisplayName](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Name] VARCHAR(100) NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_DisplayName_Id on DisplayName(Id ASC);

CREATE TABLE IF NOT EXISTS [OwnedBy](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Name] VARCHAR(100) NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_OwnedBy_Id on OwnedBy(Id ASC);

CREATE TABLE IF NOT EXISTS [ClosedBy](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Name] VARCHAR(100) NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_ClosedBy_Id on ClosedBy(Id ASC);

CREATE TABLE IF NOT EXISTS [LastModBy](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Name] VARCHAR(100) NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_LastModBy_Id on LastModBy(Id ASC);

CREATE TABLE IF NOT EXISTS [OwnedByTeam](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Name] VARCHAR(100) NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_OwnedByTeam_Id on OwnedByTeam(Id ASC);

CREATE TABLE IF NOT EXISTS [Prty](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Name] INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Prty_Id on Prty(Id ASC);

CREATE TABLE IF NOT EXISTS [Modified](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[LastModifiedDateTime] DateTime NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Modified_Id on Modified(Id ASC);

CREATE TABLE IF NOT EXISTS [Ticket](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[IncidentId] VARCHAR(10) NOT NULL,
	[SLAResolveByDeadline] DateTime NULL,
	[CreatedDateTime] DateTime NOT NULL,
	[BATOLAResolutionWarning] Datetime NULL,
	[CherwellId] VARCHAR(50),
	[Dat] TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	[ClosedDateTime] DateTime NULL,
	[IsNewOne] BOOLEAN NULL	
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Ticket_Id on Ticket(Id ASC);


------------------- Middle Tables --------------------
CREATE TABLE IF NOT EXISTS [TicketStatus](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Ticket] INTEGER NOT NULL,
	[Status] INTEGER NOT NULL,
	[Dat] TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

	FOREIGN KEY(Ticket) REFERENCES Ticket(Id),
	FOREIGN KEY(Status) REFERENCES Status(Id)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_TicketStatus_Id on TicketStatus(Id ASC);

CREATE TABLE IF NOT EXISTS [TicketIncidentType](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Ticket] INTEGER NOT NULL,
	[IncidentType] INTEGER NOT NULL,
	[Dat] TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

	FOREIGN KEY(Ticket) REFERENCES Ticket(Id),
	FOREIGN KEY(IncidentType) REFERENCES IncidentType(Id)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_TicketIncidentType_Id on TicketIncidentType(Id ASC);

CREATE TABLE IF NOT EXISTS [TicketModified](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Ticket] INTEGER NOT NULL,
	[Modified] INTEGER NOT NULL,
	[Dat] TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

	FOREIGN KEY(Ticket) REFERENCES Ticket(Id),
	FOREIGN KEY(Modified) REFERENCES Modified(Id)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_TicketModified_Id on TicketModified(Id ASC);

CREATE TABLE IF NOT EXISTS [TicketPrty](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Ticket] INTEGER NOT NULL,
	[Prty] INTEGER NOT NULL,
	[Dat] TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

	FOREIGN KEY(Ticket) REFERENCES Ticket(Id),
	FOREIGN KEY(Prty) REFERENCES Prty(Id)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_TicketPrty_Id on TicketPrty(Id ASC);

CREATE TABLE IF NOT EXISTS [TicketClosedBy](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Ticket] INTEGER NOT NULL,
	[ClosedBy] INTEGER NOT NULL,
	[Dat] TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

	FOREIGN KEY(Ticket) REFERENCES Ticket(Id),
	FOREIGN KEY(ClosedBy) REFERENCES ClosedBy(Id)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_TicketClosedBy_Id on TicketClosedBy(Id ASC);

CREATE TABLE IF NOT EXISTS [TicketOwnedBy](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Ticket] INTEGER NOT NULL,
	[OwnedBy] INTEGER NOT NULL,
	[Dat] TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

	FOREIGN KEY(Ticket) REFERENCES Ticket(Id),
	FOREIGN KEY(OwnedBy) REFERENCES OwnedBy(Id)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_TickeetOwnedBy_Id on TicketOwnedBy(Id ASC);

CREATE TABLE IF NOT EXISTS [TicketDisplayName](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Ticket] INTEGER NOT NULL,
	[DisplayName] INTEGER NOT NULL,
	[Dat] TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

	FOREIGN KEY(Ticket) REFERENCES Ticket(Id),
	FOREIGN KEY(DisplayName) REFERENCES DisplayName(Id)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_TicketDisplayName_Id on TicketDisplayName(Id ASC);

CREATE TABLE IF NOT EXISTS [TicketLastModBy](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Ticket] INTEGER NOT NULL,
	[LastModBy] INTEGER NOT NULL,
	[Dat] TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

	FOREIGN KEY(Ticket) REFERENCES Ticket(Id),
	FOREIGN KEY(LastModBy) REFERENCES LastModBy(Id)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_TicketLastModBy_Id on TicketLastModBy(Id ASC);

CREATE TABLE IF NOT EXISTS [TicketOwnedByTeam](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Ticket] INTEGER NOT NULL,
	[OwnedByTeam] INTEGER NOT NULL,
	[Dat] TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

	FOREIGN KEY(Ticket) REFERENCES Ticket(Id),
	FOREIGN KEY(OwnedByTeam) REFERENCES OwnedByTeam(Id)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_TicketOwnedByTeam_Id on TicketOwnedByTeam(Id ASC);

CREATE TABLE IF NOT EXISTS [TicketDescription](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Ticket] INTEGER NOT NULL,
	[Description] INTEGER NOT NULL,
	[Dat] TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

	FOREIGN KEY(Ticket) REFERENCES Ticket(Id),
	FOREIGN KEY(Description) REFERENCES Description(Id)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_TicketDescription_Id on TicketDescription(Id ASC);

----------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS [vcCred](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Login] VARCHAR(50) NOT NULL,
	[Pass] VARCHAR(1024) NOT NULL,
	[Email] VARCHAR(100) NOT NULL,
	[Dat] TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	[Stop] BOOLEAN NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_vcCred_Id on vcCred(Id ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_vcCred_Login on vcCred(Login ASC);
CREATE INDEX IF NOT EXISTS IDX_vcCred_Dat on vcCred(Dat ASC);

CREATE TABLE IF NOT EXISTS [vcApp](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Name] VARCHAR(50) NOT NULL,
	[AppId] VARCHAR(50) NOT NULL,
	[Interval] INTEGER NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_vcApp_Id on vcApp(Id ASC);

CREATE TABLE IF NOT EXISTS [vcCredvcApp](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[vcCred] INTEGER NOT NULL,
	[vcApp] INTEGER NULL,
	[Dat] TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

	FOREIGN KEY(vcCred) REFERENCES vcCred(Id),
	FOREIGN KEY(vcApp) REFERENCES vcApp(Id)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_vcLoginvcApp_Id on vcCredvcApp(Id ASC);
CREATE INDEX IF NOT EXISTS IDX_vcCredvcApp_vcCred on vcCredvcApp(vcCred ASC);
CREATE INDEX IF NOT EXISTS IDX_vcCredvcApp_vcApp on vcCredvcApp(vcApp ASC);
CREATE INDEX IF NOT EXISTS IDX_vcCredvcApp_Dat on vcCredvcApp(Dat ASC);

CREATE TABLE IF NOT EXISTS [vcAct](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Name] VARCHAR(50) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_vcAct_Id on vcAct(Id ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_vcAct_Name on vcAct(Name ASC);

CREATE TABLE IF NOT EXISTS [vcCredvcAct](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[vcCred] INTEGER NOT NULL,
	[vcAct] INTEGER NOT NULL,
	[Success] BOOLEAN NULL,
	[Dat] TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

	FOREIGN KEY(vcCred) REFERENCES vcCred(Id),
	FOREIGN KEY(vcAct) REFERENCES vcAct(Id)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_vcCredvcAct_Id on vcCredvcAct(Id ASC);
CREATE INDEX IF NOT EXISTS IDX_vcCredvcAct_vcCred on vcCredvcAct(vcCred ASC);
CREATE INDEX IF NOT EXISTS IDX_vcCredvcAct_vcAct on vcCredvcAct(vcAct ASC);
CREATE INDEX IF NOT EXISTS IDX_vcCredvcAct_Dat on vcCredvcAct(Dat ASC);

----------------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Ticket_IncidentId on Ticket(IncidentId ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Ticket_CherwellId on Ticket(CherwellId ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Status_Name on Status(Name ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Prty_Name on Prty(Name ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_DisplayName_Name on DisplayName(Name ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_IncidentType_Name on IncidentType(Name ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_OwnedBy_Name on OwnedBy(Name ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_LastModBy_Name on LastModBy(Name ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_ClosedBy_Name on ClosedBy(Name ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_OwnedByTeam_Name on OwnedByTeam(Name ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_TicketStatus_TicketStatus_Dat on TicketStatus(Ticket ASC, Status ASC, Dat ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_TicketOwnedBy_OwnedBy_Dat on TicketOwnedBy(Ticket ASC, OwnedBy ASC, Dat ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_TicketClosedBy_ClosedBy_Dat on TicketClosedBy(Ticket ASC, ClosedBy ASC, Dat ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_TicketLastModBy_LastModBy_Dat on TicketLastModBy(Ticket ASC, LastModBy ASC, Dat ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_TicketDisplayName_DisplayName_Dat on TicketDisplayName(Ticket ASC, DisplayName ASC, Dat ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_TicketOwnedByTeam_TicketOwnedByTeam_Dat on TicketOwnedByTeam(Ticket ASC, OwnedByTeam ASC, Dat ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Description_Hash on Description(Hash ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Modified_LastModifiedDateTime on Modified(LastModifiedDateTime ASC);

CREATE INDEX IF NOT EXISTS IDX_Ticket_CreatedDateTime on Ticket(CreatedDatetime ASC);
CREATE INDEX IF NOT EXISTS IDX_Ticket_BATOLAResolutionWarning on Ticket(BATOLAResolutionWarning ASC);
CREATE INDEX IF NOT EXISTS IDX_Ticket_SLAResolveByDeadline on Ticket(SLAResolveByDeadline ASC);
CREATE INDEX IF NOT EXISTS IDX_Ticket_ClosedDateTime on Ticket(ClosedDateTime ASC);



insert into Rol(Name) values('administrator');
insert into Rol(Name) values('guest');
insert into Rol(Name) values('manager');

insert into Usr(Login, Pass, Name, IsLocked) values('administrator','P@ssw0rd', 'Big Admin', 0);
insert into Usr(Login, Pass, Name, IsLocked) values(NULL,'VeryC0mplexAndL0ngP@ssw0rd', 'Special user. It must be disabled all the time', 1);
insert into Usr(Login, Pass, Name, IsLocked) values('alex','P@ssw0rd', 'It`s me', 0);

insert into UsrRol(Usr, Rol) values((select ID from Usr where Login='administrator'), (select ID from Rol where Name='Administrator'));
insert into UsrRol(Usr, Rol) values((select ID from Usr where Login='administrator'), (select ID from Rol where Name='Guest'));
insert into UsrRol(Usr, Rol) values((select ID from Usr where Login='alex'), (select ID from Rol where Name='Administrator'));











CREATE TABLE IF NOT EXISTS [Part](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Name] VARCHAR(100) NOT NULL,
	[Descr] VARCHAR(255) NULL,
	[Rol] INTEGER NOT NULL,

	FOREIGN KEY(Rol) REFERENCES Rol(Id)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Part_Id on Part(Id ASC);

CREATE TABLE IF NOT EXISTS [Act](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Name] VARCHAR(100) NOT NULL,
	[Descr] VARCHAR(255) NULL,
	[Module] INTEGER NULL,
	[Func] VARCHAR(100) NULL,
	[ApiPath] VARCHAR(255) NULL,
	[HttpMethod] VARCHAR(20) NULL,

	FOREIGN KEY(Module) REFERENCES Module(Id)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Act_Id on Act(Id ASC);

CREATE TABLE IF NOT EXISTS [Scrrb](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Name] VARCHAR(100) NOT NULL,
	[Code] VARCHAR(32768) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Scrrb_Id on Scrrb(Id ASC);

CREATE TABLE IF NOT EXISTS [Lib](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Name] VARCHAR(100) NOT NULL,
	[Descr] VARCHAR(255) NULL,
	[Code] VARCHAR(32768) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Lib_Id on Lib(Id ASC);

CREATE TABLE IF NOT EXISTS [Parview](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Name] VARCHAR(100) NOT NULL,
	[Js] VARCHAR(32768) NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Preview_Id on Preview(Id ASC);

CREATE TABLE IF NOT EXISTS [PartAct](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Part] INTEGER NOT NULL,
	[Act] INTEGER NOT NULL,

	FOREIGN KEY(Part) REFERENCES Part(Id),
	FOREIGN KEY(Act) REFERENCES Act(Id)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_PartAct_Id on PartAct(Id ASC);

CREATE TABLE IF NOT EXISTS [Partype](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Name] VARCHAR(50) NOT NULL,
	[Parview] INTEGER NOT NULL,

	FOREIGN KEY(Parview) REFERENCES Parview(Id)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_ParType_Id on ParType(Id ASC);

CREATE TABLE IF NOT EXISTS [Scr](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Name] VARCHAR(50) NOT NULL,
	[Code] VARCHAR(32768) NOT NULL,
	[Scrrb] INTEGER NULL,

	FOREIGN KEY(Scrrb) REFERENCES Scrrb(Id)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Scr_Id on Scr(Id ASC);

CREATE TABLE IF NOT EXISTS [ScrLib](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Scr] INTEGER NOT NULL,
	[Lib] INTEGER NOT NULL,

	FOREIGN KEY(Scr) REFERENCES Scr(Id),
	FOREIGN KEY(Lib) REFERENCES Lib(Id)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_ScrLib_Id on ScrLib(Id ASC);

CREATE TABLE IF NOT EXISTS [Par](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Name] VARCHAR(50) NOT NULL,
	[Descr] VARCHAR(255) NULL,
	[Partype] INTEGER NOT NULL,
	[InOut] BOOLEAN NOT NULL,

	FOREIGN KEY(Partype) REFERENCES Partype(Id)
);

CREATE TABLE IF NOT EXISTS [ScrPar](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Scr] INTEGER NOT NULL,
	[Par] INTEGER NOT NULL,

	FOREIGN KEY(Scr) REFERENCES Scr(Id),
	FOREIGN KEY(Par) REFERENCES Par(Id)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_ScrPar_Id on ScrPar(Id ASC);

CREATE TABLE IF NOT EXISTS [ActScr](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Act] INTEGER NOT NULL,
	[Scr] INTEGER NOT NULL,
	[Seq] INTEGER NOT NULL,

	FOREIGN KEY(Act) REFERENCES Act(Id),
	FOREIGN KEY(Scr) REFERENCES Scr(Id)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_ActScr_Id on ActScr(Id ASC);

CREATE TABLE IF NOT EXISTS [ActPar](
	[Id] INTEGER NOT NULL PRIMARY KEY ASC AUTOINCREMENT,
	[Act] INTEGER NOT NULL,
	[Par] INTEGER NOT NULL,

	FOREIGN KEY(Act) REFERENCES Act(Id),
	FOREIGN KEY(Par) REFERENCES Par(Id)
);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_ActPar_Id on ActPar(Id ASC);

CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Part_Name on Part(Name ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Part_Rol on Part(Rol ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_PartAct_ParAct on PartAct(Part, Act ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Act_Name on Act(Name ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Act_ModuleFunc on Act(Module, Func ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_ActPar_ActPar on ActPar(Par, Act ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_ActScr_ActScrSeq on ActScr(Act, Scr, Seq ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Par_Name on Par(Name ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_ScrPar_ScrPar on ScrPar(Scr, Par ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Partype_Name on Partype(Name ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_ScrLib_ScrLib on ScrLib(Scr, Lib ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Scr_Name on Scr(Name ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Parview_Name on Parview(Name ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Lib_Name on Lib(Name ASC);
CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_Scrrb_Name on Scrrb(Name ASC);

CREATE INDEX IF NOT EXISTS IDX_Act_ApiPath on Act(ApiPath ASC);
CREATE INDEX IF NOT EXISTS IDX_Act_HttpMethod on Act(HttpMethod ASC);
CREATE INDEX IF NOT EXISTS IDX_Part_Rol on Part(Rol ASC);
CREATE INDEX IF NOT EXISTS IDX_Par_Partype on Par(Partype ASC);
CREATE INDEX IF NOT EXISTS IDX_Par_InOut on Par(InOut ASC);
CREATE INDEX IF NOT EXISTS IDX_Partype_Parview on Partype(Parview ASC);
CREATE INDEX IF NOT EXISTS IDX_ScrScrrb on Scr(Scrrb ASC);
