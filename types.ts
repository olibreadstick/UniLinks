
export enum DiscoveryType {
  EVENT = 'EVENT',
  PARTNER = 'PARTNER',
  CLUB = 'CLUB',
  COURSE = 'COURSE',
  NETWORKING = 'NETWORKING',
  COLLAB_REQUEST = 'COLLAB_REQUEST'
}

export interface UserProfile {
  id: string;
  name: string;
  major: string;
  interests: string[];
  bio: string;
  avatar: string;
  gpa: string;
  skills: string[];
  experience: string[];
}

export interface DiscoveryItem {
  id: string;
  type: DiscoveryType;
  title: string;
  description: string;
  image?: string;
  tags: string[];
  matchReason?: string;
  metadata?: any;
}

export interface CollabRequest extends DiscoveryItem {
  creatorId: string;
  targetGroupSize: number;
  participants: string[]; // List of names/IDs of people interested
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
