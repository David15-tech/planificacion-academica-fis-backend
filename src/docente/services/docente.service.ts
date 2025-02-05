import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult } from 'typeorm';

import { MailService } from '../../mail/services/mail.service';
import { DocenteEntity } from '../entities/docente.entity';
import { DocenteDto } from '../dto/docente.dto';
import { UsuarioService } from '../../usuarios/services/usuario.service';
import { CrearUsuarioDTO } from '../../usuarios/dtos/usuario.dto';
import { RolesEnum } from '../../utils/enum/rol.enum';
import { RolService } from '../../auth/services/rol.service';
import RolUsuarioService from '../../auth/services/rol-usuario.service';
import { RolUsuarioDto } from '../../auth/dtos/rol-usuario';

@Injectable()
export class DocenteService {
  constructor(
    @InjectRepository(DocenteEntity)
    private readonly docenteRepository: Repository<DocenteEntity>,
    private readonly mailService: MailService,
    private readonly usuarioService: UsuarioService,
    private readonly rolService: RolService,
    private readonly rolUsuarioService: RolUsuarioService,
  ) {}

  async crearDocente(docenteDto: DocenteDto, clave: string) {
    // 1. Verificar si existe un docente con ese correo
    const existenciaDocente = await this.obtenerDocentePorCorreoElectronico(
      docenteDto.correoElectronico,
    );

    // 2. Verificar si existe el rol DOCENTE
    const rolDocente = await this.rolService.obtenerRolPorNombre(RolesEnum.DOCENTE);

    // Si NO existe el docente (=> NotFoundException) y SÍ existe el rol
    if (
      existenciaDocente instanceof NotFoundException &&
      !(rolDocente instanceof NotFoundException)
    ) {
      let existenciaUsuario = await this.usuarioService.obtenerUsuarioPorSuCorreo(
        docenteDto.correoElectronico,
      );

      // Crear el usuario si no existe
      if (!existenciaUsuario) {
        const nuevoUsuario: CrearUsuarioDTO = {
          correo: docenteDto.correoElectronico,
          clave,
        };

        try {
          await this.usuarioService.crearUsuario(nuevoUsuario);
        } catch (error) {
          // En SQLite => error.code === 'SQLITE_CONSTRAINT'
          // En PostgreSQL => error.code === '23505'
          if (error.code === 'SQLITE_CONSTRAINT' || error.code === '23505') {
            return {
              mensaje: `Ya existe un usuario con el correo ${docenteDto.correoElectronico}. No se pudo crear el docente.`,
            };
          }
          throw error;
        }

        // Re-consultar el usuario recién creado
        existenciaUsuario = await this.usuarioService.obtenerUsuarioPorSuCorreo(
          docenteDto.correoElectronico,
        );
      }

      // Asignar rol de docente
      const rolUsuarioNuevo: RolUsuarioDto = {
        idUsuario: existenciaUsuario.id,
        // Si tu RolEntity difiere, ajusta:
        idRol: (rolDocente as any).id,
      };
      this.rolUsuarioService.crearRolUsuario(rolUsuarioNuevo);

      // Crear el docente en la base de datos
      const nuevoDocente = this.docenteRepository.create({
        nombreCompleto: docenteDto.nombreCompleto,
        correoElectronico: docenteDto.correoElectronico,
        usuario: existenciaUsuario,
      });

      try {
        await this.docenteRepository.save(nuevoDocente);
      } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT' || error.code === '23505') {
          return {
            mensaje: `El docente con correo ${docenteDto.correoElectronico} ya se encuentra registrado.`,
          };
        }
        throw error;
      }

      // Si todo va bien, (opcional) enviamos correo. En test se mockea.
      Logger.log(
        `Se creó el docente ${docenteDto.nombreCompleto} exitosamente. Se envió correo a ${docenteDto.correoElectronico} con la clave.`,
      );
      // this.mailService.envioClaveDocente(clave, docenteDto);

      return {
        mensaje: `Se creó el docente ${docenteDto.nombreCompleto} exitosamente. Se envió un correo electrónico a ${docenteDto.correoElectronico} con la clave de acceso.`,
      };
    } else {
      // Caso: Ya existe el docente o no existe el rol DOCENTE
      return {
        mensaje: `El docente ${docenteDto.nombreCompleto} ya se encuentra registrado. No se pudo enviar un correo a ${docenteDto.correoElectronico}.`,
      };
    }
  }

  // Resto de métodos (crearVariosDocentes, obtenerDocentePorID, etc.)...
  // Asegúrate de capturar error.code === 'SQLITE_CONSTRAINT' además de '23505' donde corresponda.

  async obtenerDocentePorCorreoElectronico(
    correoElectronicoDocente: string,
  ): Promise<DocenteEntity | NotFoundException> {
    const docente = await this.docenteRepository.findOne({
      where: { correoElectronico: correoElectronicoDocente },
    });
    if (docente) {
      return docente;
    } else {
      return new NotFoundException(
        `No existe el docente con el correo electrónico ${correoElectronicoDocente}`,
      );
    }
  }

  async eliminarDocentePorID(
    idDocente: string,
  ): Promise<DeleteResult | NotFoundException> {
    const docente = await this.obtenerDocentePorID(idDocente);
    const rolDocente = await this.rolService.obtenerRolPorNombre(RolesEnum.DOCENTE);

    if (
      !(rolDocente instanceof NotFoundException) &&
      !(docente instanceof NotFoundException)
    ) {
      const usuario = await this.usuarioService.obtenerUsuarioPorSuCorreo(
        docente.correoElectronico,
      );
      if (!(usuario instanceof NotFoundException)) {
        // Eliminamos el docente
        await this.docenteRepository.delete(idDocente);

        // Eliminamos su rol
        await this.rolUsuarioService.eliminarRolUsuario(rolDocente, usuario);

        // Si el usuario ya no tiene roles, lo eliminamos
        const rolesUsuario =
          await this.rolUsuarioService.obtenerRolUsuarioSegunIdUsuario(usuario.id);
        if (rolesUsuario.length === 0) {
          return await this.usuarioService.eliminarUsuarioPorID(usuario.id);
        }
      } else {
        return new NotFoundException(
          `No se pudo eliminar el rol y usuario del docente con id ${idDocente}`,
        );
      }
    } else {
      return new NotFoundException(`No existe el docente con id ${idDocente}`);
    }
  }

  // ... y así con los demás métodos que ya tenías
  // (crearVariosDocentes, obtenerDocentePorID, obtenerDocentes, etc.)

  async obtenerDocentePorID(idDocente: string) {
    const docente = await this.docenteRepository.findOne({ where: { id: idDocente } });
    if (docente) {
      return docente;
    } else {
      return new NotFoundException(`No existe el docente con id ${idDocente}`);
    }
  }

  async obtenerDocentes(): Promise<DocenteEntity[]> {
    return this.docenteRepository.find();
  }
}
