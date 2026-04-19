import { IsOptional, IsString } from 'class-validator';
export class CreateMediaDto {
  @IsString()
  fileName: string;

  @IsString()
  originalName: string;

  @IsString()
  mimeType: string;

  @IsString()
  size: string;

  @IsOptional()
  @IsString()
  hash?: string;

  @IsString()
  path: string;

  @IsString()
  uploadedBy: string;
}
