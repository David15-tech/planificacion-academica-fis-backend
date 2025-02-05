import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeleteResult,
  Repository,
  Connection,
  QueryRunner,
} from 'typeorm';
import { AsignaturaDto } from '../dto/asignatura.dto';
import { AsignaturaEntity } from '../entities/asignatura.entity';

@Injectable()
export class AsignaturaService {
  constructor(
    @InjectRepository(AsignaturaEntity)
    private readonly asignaturaRepository: Repository<AsignaturaEntity>,

    // Inyectamos la conexión para poder usar QueryRunner en algunos métodos
    private connection: Connection,
  ) {}

  /* ====================================================================================================================== */
  /* ====================================== CREAR UNA ASIGNATURA EN LA BASE DE DATOS ====================================== */
  /* ====================================================================================================================== */

  async crearUnaAsignatura(asignaturaDto: AsignaturaDto) {
    // Verificamos si ya existe usando la función obtenerAsignaturaPorCodigo
    const existenciaAsignatura = await this.obtenerAsignaturaPorCodigo(
      asignaturaDto.codigo,
    );

    // Si "existenciaAsignatura" es NotFoundException, significa que NO existe en la BD
    if (existenciaAsignatura instanceof NotFoundException) {
      const asignaturaNueva = {
        codigo: asignaturaDto.codigo,
        nombre: asignaturaDto.nombre,
        creditos: Number(asignaturaDto.creditos),
      };

      try {
        // Intentamos guardar. Si la BD detecta que el codigo es duplicado, lanzará error con code "SQLITE_CONSTRAINT" o "23505"
        await this.asignaturaRepository.save(asignaturaNueva);
        return {
          mensaje:
            `Se creó la asignatura ${asignaturaDto.codigo} - ` +
            `${asignaturaDto.nombre} existosamente.`,
        };
      } catch (error) {
        // Atrapar violaciones de restricciones únicas en Postgres y SQLite
        if (
          error.code === '23505' ||           // Postgres
          error.code === 'SQLITE_CONSTRAINT'  // SQLite (posible "SQLITE_CONSTRAINT_UNIQUE")
        ) {
          return {
            mensaje: `La asignatura ${asignaturaDto.codigo} - ` +
              `${asignaturaDto.nombre} ya se encuentra registrada.`,
          };
        }
        throw error; // Para otros errores, relanzamos la excepción
      }
    } else {
      // Aquí significa que la asignatura SÍ existe (existenciaAsignatura es una entidad real)
      return {
        mensaje:
          `La asignatura ${asignaturaDto.codigo} - ` +
          `${asignaturaDto.nombre} ya se encuentra registrada.`,
      };
    }
  }

  /* ====================================================================================================================== */
  /* ====================================== CREAR VARIAS ASIGNATURAS EN LA BASE DE DATOS ================================== */
  /* ====================================================================================================================== */

  async crearVariasAsignaturas(arregloAsignaturas: AsignaturaDto[]) {
    const asignaturasNoGuardadas: AsignaturaDto[] = [];
    let cantidadAsignaturaNoGuardada = 0;
    const asignaturasGuardadas: AsignaturaDto[] = [];
    let cantidadAsignaturaGuardada = 0;

    for (const asignatura of arregloAsignaturas) {
      const existenciaAsignaturaArchivo = await this.obtenerAsignaturaPorCodigo(
        asignatura.codigo,
      );

      if (existenciaAsignaturaArchivo instanceof NotFoundException) {
        const asignaturaNueva = {
          codigo: asignatura.codigo,
          nombre: asignatura.nombre,
          creditos: Number(asignatura.creditos),
        };

        try {
          await this.asignaturaRepository.save(asignaturaNueva);
          // Agregamos al arreglo de asignaturas guardadas
          asignaturasGuardadas[cantidadAsignaturaGuardada] = asignatura;
          cantidadAsignaturaGuardada++;
        } catch (error) {
          // Error de índice único (código 23505 en Postgres o 'SQLITE_CONSTRAINT' en SQLite)
          if (error.code === '23505' || error.code === 'SQLITE_CONSTRAINT') {
            asignaturasNoGuardadas[cantidadAsignaturaNoGuardada] = asignatura;
            cantidadAsignaturaNoGuardada++;
          } else {
            throw error;
          }
        }
      } else {
        // Agregamos al arreglo de asignaturas no guardadas
        asignaturasNoGuardadas[cantidadAsignaturaNoGuardada] = asignatura;
        cantidadAsignaturaNoGuardada++;
      }
    }

    // Envío de resultados
    if (cantidadAsignaturaNoGuardada === 0) {
      return {
        mensaje:
          'Se han creado exitosamente ' +
          cantidadAsignaturaGuardada +
          ' asignaturas.',
        asignaturasIngresadas: asignaturasGuardadas,
      };
    } else {
      // Crear un arreglo con los nombres de las asignaturas duplicadas
      const nombreAsignaturasDuplicados = asignaturasNoGuardadas.map(
        (asig) => `${asig.codigo} - ${asig.nombre}`,
      );
      const nombresImprimibles = nombreAsignaturasDuplicados.join(', ');

      return {
        mensaje:
          'Se han creado exitosamente ' +
          cantidadAsignaturaGuardada +
          ' asignaturas.  No se pudo crear la/s asignatura/s: ' +
          nombresImprimibles +
          ', ya que, existen dentro del sistema.',
        asignaturasIngresadas: asignaturasGuardadas,
        asignaturasNoIngresadas: asignaturasNoGuardadas,
      };
    }
  }

