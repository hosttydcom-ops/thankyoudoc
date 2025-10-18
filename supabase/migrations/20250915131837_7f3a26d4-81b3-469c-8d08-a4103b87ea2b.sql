-- Add new values to appointment_status enum
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'confirmed';