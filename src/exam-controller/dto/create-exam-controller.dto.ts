import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateExamControllerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class CreateExamControllerSuperDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  role: string;
}

export class ChangeRoleDto {
  @IsString()
  @IsIn(['admin', 'proctor'])
  @IsNotEmpty()
  role: string;
}
