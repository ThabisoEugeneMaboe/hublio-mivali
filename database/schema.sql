-- Hublio Phase 3 MVP — Database schema
-- SQL Server / Azure SQL compatible
-- Current demo persists to api/data.json; this schema is the production target.

CREATE TABLE Schools (
    SchoolId        INT IDENTITY PRIMARY KEY,
    Name            NVARCHAR(200) NOT NULL,
    Timezone        NVARCHAR(80) NOT NULL DEFAULT 'Africa/Johannesburg',
    CheckInWindow   NVARCHAR(120) NULL,
    EscalateSafety  BIT NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2 DEFAULT SYSUTCDATETIME()
);

CREATE TABLE Users (
    UserId          INT IDENTITY PRIMARY KEY,
    SchoolId        INT NOT NULL REFERENCES Schools(SchoolId),
    Role            NVARCHAR(20) NOT NULL, -- admin, teacher, learner
    FullName        NVARCHAR(120) NOT NULL,
    Email           NVARCHAR(255) NULL,
    LoginCode       NVARCHAR(20) NULL,
    PasswordHash    NVARCHAR(256) NULL,
    PasswordSalt    NVARCHAR(64) NULL,
    PinHash         NVARCHAR(256) NULL,
    PinSalt         NVARCHAR(64) NULL,
    Active          BIT NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2 DEFAULT SYSUTCDATETIME()
);

CREATE TABLE Teachers (
    TeacherId       INT IDENTITY PRIMARY KEY,
    SchoolId        INT NOT NULL REFERENCES Schools(SchoolId),
    UserId          INT NULL REFERENCES Users(UserId),
    FullName        NVARCHAR(120) NOT NULL,
    Email           NVARCHAR(255) NOT NULL UNIQUE,
    ClassName       NVARCHAR(50) NOT NULL,
    AvatarUrl       NVARCHAR(500) NULL,
    CreatedAt       DATETIME2 DEFAULT SYSUTCDATETIME()
);

CREATE TABLE Classes (
    ClassId         INT IDENTITY PRIMARY KEY,
    SchoolId        INT NOT NULL REFERENCES Schools(SchoolId),
    Name            NVARCHAR(80) NOT NULL,
    Grade           NVARCHAR(50) NOT NULL,
    TeacherId       INT NULL REFERENCES Teachers(TeacherId),
    CreatedAt       DATETIME2 DEFAULT SYSUTCDATETIME()
);

CREATE TABLE Learners (
    LearnerId       INT IDENTITY PRIMARY KEY,
    SchoolId        INT NOT NULL REFERENCES Schools(SchoolId),
    UserId          INT NULL REFERENCES Users(UserId),
    LearnerCode     NVARCHAR(10) NOT NULL UNIQUE,
    FullName        NVARCHAR(120) NOT NULL,
    Grade           NVARCHAR(50) NOT NULL,
    ClassName       NVARCHAR(50) NOT NULL,
    TeacherId       INT NOT NULL REFERENCES Teachers(TeacherId),
    CreatedAt       DATETIME2 DEFAULT SYSUTCDATETIME()
);

CREATE TABLE CheckIns (
    CheckInId       INT IDENTITY PRIMARY KEY,
    LearnerId       INT NOT NULL REFERENCES Learners(LearnerId),
    Mood            NVARCHAR(20) NOT NULL,
    IsOkay          BIT NOT NULL,
    ConcernType     NVARCHAR(100) NULL,
    OptionalMessage NVARCHAR(280) NULL,
    SubmittedAt     DATETIME2 DEFAULT SYSUTCDATETIME()
);

CREATE TABLE Alerts (
    AlertId         INT IDENTITY PRIMARY KEY,
    CheckInId       INT NOT NULL REFERENCES CheckIns(CheckInId),
    Level           NVARCHAR(20) NOT NULL,
    Status          NVARCHAR(30) NOT NULL DEFAULT 'Open',
    AcknowledgedAt  DATETIME2 NULL,
    AcknowledgedBy  NVARCHAR(120) NULL,
    CreatedAt       DATETIME2 DEFAULT SYSUTCDATETIME()
);

CREATE TABLE Cases (
    CaseId          INT IDENTITY PRIMARY KEY,
    AlertId         INT NOT NULL REFERENCES Alerts(AlertId),
    LearnerId       INT NOT NULL REFERENCES Learners(LearnerId),
    Status          NVARCHAR(30) NOT NULL DEFAULT 'Open', -- Open, Acknowledged, Monitoring, Escalated, Resolved
    CreatedAt       DATETIME2 DEFAULT SYSUTCDATETIME()
);

CREATE TABLE FollowUps (
    FollowUpId      INT IDENTITY PRIMARY KEY,
    CaseId          INT NOT NULL REFERENCES Cases(CaseId),
    TeacherId       INT NULL REFERENCES Teachers(TeacherId),
    FollowUpType    NVARCHAR(100) NOT NULL,
    Outcome         NVARCHAR(100) NOT NULL,
    CaseNote        NVARCHAR(2000) NULL,
    CompletedAt     DATETIME2 DEFAULT SYSUTCDATETIME()
);

CREATE TABLE CaseHistory (
    HistoryId       INT IDENTITY PRIMARY KEY,
    CaseId          INT NOT NULL REFERENCES Cases(CaseId),
    EventText       NVARCHAR(300) NOT NULL,
    ActorName       NVARCHAR(120) NOT NULL,
    Note            NVARCHAR(2000) NULL,
    CreatedAt       DATETIME2 DEFAULT SYSUTCDATETIME()
);

CREATE TABLE AuditLog (
    AuditId         INT IDENTITY PRIMARY KEY,
    ActorName       NVARCHAR(120) NOT NULL,
    ActorRole       NVARCHAR(20) NOT NULL,
    ActionName      NVARCHAR(80) NOT NULL,
    Detail          NVARCHAR(500) NULL,
    CreatedAt       DATETIME2 DEFAULT SYSUTCDATETIME()
);
