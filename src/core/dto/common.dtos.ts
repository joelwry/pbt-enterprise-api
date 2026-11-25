import { IsNotEmpty, IsString, IsOptional, IsEmail, IsDateString, IsArray, Length, IsUrl } from 'class-validator';

// Auth DTOs
export class LoginRequestDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsString()
  @Length(6, 100)
  password!: string;
}

export class LoginResponseDto {
  id!: string;
  email!: string;
  token!: string;
  refreshToken!: string;
}

// User DTOs
export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  lastName?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsUrl()
  avatar?: string;
}

// Common Response
export class ErrorResponseDto {
  success!: false;
  code!: string;
  message!: string;
  errors?: Array<{ field: string; message: string }>;
}
