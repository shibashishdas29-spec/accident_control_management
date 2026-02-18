-- ═══════════════════════════════════════════════════════
-- AEGIS — PostgreSQL Schema
-- Run: psql -U postgres -d aegis_db -f schema.sql
-- ═══════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── INCIDENTS TABLE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
    id               SERIAL PRIMARY KEY,
    incident_id      VARCHAR(30)  UNIQUE NOT NULL,
    severity         VARCHAR(10)  NOT NULL CHECK (severity IN ('critical','moderate','minor')),
    type             VARCHAR(30),
    location         VARCHAR(255) NOT NULL,
    latitude         DECIMAL(10, 7),
    longitude        DECIMAL(10, 7),
    vehicles_involved INT DEFAULT 1,
    casualties       INT DEFAULT 0,
    survival_rate    DECIMAL(5,2),
    status           VARCHAR(20)  NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','resolved','closed')),
    camera_ids       TEXT[],
    officer_id       VARCHAR(30),
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    resolved_at      TIMESTAMP,
    updated_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_status   ON incidents(status);
CREATE INDEX idx_incidents_created  ON incidents(created_at DESC);

-- ─── CAMERAS TABLE ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS cameras (
    id          SERIAL PRIMARY KEY,
    camera_id   VARCHAR(20) UNIQUE NOT NULL,
    name        VARCHAR(100),
    location    VARCHAR(255),
    latitude    DECIMAL(10,7),
    longitude   DECIMAL(10,7),
    stream_url  TEXT,
    resolution  VARCHAR(20) DEFAULT 'HD 1080p',
    ai_enabled  BOOLEAN DEFAULT TRUE,
    status      VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','maintenance')),
    last_ping   TIMESTAMP,
    incidents_detected INT DEFAULT 0,
    installed_at TIMESTAMP DEFAULT NOW()
);

-- ─── SPEED VIOLATIONS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS speed_violations (
    id              SERIAL PRIMARY KEY,
    violation_id    VARCHAR(30) UNIQUE NOT NULL DEFAULT ('SPD-' || TO_CHAR(NOW(),'YYYY') || '-' || uuid_generate_v4()::VARCHAR(8)),
    plate_number    VARCHAR(20) NOT NULL,
    speed_kmh       DECIMAL(6,2) NOT NULL,
    speed_limit     DECIMAL(6,2) NOT NULL,
    location        VARCHAR(255),
    camera_id       VARCHAR(20),
    image_url       TEXT,
    severity        VARCHAR(10) CHECK (severity IN ('minor','moderate','critical')),
    challan_issued  BOOLEAN DEFAULT FALSE,
    detected_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_speed_plate    ON speed_violations(plate_number);
CREATE INDEX idx_speed_detected ON speed_violations(detected_at DESC);

-- ─── ALERTS TABLE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
    id           SERIAL PRIMARY KEY,
    alert_id     VARCHAR(30) UNIQUE NOT NULL,
    incident_id  VARCHAR(30) REFERENCES incidents(incident_id),
    type         VARCHAR(30),
    severity     VARCHAR(10),
    message      TEXT,
    notified_at  TIMESTAMP DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT FALSE,
    ack_at       TIMESTAMP,
    ack_by       VARCHAR(50)
);

-- ─── AUTHORITIES TABLE ───────────────────────────────────
CREATE TABLE IF NOT EXISTS authorities (
    id              SERIAL PRIMARY KEY,
    unit_id         VARCHAR(30) UNIQUE NOT NULL,
    authority_type  VARCHAR(30) NOT NULL CHECK (authority_type IN ('police','ambulance','fire','highway','medical-team','air-ambulance')),
    name            VARCHAR(100),
    contact         VARCHAR(20),
    status          VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available','dispatched','unavailable')),
    latitude        DECIMAL(10,7),
    longitude       DECIMAL(10,7),
    last_dispatch   TIMESTAMP
);

-- ─── DISPATCH LOG ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dispatch_log (
    id             SERIAL PRIMARY KEY,
    log_id         VARCHAR(30) UNIQUE NOT NULL,
    incident_id    VARCHAR(30) REFERENCES incidents(incident_id),
    unit_id        VARCHAR(30) REFERENCES authorities(unit_id),
    dispatched_at  TIMESTAMP DEFAULT NOW(),
    arrived_at     TIMESTAMP,
    cleared_at     TIMESTAMP,
    eta_minutes    INT,
    notes          TEXT
);

-- ─── REPORTS TABLE ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
    id            SERIAL PRIMARY KEY,
    report_id     VARCHAR(30) UNIQUE NOT NULL,
    incident_id   VARCHAR(30) REFERENCES incidents(incident_id),
    title         VARCHAR(255),
    summary       TEXT,
    survival_rate DECIMAL(5,2),
    generated_by  VARCHAR(100),
    generated_at  TIMESTAMP DEFAULT NOW(),
    status        VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','submitted','reviewed','closed')),
    pdf_url       TEXT
);

-- ─── SEED DATA ────────────────────────────────────────────
INSERT INTO cameras (camera_id, name, location, latitude, longitude, status) VALUES
  ('CAM-01','NH-44 Junction A',    'NH-44, Junction A, Chennai',    13.0827, 80.2707, 'active'),
  ('CAM-02','Ring Road West',      'Ring Road West, Km 12',         13.0569, 80.2425, 'active'),
  ('CAM-03','Highway Overpass',    'Highway Overpass, Tambaram',    12.9249, 80.1000, 'active'),
  ('CAM-04','City Bypass Exit-4',  'City Bypass, Exit 4, Sholinganallur', 12.9010, 80.2279, 'active')
ON CONFLICT DO NOTHING;

INSERT INTO authorities (unit_id, authority_type, name, contact, status) VALUES
  ('AMB-A1',  'ambulance',      'Ambulance Unit A', '108',       'available'),
  ('POL-T12', 'police',         'Traffic Police #12','100',      'available'),
  ('FIRE-01', 'fire',           'Fire & Rescue #1', '101',       'available'),
  ('MED-EMG', 'medical-team',   'Emergency Medical','1800-180',  'available'),
  ('HWY-M3',  'highway',        'Highway Maint #3', '1800-ROAD', 'available')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE incidents IS 'Core accident incident records';
COMMENT ON TABLE cameras   IS 'CCTV camera registry';
COMMENT ON TABLE speed_violations IS 'Speed radar violation logs';
COMMENT ON TABLE dispatch_log     IS 'Authority dispatch tracking';
