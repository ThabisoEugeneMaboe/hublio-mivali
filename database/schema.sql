-- Hublio Wellness Check-in — Database schema
-- SQL Server / Azure SQL compatible

CREATE TABLE Teachers (
    TeacherId       INT IDENTITY PRIMARY KEY,
    FullName        NVARCHAR(120) NOT NULL,
    Email           NVARCHAR(255) NOT NULL UNIQUE,
    ClassName       NVARCHAR(50) NOT NULL,
    AvatarUrl       NVARCHAR(500) NULL,
    CreatedAt       DATETIME2 DEFAULT SYSUTCDATETIME()
);

CREATE TABLE Learners (
    LearnerId       INT IDENTITY PRIMARY KEY,
    LearnerCode     NVARCHAR(10) NOT NULL UNIQUE,  -- e.g. 024
    FullName        NVARCHAR(120) NOT NULL,
    Grade           NVARCHAR(50) NOT NULL,
    ClassName       NVARCHAR(50) NOT NULL,
    TeacherId       INT NOT NULL REFERENCES Teachers(TeacherId),
    CreatedAt       DATETIME2 DEFAULT SYSUTCDATETIME()
);

CREATE TABLE CheckIns (
    CheckInId       INT IDENTITY PRIMARY KEY,
    LearnerId       INT NOT NULL REFERENCES Learners(LearnerId),
    Mood            NVARCHAR(20) NOT NULL,           -- Happy, Okay, Tired, Anxious, Sad, Sick
    IsOkay          BIT NOT NULL,
    ConcernType     NVARCHAR(100) NULL,
    OptionalMessage NVARCHAR(MAX) NULL,
    SubmittedAt     DATETIME2 DEFAULT SYSUTCDATETIME()
);

CREATE TABLE Alerts (
    AlertId         INT IDENTITY PRIMARY KEY,
    CheckInId       INT NOT NULL REFERENCES CheckIns(CheckInId),
    Level           NVARCHAR(20) NOT NULL,           -- Critical, Attention, New
    Status          NVARCHAR(30) NOT NULL DEFAULT 'Open', -- Open, Acknowledged, Resolved
    AcknowledgedAt  DATETIME2 NULL,
    CreatedAt       DATETIME2 DEFAULT SYSUTCDATETIME()
);

CREATE TABLE FollowUps (
    FollowUpId      INT IDENTITY PRIMARY KEY,
    AlertId         INT NOT NULL REFERENCES Alerts(AlertId),
    TeacherId       INT NOT NULL REFERENCES Teachers(TeacherId),
    FollowUpType    NVARCHAR(100) NOT NULL,
    Outcome         NVARCHAR(100) NOT NULL,
    CaseNote        NVARCHAR(MAX) NULL,
    CompletedAt     DATETIME2 DEFAULT SYSUTCDATETIME()
);

-- Seed data (matches demo prototype)
INSERT INTO Teachers (FullName, Email, ClassName, AvatarUrl)
VALUES ('Ms Kholofelo', 'kholofelo@school.local', 'Class 2B', 'mario.jpeg');

INSERT INTO Learners (LearnerCode, FullName, Grade, ClassName, TeacherId)
VALUES
('024', 'Thabo A.', 'Grade 5B', 'Class 2B', 1),
('031', 'Sipho K.', 'Grade 5B', 'Class 2B', 1),
('018', 'Amahle N.', 'Grade 4A', 'Class 2B', 1);
