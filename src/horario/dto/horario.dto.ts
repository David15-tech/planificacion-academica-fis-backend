import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class HorarioDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  idUsuario: string;  // El ID del usuario (string, podría ser UUID)

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty()
  @IsString()
  horarioJson: string;  // Contenido JSON en forma de string
}