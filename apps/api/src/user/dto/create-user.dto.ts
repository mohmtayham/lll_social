import { Role, Gender } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
    @IsString() 
    @IsEmail()
    email: string;
    @IsString()
    password: string;
    @IsString()
    name: string;
    @IsOptional()
    country:string;
    @IsOptional()
    city:string;
  @IsOptional()
    @IsEnum(Gender) // يفضل إضافة التحقق من الـ Enum
    gender: Gender;

    @IsOptional()
    @IsEnum(Role)   // يفضل إضافة التحقق من الـ Enum
    role: Role;
}