  /* ====================================================================================================================== */
  /* =================================== ACTUALIZAR UNA ASIGNATURA EN LA BASE DE DATOS ==================================== */
  /* ====================================================================================================================== */

  async actualizarAsignaturaPorID(
    idAsignatura: string,
    asignaturaDto: AsignaturaDto,
  ): Promise<AsignaturaEntity | NotFoundException> {
    // Verificamos si la asignatura existe
    const asignatura = await this.obtenerAsignaturaPorID(idAsignatura);
    if (asignatura instanceof NotFoundException) {
      // Si no existe, devolvemos la excepción
      return asignatura;
    }

    // Mezclamos los campos nuevos con la asignatura existente
    this.asignaturaRepository.merge(asignatura, asignaturaDto);

    try {
      // Usamos save(...) para que TypeORM maneje el @VersionColumn
      // y lance error si hay un conflicto de versión (Optimistic Lock).
      const asignaturaActualizada =
        await this.asignaturaRepository.save(asignatura);
      return asignaturaActualizada;
    } catch (error) {
      // Manejo custom del error de concurrencia, si fuera el caso
      throw error;
    }
  }

  /* ====================================================================================================================== */
  /* ==================================== ELIMINAR UNA ASIGNATURA EN LA BASE DE DATOS ===================================== */
  /* ====================================================================================================================== */

  async eliminarAsignaturaPorID(
    idAsignatura: string,
  ): Promise<DeleteResult | NotFoundException> {
    const asignatura = await this.obtenerAsignaturaPorID(idAsignatura);
    if (asignatura instanceof NotFoundException) {
      return new NotFoundException(
        `No existe la asignatura con id ${idAsignatura}`,
      );
    } else {
      return await this.asignaturaRepository.delete(idAsignatura);
    }
  }

  /* ====================================================================================================================== */
  /* ============================= OBTENER UNA ASIGNATURA POR SU CÓDIGO EN LA BASE DE DATOS =============================== */
  /* ====================================================================================================================== */

  async obtenerAsignaturaPorCodigo(
    codigoAsignatura: string,
  ): Promise<AsignaturaEntity | NotFoundException> {
    const asignatura = await this.asignaturaRepository.findOne({
      where: { codigo: codigoAsignatura },
    });
    if (asignatura) {
      return asignatura;
    } else {
      return new NotFoundException(
        `No existe la asignatura con el código ${codigoAsignatura}`,
      );
    }
  }

  /* ====================================================================================================================== */
  /* =============================== OBTENER UNA ASIGNATURA POR SU ID EN LA BASE DE DATOS ================================= */
  /* ====================================================================================================================== */

  async obtenerAsignaturaPorID(
    idAsignatura: string,
  ): Promise<AsignaturaEntity | NotFoundException> {
    const asignatura = await this.asignaturaRepository.findOne({
      where: { id: idAsignatura },
    });
    if (asignatura) {
      return asignatura;
    } else {
      return new NotFoundException(
        `No existe la asignatura con el código ${idAsignatura}`,
      );
    }
  }

  /* ====================================================================================================================== */
  /* ================================= OBTENER TODAS LAS ASIGNATURAS EN LA BASE DE DATOS ================================== */
  /* ====================================================================================================================== */

  async obtenerAsignatura(): Promise<AsignaturaEntity[]> {
    return this.asignaturaRepository.find();
  }

  /* ====================================================================================================================== */
  /* ======================= EJEMPLO: CREAR VARIAS ASIGNATURAS USANDO TRANSACCIONES (OPCIONAL) ============================ */
  /* ====================================================================================================================== */

  async crearVariasAsignaturasConTransaccion(
    arregloAsignaturas: AsignaturaDto[],
  ) {
    const queryRunner: QueryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const asignaturasGuardadas: AsignaturaDto[] = [];
      const asignaturasNoGuardadas: AsignaturaDto[] = [];

      for (const asignaturaDto of arregloAsignaturas) {
        try {
          const asignatura = queryRunner.manager.create(AsignaturaEntity, {
            codigo: asignaturaDto.codigo,
            nombre: asignaturaDto.nombre,
            creditos: +asignaturaDto.creditos,
          });
          await queryRunner.manager.save(asignatura);
          asignaturasGuardadas.push(asignaturaDto);
        } catch (error) {
          if (error.code === '23505' || error.code === 'SQLITE_CONSTRAINT') {
            // Asignatura duplicada
            asignaturasNoGuardadas.push(asignaturaDto);
          } else {
            throw error;
          }
        }
      }

      await queryRunner.commitTransaction();

      return {
        mensaje: `Se han creado ${asignaturasGuardadas.length} asignaturas. Hubo ${asignaturasNoGuardadas.length} duplicadas.`,
        asignaturasGuardadas,
        asignaturasNoGuardadas,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadGatewayException(
        'Error al crear las asignaturas de forma masiva.',
      );
    } finally {
      await queryRunner.release();
    }
  }
}
