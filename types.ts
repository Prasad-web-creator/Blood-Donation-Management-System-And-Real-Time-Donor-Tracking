
export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export enum UrgencyLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface Donor {
  id: string;
  name: string;
  bloodType: BloodType;
  lastDonation: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  status: 'available' | 'donated-recently' | 'unavailable';
  distance?: number;
}

export interface BloodRequest {
  id: string;
  hospital: string;
  bloodType: BloodType;
  units: number;
  urgency: UrgencyLevel;
  timestamp: string;
  status: 'pending' | 'fulfilled' | 'in-transit';
  contact?: string;
}

export interface InventoryStats {
  bloodType: BloodType;
  units: number;
  expiryAlert: boolean;
}

export interface SmartInsights {
  prediction: string;
  recommendedAction: string;
  trend: 'increasing' | 'decreasing' | 'stable';
}
