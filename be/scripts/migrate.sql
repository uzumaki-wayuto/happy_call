

-- Run this in SSMS to create the core tables
-- Your ERD already has the full schema, but let's start with essentials

-- 1. USERS table (authentication + SoD enforcement)
CREATE TABLE dbo.USERS (
    user_id             INT IDENTITY(1,1) PRIMARY KEY,
    username            VARCHAR(30)   NOT NULL UNIQUE,
    password_hash       VARCHAR(255)  NOT NULL,
    full_name           NVARCHAR(100) NOT NULL,
    role                VARCHAR(20)   NOT NULL,
    verification_type   VARCHAR(20)   NULL,
    pbx_extension       VARCHAR(10)   NULL,
    status              VARCHAR(10)   NOT NULL DEFAULT 'ACTIVE',
    created_at          DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    
    CONSTRAINT CK_Users_Role CHECK (role IN ('ADMIN','SUPERVISOR','VERIFIER')),
    CONSTRAINT CK_Users_Status CHECK (status IN ('ACTIVE','INACTIVE')),
    CONSTRAINT CK_Users_SoD CHECK (
        (role = 'VERIFIER' AND verification_type IS NOT NULL) OR
        (role IN ('ADMIN','SUPERVISOR') AND verification_type IS NULL)
    )
);

-- 2. VERIFICATION_TASKS table
CREATE TABLE dbo.VERIFICATION_TASKS (
    task_id            BIGINT IDENTITY(1,1) PRIMARY KEY,
    loan_id            VARCHAR(30)  NOT NULL,
    customer_name      NVARCHAR(100) NOT NULL,
    customer_phone     VARCHAR(20)  NOT NULL,
    task_type          VARCHAR(20)  NOT NULL,
    amount             DECIMAL(15,2) NOT NULL,
    assigned_agent_id  INT          NULL REFERENCES dbo.USERS(user_id),
    due_datetime       DATETIME2    NOT NULL,
    status             VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    attempt_count      INT          NOT NULL DEFAULT 0,
    created_at         DATETIME2    NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at         DATETIME2    NOT NULL DEFAULT SYSUTCDATETIME(),
    
    CONSTRAINT CK_Task_Type CHECK (task_type IN ('DISBURSEMENT','DEPOSIT')),
    CONSTRAINT CK_Task_Status CHECK (status IN ('PENDING','ASSIGNED','IN_PROGRESS','CONFIRMED','DISPUTED','NO_CONTACT','ESCALATED','CLOSED'))
);

-- 3. Insert test users
INSERT INTO dbo.USERS (username, password_hash, full_name, role, verification_type, pbx_extension)
VALUES 
    ('admin', '$2a$10$YourHashedPasswordHere', 'System Admin', 'ADMIN', NULL, '1001'),
    ('supervisor', '$2a$10$YourHashedPasswordHere', 'Supervisor One', 'SUPERVISOR', NULL, '1002'),
    ('agent1', '$2a$10$YourHashedPasswordHere', 'John Agent', 'VERIFIER', 'DISBURSEMENT', '2001'),
    ('agent2', '$2a$10$YourHashedPasswordHere', 'Mary Agent', 'VERIFIER', 'DEPOSIT', '2002');

-- Insert test tasks (for agent1)
INSERT INTO dbo.VERIFICATION_TASKS 
    (loan_id, customer_name, customer_phone, task_type, amount, assigned_agent_id, due_datetime, status)
VALUES
    ('LN-2026-00001', 'John Doe', '0998-123-4567', 'DISBURSEMENT', 150000, 3, GETDATE(), 'ASSIGNED'),
    ('LN-2026-00002', 'Jane Smith', '0917-765-4321', 'DISBURSEMENT', 250000, 3, GETDATE(), 'ASSIGNED');




-- be/scripts/migrate.sql
-- Run this in SSMS to create missing tables

-- CAMPAIGNS table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CAMPAIGNS')
BEGIN
    CREATE TABLE dbo.CAMPAIGNS (
        campaign_id     INT IDENTITY(1,1) PRIMARY KEY,
        name            NVARCHAR(255) NOT NULL,
        type            VARCHAR(20) NOT NULL,
        description     NVARCHAR(500) NULL,
        total_loans     INT NOT NULL DEFAULT 0,
        assigned        INT NOT NULL DEFAULT 0,
        completed       INT NOT NULL DEFAULT 0,
        confirmed       INT NOT NULL DEFAULT 0,
        disputed        INT NOT NULL DEFAULT 0,
        status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        start_date      DATE NULL,
        end_date        DATE NULL,
        created_by      INT NULL REFERENCES dbo.USERS(user_id),
        created_at      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        
        CONSTRAINT CK_Campaigns_Type CHECK (type IN ('DISBURSEMENT','DEPOSIT')),
        CONSTRAINT CK_Campaigns_Status CHECK (status IN ('DRAFT','ACTIVE','PAUSED','COMPLETED'))
    );
END

-- Add branch_id to LOANS if missing
IF NOT EXISTS (SELECT * FROM sys.columns WHERE name = 'branch_id' AND object_id = OBJECT_ID('LOANS'))
BEGIN
    ALTER TABLE dbo.LOANS ADD branch_id INT NULL REFERENCES dbo.BRANCHES(branch_id);
END

-- Insert sample branches
IF NOT EXISTS (SELECT * FROM dbo.BRANCHES)
BEGIN
    INSERT INTO dbo.BRANCHES (branch_name, branch_code)
    VALUES 
        ('Yangon Branch', 'YGN'),
        ('Mandalay Branch', 'MDL'),
        ('Bago Branch', 'BGO'),
        ('Naypyitaw Branch', 'NPT'),
        ('Pathein Branch', 'PTN');
END