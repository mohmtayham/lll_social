// import { 
//   IsString, 
//   IsOptional, 
//   IsEnum, 
//   IsDateString, 
//   IsNumber 
// } from 'class-validator';
// import { Gender } from '@prisma/client';

// export class UpdateProfileDto {
//   @IsOptional()
//   @IsString()
//   name?: string;

//   @IsOptional()
//   @IsString()
//   username?: string;

//   @IsOptional()
//   @IsString()
//   phone?: string;

//   @IsOptional()
//   @IsDateString()
//   dateOfBirth?: Date | string;

//   @IsOptional()
//   @IsEnum(Gender)
//   gender?: Gender;

//   @IsOptional()
//   @IsString()
//   bio?: string;

//   @IsOptional()
//   @IsNumber()
//   avatarMediaId?: number | bigint;

//   @IsOptional()
//   @IsNumber()
//   coverMediaId?: number | bigint;

//   @IsOptional()
//   @IsString()
//   location?: string;

//   @IsOptional()
//   @IsString()
//   country?: string;

//   @IsOptional()
//   @IsString()
//   city?: string;
// }
import { Gender } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  bio?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  // IDs of Media rows already uploaded (e.g. via /media/upload) to set as avatar/cover
  @IsOptional()
  @IsNumberString()
  avatarMediaId?: string;

  @IsOptional()
  @IsNumberString()
  coverMediaId?: string;
}