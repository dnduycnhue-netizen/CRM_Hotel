export interface RegistrationCardData {
  stayId: string;
  hotel: {
    name: string;
    code: string;
    address: string | null;
    phone: string | null;
  };
  stay: {
    roomNumber: string;
    roomType: string;
    checkInAt: string;
    expectedCheckOutAt: string;
    nights: number;
    sourceChannelName: string;
    externalRef?: string | null;
    note?: string | null;
  };
  guest: {
    id: string;
    fullName: string;
    phone: string | null;
    gender: string;
    dob: string | null;
    docType: string | null;
    docNumber: string | null;
    nationality: string | null;
  };
  companions: Array<{
    id: string;
    fullName: string;
    gender: string;
    dob: string | null;
    docType: string | null;
    docNumber: string | null;
  }>;
}

