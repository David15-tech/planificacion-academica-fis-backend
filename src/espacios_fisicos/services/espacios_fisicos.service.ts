import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, Connection } from 'typeorm';
import { EspacioFisicoDTO } from '../dto';
import { EspacioFisicoEntity } from '../entities/espacio_fisico.entity';
import { TipoAulaService } from '../../../src/parametros-iniciales/services/tipo-aula.service';
import { FacultadService } from '../../../src/parametros-iniciales/services/facultad.service';

@Injectable()
export class EspaciosFisicosService {
  constructor(
    @InjectRepository(EspacioFisicoEntity)
    private espaciosFisicosRepository: Repository<EspacioFisicoEntity>,
    private readonly tipoAulaService: TipoAulaService,
    private readonly facultadService: FacultadService,
    private readonly connection: Connection, // Inyecta la conexión de TypeORM para transacciones
  ) {}

  /* Create */
  async crearEspacioFisico(espacioFisico: EspacioFisicoDTO) {
    try {
      // Buscar registros ya existentes con el mismo nombre
      const coincidencias = await this.espaciosFisicosRepository.findOne({
        where: { nombre: espacioFisico.nombre },
      });

      if (coincidencias) {
        Logger.error(
          `El espacio físico ${espacioFisico.nombre} ya está registrado.`,
          'ESPACIO_FISICO_YA_REGISTRADO',
        );
        throw new BadRequestException({
          code: 'ESPACIO_FISICO_YA_REGISTRADO',
          message: `El espacio físico ${espacioFisico.nombre} ya está registrado.`,
        });
      }

      const tipoAula = await this.tipoAulaService.obtenerTipoAulaPorId(
        espacioFisico.tipo_id,
      );

      const entidadARegistrar = this.espaciosFisicosRepository.create({
        nombre: espacioFisico.nombre,
        tipo: tipoAula,
        aforo: espacioFisico.aforo,
      });

      const espacioFisicoGuardado = await this.espaciosFisicosRepository.save(entidadARegistrar);

      Logger.log(
        `Se creó el espacio físico ${espacioFisicoGuardado.nombre} de manera exitosa!`,
        'CREAR_ESPACIO_FISICO',
      );

      return {
        filasAlteradas: 1,
        mensaje: `Se creó el espacio físico ${espacioFisicoGuardado.nombre} de manera exitosa!`,
      };
    } catch (error) {
      if (error.code === '23505') { // Código de violación de índice único en PostgreSQL
        Logger.error(
          `El espacio físico ${espacioFisico.nombre} ya está registrado.`,
          'ESPACIO_FISICO_YA_REGISTRADO',
        );
        throw new BadRequestException({
          code: 'ESPACIO_FISICO_YA_REGISTRADO',
          message: `El espacio físico ${espacioFisico.nombre} ya está registrado.`,
        });
      }
      Logger.error(
        `Error al crear el espacio físico: ${error.message}`,
        'ERROR_CREAR_ESPACIO_FISICO',
      );
      throw new BadGatewayException('Error al crear el espacio físico.');
    }
  }

