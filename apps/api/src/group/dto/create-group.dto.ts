import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { GroupPrivacy } from '@prisma/client';

export class CreateGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(GroupPrivacy)
  privacy?: GroupPrivacy;

  @IsOptional()
  @IsString()
  avatarMediaId?: string;

  @IsOptional()
  @IsString()
  coverMediaId?: string;

  @IsOptional()
  @IsBoolean()
  postsNeedApproval?: boolean;
}
