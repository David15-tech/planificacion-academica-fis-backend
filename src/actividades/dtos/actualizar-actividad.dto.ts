import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ActualizarActividadDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  idAsignatura: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  idDocente: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  idTipoAula: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  idGrupo: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  duracion: number;

  /**
   * Campo indispensable para el Optimistic Locking.
   * El front-end debe enviar aquí la versión
   * que el usuario tenía al momento de editar.
   */
  @ApiProperty({ description: 'Versión para manejar Optimistic Locking' })
  @IsNumber()
  @IsNotEmpty()
  version: number;
}