  async crearMultiplesEspaciosFisicos(espaciosFisicos: EspacioFisicoDTO[]) {
    const queryRunner = this.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const espaciosFisicosGuardados: EspacioFisicoEntity[] = [];
      const espaciosFisicosRepetidos: EspacioFisicoDTO[] = [];

      for (const espacioFisico of espaciosFisicos) {
        const coincidencia = await queryRunner.manager.findOne(EspacioFisicoEntity, {
          where: { nombre: espacioFisico.nombre },
        });

        if (coincidencia) {
          espaciosFisicosRepetidos.push(espacioFisico);
          continue;
        }

        const tipoAula = await this.tipoAulaService.obtenerTipoAulaPorId(
          espacioFisico.tipo_id,
        );

        const entidadARegistrar = queryRunner.manager.create(EspacioFisicoEntity, {
          nombre: espacioFisico.nombre,
          tipo: tipoAula,
          aforo: espacioFisico.aforo,
        });

        const espacioFisicoGuardado = await queryRunner.manager.save(entidadARegistrar);
        espaciosFisicosGuardados.push(espacioFisicoGuardado);
      }

      await queryRunner.commitTransaction();

      Logger.log(
        `Se han creado ${espaciosFisicosGuardados.length} espacios físicos exitosamente.`,
        'CREAR_MULTIPLES_ESPACIOS_FISICOS',
      );

      return {
        filasAlteradas: espaciosFisicosGuardados.length,
        mensaje: `Se han creado ${espaciosFisicosGuardados.length} registros. Hay ${espaciosFisicosRepetidos.length} repetidos${espaciosFisicosRepetidos.length > 0 ? ': ' + espaciosFisicosRepetidos.map((registro) => registro.nombre).join(', ') : ''}.`,
        registrosCreados: espaciosFisicosGuardados,
        registrosRepetidos: espaciosFisicosRepetidos,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error.code === '23505') { // Violación de índice único
        Logger.error(
          'Violación de índice único durante la creación masiva de espacios físicos.',
          'ERROR_MASIVO_ESPACIOS_FISICOS',
        );
        throw new BadRequestException({
          code: 'ERROR_MASIVO_ESPACIOS_FISICOS',
          message: 'Se produjo una violación de índice único durante la creación masiva de espacios físicos.',
        });
      }

      Logger.error(
        `Error al crear múltiples espacios físicos: ${error.message}`,
        'ERROR_MASIVO_ESPACIOS_FISICOS',
      );
      throw new BadGatewayException('Error al crear espacios físicos masivamente.');
    } finally {
      await queryRunner.release();
    }
  }

  /* Read */
  async obtenerEspaciosFisicos(): Promise<EspacioFisicoEntity[]> {
    try {
      return await this.espaciosFisicosRepository.find({
        relations: ['tipo', 'tipo.facultad'],
      });
    } catch (error) {
      Logger.error(
        `Error al obtener espacios físicos: ${error.message}`,
        'ERROR_OBTENER_ESPACIOS_FISICOS',
      );
      throw new BadGatewayException('Error al obtener espacios físicos.');
    }
  }

  async obtenerEspacioFisicoPorId(id: string): Promise<EspacioFisicoEntity> {
    try {
      const espacioFisico = await this.espaciosFisicosRepository.findOne({
        where: { id: id },
        relations: ['tipo'],
      });
      if (espacioFisico) {
        return espacioFisico;
      } else {
        throw new NotFoundException(`No existe el espacio físico con ID ${id}`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      Logger.error(
        `Error al obtener el espacio físico por ID: ${error.message}`,
        'ERROR_OBTENER_ESPACIO_FISICO_POR_ID',
      );
      throw new BadGatewayException('Error al obtener el espacio físico.');
    }
  }

  /*NB*/
  async obtenerEspaciosFisicosPorTipoDeAula(
    idTipoAula: string,
  ): Promise<EspacioFisicoEntity[]> {
    try {
      return await this.espaciosFisicosRepository.find({
        where: { tipo: { id: idTipoAula } },
      });
    } catch (error) {
      Logger.error(
        `Error al obtener espacios físicos por tipo de aula: ${error.message}`,
        'ERROR_OBTENER_ESPACIOS_FISICOS_POR_TIPO_AULA',
      );
      throw new BadGatewayException('Error al obtener espacios físicos por tipo de aula.');
    }
  }

  /* Update */
  async actualizarEspacioFisicoPorId(
    id: string,
    espacioFisico: EspacioFisicoDTO,
  ) {
    try {
      // Buscar el espacio físico existente
      const espacioFisicoExistente = await this.espaciosFisicosRepository.findOne({
        where: { id: id },
      });

      if (!espacioFisicoExistente) {
        throw new NotFoundException(`No existe el espacio físico con ID ${id}`);
      }

      // Verificar si el nuevo nombre ya está registrado por otro espacio físico
      const coincidencia = await this.espaciosFisicosRepository.findOne({
        where: { nombre: espacioFisico.nombre },
      });

      if (coincidencia && coincidencia.id !== id) {
        Logger.error(
          `El espacio físico con el nombre ${espacioFisico.nombre} ya existe.`,
          'ESPACIO_FISICO_YA_EXISTENTE',
        );
        throw new BadRequestException({
          code: 'ESPACIO_FISICO_YA_EXISTENTE',
          message: `El espacio físico con el nombre ${espacioFisico.nombre} ya existe. Ingrese un nuevo nombre.`,
        });
      }

      const tipoAula = await this.tipoAulaService.obtenerTipoAulaPorId(
        espacioFisico.tipo_id,
      );

      // Actualizar los campos necesarios
      espacioFisicoExistente.nombre = espacioFisico.nombre;
      espacioFisicoExistente.tipo = tipoAula;
      espacioFisicoExistente.aforo = espacioFisico.aforo;

      // Usar save para manejar Optimistic Locking
      const espacioFisicoActualizado = await this.espaciosFisicosRepository.save(espacioFisicoExistente);

      Logger.log(
        `Espacio físico con ID ${id} actualizado exitosamente.`,
        'ACTUALIZAR_ESPACIO_FISICO',
      );

      return {
        filasAlteradas: 1,
        mensaje: 'Actualizado exitosamente',
      };
    } catch (error) {
      if (error.code === '23505') { // Violación de índice único
        Logger.error(
          `El espacio físico con el nombre ${espacioFisico.nombre} ya existe.`,
          'ESPACIO_FISICO_YA_EXISTENTE',
        );
        throw new BadRequestException({
          code: 'ESPACIO_FISICO_YA_EXISTENTE',
          message: `El espacio físico con el nombre ${espacioFisico.nombre} ya existe. Ingrese un nuevo nombre.`,
        });
      }

      if (error instanceof NotFoundException) {
        throw error;
      }

      Logger.error(
        `Error al actualizar el espacio físico: ${error.message}`,
        'ERROR_ACTUALIZAR_ESPACIO_FISICO',
      );
      throw new BadGatewayException('Error al actualizar el espacio físico.');
    }
  }

  /* Delete */
  async eliminarEspacioFisicoPorId(id: string) {
    try {
      const resultado = await this.espaciosFisicosRepository.delete(id);

      if (resultado.affected === 0) {
        throw new NotFoundException(`No existe el espacio físico con ID ${id}`);
      }

      Logger.log(
        `Se ha eliminado el espacio físico con ID ${id} exitosamente.`,
        'ELIMINAR_ESPACIO_FISICO',
      );

      return resultado;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      Logger.error(
        `Error al eliminar el espacio físico: ${error.message}`,
        'ERROR_ELIMINAR_ESPACIO_FISICO',
      );
      throw new BadGatewayException('Error al eliminar el espacio físico.');
    }
  }

  /* Leer información de un archivo y devolver un arreglo de Espacios Físicos */
  async leerArchivoEspaciosFisicos(
    archivo: Express.Multer.File,
  ): Promise<EspacioFisicoEntity[]> {
    try {
      const datos = archivo.buffer.toString('utf-8');

      const expresionRegular =
        /[A-Za-z0-9 ]*;[A-Za-z0-9 ]*;[A-Za-z0-9 ]*;[0-9]+/g;
      const filas = datos.match(expresionRegular);

      const espaciosFisicos: EspacioFisicoEntity[] = [];

      if (filas) {
        for (const fila of filas) {
          // Se obtienen los datos de la fila del archivo
          const info = fila.split(';');
          const nombre = info[0];
          const tipo = info[1];
          const facultad = info[2];
          const aforo = Number(info[3]);

          // Busca si la facultad existe
          const entidadFacultad =
            await this.facultadService.obtenerFacultadPorSuNombre(facultad);
          // Si una facultad del archivo no existe
          if (!entidadFacultad) {
            throw new HttpException(
              'Se encontraron errores en la columna "Facultad". Verifique que las facultades indicadas en el archivo existan en el sistema.',
              HttpStatus.BAD_REQUEST,
            );
          }

          // Comprueba que el aforo se encuentre bajo los límites establecidos
          if (aforo < 3 || aforo > 200 || !Number.isInteger(aforo)) {
            throw new HttpException(
              'Se encontraron errores en la columna "Aforo". Verifique que el aforo sea un entero entre 3 y 200.',
              HttpStatus.BAD_REQUEST,
            );
          }

          // Busca si el tipo existe en la facultad indicada
          const entidadTipo =
            await this.tipoAulaService.obtenerTipoAulaPorNombreYFacultad(
              tipo,
              facultad,
            );
          // El tipo existe en la facultad indicada
          if (entidadTipo) {
            const espacioFisicoEntity = this.espaciosFisicosRepository.create({
              nombre: nombre,
              tipo: entidadTipo,
              aforo: aforo,
            });

            espaciosFisicos.push(espacioFisicoEntity);
          } else {
            throw new HttpException(
              'Se encontraron errores en la columna "Tipo". Verifique que los tipos indicados en el archivo correspondan a una facultad existente.',
              HttpStatus.BAD_REQUEST,
            );
          }
        }
      }

      return espaciosFisicos;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      Logger.error(
        `Error al leer el archivo de espacios físicos: ${error.message}`,
        'ERROR_LEER_ARCHIVO_ESPACIOS_FISICOS',
      );
      throw new BadGatewayException('Error al procesar el archivo de espacios físicos.');
    }
  }
}
