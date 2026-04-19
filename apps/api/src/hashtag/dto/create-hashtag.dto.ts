import { IsOptional, IsString } from 'class-validator';
export class CreateHashtagDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  nameLower: string;
}
