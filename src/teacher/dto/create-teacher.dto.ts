import {
  IsEmail,
  IsIn,
  IsNumber,
  IsPhoneNumber,
  IsString,
  IsStrongPassword,
  Length,
} from 'class-validator';

export class CreateTeacherDto {
  @IsNumber()
  sap_id: number;

  @IsString()
  name: string;

  @IsPhoneNumber('IN')
  phone: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsIn(['SOHST', 'SOCS', 'SOE', 'SOD'])
  school: string;

  @IsStrongPassword({
    minLength: 8,
    minLowercase: 0,
    minNumbers: 0,
    minSymbols: 0,
    minUppercase: 0,
  })
  password: string;
}
