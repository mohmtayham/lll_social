import { IsOptional, IsString } from 'class-validator';
export class CreateBlockDto {

  @IsString()
  blockedId: string;


}
