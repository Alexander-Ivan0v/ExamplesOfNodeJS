use Tst;

CREATE TABLE [Usr](
	[ID] BIGINT IDENTITY (1, 1) NOT NULL,
	[Login] VARCHAR(50) NOT NULL,
	[Pass] VARCHAR(50) NOT NULL,
	[Name] VARCHAR(50) NOT NULL,
	[IsLocked] BIT NOT NULL,

	PRIMARY KEY CLUSTERED ([Id] ASC)
);

CREATE TABLE [Rol](
	[ID] BIGINT IDENTITY (1, 1) NOT NULL,
	[Name] VARCHAR(50) NOT NULL,
	[Descr] VARCHAR(100) NULL,

	PRIMARY KEY CLUSTERED ([Id] ASC)
);

CREATE TABLE [UsrRol](
	[ID] BIGINT IDENTITY (1, 1) NOT NULL,
	[Usr] BIGINT NOT NULL,
	[Rol] BIGINT NOT NULL,

	PRIMARY KEY CLUSTERED ([Id] ASC),
	FOREIGN KEY ([Usr]) REFERENCES [dbo].[Usr] ([Id]),
	FOREIGN KEY ([Rol]) REFERENCES [dbo].[Rol] ([Id])
);

CREATE TABLE [Module](
	[ID] BIGINT IDENTITY (1, 1) NOT NULL,
	[Name] VARCHAR(50) NOT NULL,
	[Descr] VARCHAR(100) NULL,

	PRIMARY KEY CLUSTERED ([Id] ASC)
);

CREATE TABLE [Log](
	[ID] BIGINT IDENTITY (1, 1) NOT NULL,
	[Dat] DateTime NOT NULL,
	[Usr] BIGINT NULL,
	[Module] BIGINT NULL,
	[Uri] VARCHAR(1024),
	[Data] VARCHAR(4096),

	FOREIGN KEY([Usr]) REFERENCES [dbo].[Usr]([ID]),
	FOREIGN KEY([Module]) REFERENCES [dbo].[Module]([ID])
);

                       
CREATE UNIQUE INDEX UNIQ_Usr_Login on Usr([Login] ASC);
CREATE INDEX IDX_Usr_Name on Usr(Name ASC);
CREATE INDEX IDX_Usr_Pass on Usr(Pass ASC);

CREATE UNIQUE INDEX UNIQ_Rol_Name on Rol(Name ASC);
CREATE INDEX IDX_UsrRol_Usr on UsrRol(Usr ASC);
CREATE INDEX IDX_UsrRol_Rol on UsrRol([Rol] ASC);

CREATE UNIQUE INDEX UNIQ_Module_Name on Module(Name ASC);

CREATE INDEX IDX_Log_Usr on Log(Usr ASC);
CREATE INDEX IDX_Log_Module on Log(Module ASC);