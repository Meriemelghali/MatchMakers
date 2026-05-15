import { Sport } from '../../sports/sport.model';
import { Team } from '../../teams/services/team.service';

export interface UserRef {
  id: string;
  fullName: string;
  profileImageUrl: string;
}

export interface Club {
  id?: string;
  nameClub: string;
  city: string;
  descriptionClub: string;
  logoFileName?: string;
  logoUrl?: string;
  sports?: Sport[];
  teamIds?: string[];
  teams?: Team[];
  ownerId?: string;
  createdBy?: UserRef;
}
