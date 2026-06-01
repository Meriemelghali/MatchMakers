import { Club } from './club.model';

export interface ClubResponseDto {
  club: Club;
  logoUrl?: string;
}
