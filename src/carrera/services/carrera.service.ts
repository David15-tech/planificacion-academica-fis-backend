// src/carrera/services/carrera.service.ts

import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
import { CarreraDto } from '../dto/carrera.dto';
import { CarreraEntity } from '../entities/carrera.entity';

@Injectable()
export class CarreraService {
  constructor(
    @InjectRepository(CarreraEntity)
    private carreraRepository: Repository<CarreraEntity>,
  ) {}

  /* ======================================= CREAR UNA CARRERA ===================================== */
  async crearUnaCarrera(carreraDto: CarreraDto) {
    try {
      const nuevaCarrera = this.carreraRepository.create(carreraDto);
      const carreraGuardada = await this.carreraRepository.save(nuevaCarrera);
      Logger.log(
        `Se ha creado exitosamente la carrera de ${carreraGuardada.nombre}.`,
        'CREAR_CARRERA',
      );
      return {
        mensaje: `Se ha creado exitosamente la carrera de ${carreraGuardada.nombre}.`,
      };
    } catch (error) {
      // 23505 = violación de índice único en Postgres
      if (error.code === '23505') {
        Logger.error(
          `La carrera con código ${carreraDto.codigo} ya está registrada.`,
          'CARRERA_YA_REGISTRADA',
        );
        throw new BadRequestException({
          code: 'CARRERA_YA_REGISTRADA',
          message: `La carrera con código ${carreraDto.codigo} ya está registrada.`,
        });
      }
      Logger.error(`Error al crear la carrera: ${error.message}`, 'ERROR_CREAR_CARRERA');
      throw new BadGatewayException('Error al crear la carrera.');
    }
  }

  /* =================================== ACTUALIZAR UNA CARRERA ==================================== */
  async actualizarCarreraPorID(
    idCarrera: string,
    carreraDto: CarreraDto,
  ): Promise<CarreraEntity> {
    try {
      const carreraExistente = await this.obtenerCarreraPorID(idCarrera);

      if (carreraExistente instanceof NotFoundException) {
        throw carreraExistente;
      }

      carreraExistente.nombre = carreraDto.nombre;
      carreraExistente.codigo = carreraDto.codigo;

      const carreraActualizada = await this.carreraRepository.save(carreraExistente);

      Logger.log(
        `Se ha actualizado la carrera con ID ${idCarrera} exitosamente.`,
        'ACTUALIZAR_CARRERA',
      );
      return carreraActualizada;
    } catch (error) {
      if (error.name === 'OptimisticLockVersionMismatchError') {
        Logger.error(
          `Conflicto al actualizar la carrera con ID ${idCarrera}.`,
          'CONFLICTO_ACTUALIZACION',
        );
        throw new BadGatewayException(
          'La carrera ha sido modificada por otro usuario. Por favor, intenta nuevamente.',
        );
      }
      if (error.code === '23505') {
        Logger.error(
          `La carrera con código ${carreraDto.codigo} ya está registrada.`,
          'CARRERA_YA_REGISTRADA',
        );
        throw new BadRequestException({
          code: 'CARRERA_YA_REGISTRADA',
          message: `La carrera con código ${carreraDto.codigo} ya está registrada.`,
        });
      }
      Logger.error(
        `Error al actualizar la carrera: ${error.message}`,
        'ERROR_ACTUALIZAR_CARRERA',
      );
      throw new BadGatewayException('Error al actualizar la carrera.');
    }
  }

  /* ==================================== ELIMINAR UNA CARRERA ===================================== */
  async eliminarCarreraPorID(idCarrera: string): Promise<DeleteResult> {
    try {
      const carrera = await this.obtenerCarreraPorID(idCarrera);
      if (carrera instanceof NotFoundException) {
        throw carrera;
      }

      const resultado = await this.carreraRepository.delete(idCarrera);

      if (resultado.affected === 0) {
        throw new NotFoundException(`No existe la carrera con id ${idCarrera}`);
      }

      Logger.log(
        `Se ha eliminado la carrera con ID ${idCarrera} exitosamente.`,
        'ELIMINAR_CARRERA',
      );
      return resultado;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      Logger.error(
        `Error al eliminar la carrera: ${error.message}`,
        'ERROR_ELIMINAR_CARRERA',
      );
      throw new BadGatewayException('Error al eliminar la carrera.');
    }
  }

  /* ========================= OBTENER UNA CARRERA POR CÓDIGO ========================= */
  async obtenerCarreraPorCodigo(
    codigoCarrera: string,
  ): Promise<CarreraEntity | NotFoundException> {
    const carrera = await this.carreraRepository.findOne({
      where: { codigo: codigoCarrera },
    });
    if (carrera) {
      return carrera;
    } else {
      return new NotFoundException(
        `No existe la carrera con el código ${codigoCarrera}`,
      );
    }
  }

  /* ========================= OBTENER UNA CARRERA POR ID ========================= */
  async obtenerCarreraPorID(
    idCarrera: string,
  ): Promise<CarreraEntity | NotFoundException> {
    const carrera = await this.carreraRepository.findOne({
      where: { id: idCarrera },
    });
    if (carrera) {
      return carrera;
    } else {
      return new NotFoundException(
        `No existe la carrera con el ID ${idCarrera}`,
      );
    }
  }

  /* ========================= OBTENER TODAS LAS CARRERAS ========================= */
  async obtenerCarreras(): Promise<CarreraEntity[]> {
    return this.carreraRepository.find();
  }
}
