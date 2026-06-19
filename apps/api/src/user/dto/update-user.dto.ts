import { 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsDateString, 
  IsNumber 
} from 'class-validator';
import { Gender } from '@prisma/client';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: Date | string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsNumber()
  avatarMediaId?: number | bigint;

  @IsOptional()
  @IsNumber()
  coverMediaId?: number | bigint;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;
}