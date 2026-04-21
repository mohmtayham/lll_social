import { IsOptional, IsString } from 'class-validator';
export class CreateBlockDto {
  @IsString()
  blockerId: string;

  @IsString()
  blockedId: string;


}
