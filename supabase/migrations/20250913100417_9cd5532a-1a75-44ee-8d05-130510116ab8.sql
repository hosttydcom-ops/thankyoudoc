-- Add missing essential tables for healthcare system

-- Link doctors to hospitals (many-to-many relationship)
CREATE TABLE public.doctor_hospitals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL,
  hospital_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, hospital_id)
);

-- Patient insurance information
CREATE TABLE public.patient_insurance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  provider_name TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  group_number TEXT,
  coverage_type TEXT NOT NULL,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Specific appointment time slots
CREATE TABLE public.appointment_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  appointment_type_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, slot_date, start_time)
);

-- Patient allergies and medical alerts
CREATE TABLE public.patient_allergies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  allergen TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
  reaction TEXT,
  diagnosed_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Lab results and medical tests
CREATE TABLE public.lab_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  doctor_id UUID,
  test_name TEXT NOT NULL,
  test_type TEXT NOT NULL,
  result_value TEXT NOT NULL,
  reference_range TEXT,
  units TEXT,
  status TEXT DEFAULT 'normal' CHECK (status IN ('normal', 'abnormal', 'critical')),
  test_date DATE NOT NULL,
  report_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Pharmacies for prescription fulfillment
CREATE TABLE public.pharmacies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  license_number TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Vaccination records
CREATE TABLE public.vaccination_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  doctor_id UUID,
  vaccine_name TEXT NOT NULL,
  vaccine_type TEXT NOT NULL,
  dose_number INTEGER NOT NULL DEFAULT 1,
  vaccination_date DATE NOT NULL,
  next_due_date DATE,
  batch_number TEXT,
  manufacturer TEXT,
  site_administered TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.doctor_hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccination_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for doctor_hospitals
CREATE POLICY "Doctor hospitals are viewable by everyone" 
ON public.doctor_hospitals 
FOR SELECT 
USING (true);

-- RLS Policies for patient_insurance
CREATE POLICY "Patients can view their own insurance" 
ON public.patient_insurance 
FOR SELECT 
USING ((auth.jwt() ->> 'sub')::uuid = patient_id);

CREATE POLICY "Patients can manage their own insurance" 
ON public.patient_insurance 
FOR ALL 
USING ((auth.jwt() ->> 'sub')::uuid = patient_id) 
WITH CHECK ((auth.jwt() ->> 'sub')::uuid = patient_id);

-- RLS Policies for appointment_slots
CREATE POLICY "Appointment slots are viewable by everyone" 
ON public.appointment_slots 
FOR SELECT 
USING (true);

-- RLS Policies for patient_allergies
CREATE POLICY "Patients can view their own allergies" 
ON public.patient_allergies 
FOR SELECT 
USING ((auth.jwt() ->> 'sub')::uuid = patient_id);

CREATE POLICY "Patients can manage their own allergies" 
ON public.patient_allergies 
FOR ALL 
USING ((auth.jwt() ->> 'sub')::uuid = patient_id) 
WITH CHECK ((auth.jwt() ->> 'sub')::uuid = patient_id);

-- RLS Policies for lab_results
CREATE POLICY "Patients can view their own lab results" 
ON public.lab_results 
FOR SELECT 
USING ((auth.jwt() ->> 'sub')::uuid = patient_id);

CREATE POLICY "Patients can create their own lab results" 
ON public.lab_results 
FOR INSERT 
WITH CHECK ((auth.jwt() ->> 'sub')::uuid = patient_id);

-- RLS Policies for pharmacies
CREATE POLICY "Pharmacies are viewable by everyone" 
ON public.pharmacies 
FOR SELECT 
USING (is_active = true);

-- RLS Policies for vaccination_records
CREATE POLICY "Patients can view their own vaccination records" 
ON public.vaccination_records 
FOR SELECT 
USING ((auth.jwt() ->> 'sub')::uuid = patient_id);

CREATE POLICY "Patients can create their own vaccination records" 
ON public.vaccination_records 
FOR INSERT 
WITH CHECK ((auth.jwt() ->> 'sub')::uuid = patient_id);

-- Add missing foreign key relationships to appointments table
ALTER TABLE public.appointments ADD COLUMN appointment_type_id UUID;
ALTER TABLE public.appointments ADD COLUMN appointment_slot_id UUID;

-- Add triggers for updated_at columns
CREATE TRIGGER update_patient_insurance_updated_at
  BEFORE UPDATE ON public.patient_insurance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointment_slots_updated_at
  BEFORE UPDATE ON public.appointment_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patient_allergies_updated_at
  BEFORE UPDATE ON public.patient_allergies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lab_results_updated_at
  BEFORE UPDATE ON public.lab_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pharmacies_updated_at
  BEFORE UPDATE ON public.pharmacies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Fix doctors table to link to specialties properly
ALTER TABLE public.doctors ADD COLUMN specialty_id UUID;

-- Remove unnecessary duplicate notifications that aren't being used effectively
-- The current notifications table structure is good, keeping it