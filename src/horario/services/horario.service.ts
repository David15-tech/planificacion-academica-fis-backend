// src/horario/services/horario.service.ts

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
import { UsuarioService } from '../../../src/usuarios/services/usuario.service';
import { HorarioDto } from '../dto/horario.dto';
import { HorarioEntity } from '../entities/horario.entity';
import { XMLBuilder } from 'fast-xml-parser';
import {
  nombreFacultad,
  nombreUniversidad,
} from '../../../src/utils/constantes';
import { JornadaLaboralService } from '../../../src/parametros-iniciales/services/jornada-laboral.service';
import { SemestreService } from '../../../src/parametros-iniciales/services/semestre.service';
import { AsignaturaService } from '../../../src/asignatura/services/asignatura.service';
import { TipoAulaService } from '../../../src/parametros-iniciales/services/tipo-aula.service';
import { DocenteService } from '../../../src/docente/services/docente.service';
import { HorasNoDisponiblesService } from '../../../src/horas_no_disponibles/services/horas_no_disponibles.service';
import { ActividadesService } from '../../../src/actividades/services/actividades.service';
import { NivelService } from '../../../src/niveles/services/nivel.service';
import { FacultadService } from '../../../src/parametros-iniciales/services/facultad.service';
import { EspaciosFisicosService } from '../../../src/espacios_fisicos/services/espacios_fisicos.service';
import * as fs from 'fs';
import { exec } from 'node:child_process';
import { xml2js } from 'xml-js';

@Injectable()
export class HorarioService {
  constructor(
    @InjectRepository(HorarioEntity)
    private repositorioHorario: Repository<HorarioEntity>,
    private usuarioService: UsuarioService,
    private jornadaLaboralService: JornadaLaboralService,
    private semestreService: SemestreService,
    private asignaturasService: AsignaturaService,
    private tipoAulaService: TipoAulaService,
    private docentesService: DocenteService,
    private horasNoDisponiblesService: HorasNoDisponiblesService,
    private actividadesService: ActividadesService,
    private nivelesService: NivelService,
    private facultadesService: FacultadService,
    private espaciosFisicosService: EspaciosFisicosService,
    private connection: Connection, // Inyecta la conexión de TypeORM para transacciones
  ) {}

  /* ========================================================================================================= */
  /* ======================================= CREAR UN HORARIO =============================================== */
  /* ========================================================================================================= */

  async crearHorario(horario: HorarioDto): Promise<HorarioEntity> {
    try {
      const usuario = await this.usuarioService.obtenerUsuarioCompletoPorSuID(
        horario.idUsuario,
      );
      if (!usuario) {
        throw new NotFoundException('Usuario no encontrado.');
      }

      const nuevoHorario = this.repositorioHorario.create({
        descripcion: horario.descripcion,
        horarioJson: horario.horarioJson,
        usuario: usuario,
      });

      const horarioGuardado = await this.repositorioHorario.save(nuevoHorario);
      Logger.log(`Horario creado con ID ${horarioGuardado.id}`, 'CREAR_HORARIO');
      return horarioGuardado;
    } catch (error) {
      if (error.code === '23505') { // Código de violación de índice único en PostgreSQL
        Logger.error(
          `La descripción del horario ya está registrada.`,
          'HORARIO_YA_REGISTRADO',
        );
        throw new BadRequestException({
          code: 'HORARIO_YA_REGISTRADO',
          message: 'La descripción del horario ya está registrada.',
        });
      }
      if (error instanceof NotFoundException) {
        throw error;
      }
      Logger.error(
        `Error al crear el horario: ${error.message}`,
        'ERROR_CREAR_HORARIO',
      );
      throw new BadGatewayException('Error al crear el horario.');
    }
  }

  /* ========================================================================================================= */
  /* ======================================= OBTENER TODOS LOS HORARIOS  ===================================== */
  /* ========================================================================================================= */

  async actualizarHorarioPorID(
    idHorario: string,
    horarioDto: HorarioDto,
  ): Promise<HorarioEntity> {
    try {
      const horarioExistente = await this.obtenerHorarioPorID(idHorario);
      if (!horarioExistente) {
        throw new NotFoundException(`No existe el horario con ID: ${idHorario}`);
      }

      const usuario = await this.usuarioService.obtenerUsuarioCompletoPorSuID(
        horarioDto.idUsuario,
      );
      if (!usuario) {
        throw new NotFoundException('Usuario no encontrado.');
      }

      // Actualizar los campos necesarios
      horarioExistente.descripcion = horarioDto.descripcion;
      horarioExistente.horarioJson = horarioDto.horarioJson;
      horarioExistente.usuario = usuario;

      // Usar save para manejar Optimistic Locking
      const horarioActualizado = await this.repositorioHorario.save(horarioExistente);

      Logger.log(
        `Horario con ID ${idHorario} actualizado exitosamente.`,
        'ACTUALIZAR_HORARIO',
      );

      return horarioActualizado;
    } catch (error) {
      if (error.code === '23505') { // Violación de índice único
        Logger.error(
          `La descripción del horario ya está registrada.`,
          'HORARIO_YA_REGISTRADO',
        );
        throw new BadRequestException({
          code: 'HORARIO_YA_REGISTRADO',
          message: 'La descripción del horario ya está registrada.',
        });
      }
      if (error instanceof NotFoundException) {
        throw error;
      }
      Logger.error(
        `Error al actualizar el horario: ${error.message}`,
        'ERROR_ACTUALIZAR_HORARIO',
      );
      throw new BadGatewayException('Error al actualizar el horario.');
    }
  }

  /* ========================================================================================================= */
  /* ======================================= OBTENER TODOS LOS HORARIOS ======================================= */
  /* ========================================================================================================= */

  async obtenerHorarios(): Promise<HorarioEntity[]> {
    try {
      Logger.log('Obteniendo todos los horarios', 'OBTENER_HORARIOS');
      return await this.repositorioHorario.find({
        relations: ['usuario'],
        select: ['id', 'fechaCreacion', 'descripcion', 'usuario'],
      });
    } catch (error) {
      Logger.error(
        `Error al obtener los horarios: ${error.message}`,
        'ERROR_OBTENER_HORARIOS',
      );
      throw new BadGatewayException('Error al obtener los horarios.');
    }
  }

  /* ================================================================================================= */
  /* ======================================= OBTENER UN HORARIO  ===================================== */
  /* ================================================================================================= */

  async obtenerHorarioPorID(idHorario: string): Promise<HorarioEntity> {
    try {
      Logger.log(`Obteniendo horario con ID ${idHorario}`, 'OBTENER_HORARIO_POR_ID');
      const horario = await this.repositorioHorario.findOne({
        where: { id: idHorario },
        select: ['id', 'horarioJson'],
      });
      if (horario) {
        return horario;
      } else {
        throw new NotFoundException(`No existe el horario con ID ${idHorario}`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      Logger.error(
        `Error al obtener el horario por ID: ${error.message}`,
        'ERROR_OBTENER_HORARIO_POR_ID',
      );
      throw new BadGatewayException('Error al obtener el horario.');
    }
  }

  /* ===================================================================================================== */
  /* ======================================= OBTENER HORARIO DOCENTE ===================================== */
  /* ===================================================================================================== */

  async obtenerHorarioDocente(nombreDocente: string, idHorario: string): Promise<any[]> {
    try {
      Logger.log(`Obteniendo horario para el docente ${nombreDocente}`, 'OBTENER_HORARIO_DOCENTE');
      // Buscar horario
      const horario = await this.obtenerHorarioPorID(idHorario);
      if (!horario) {
        throw new NotFoundException(`No existe el horario con ID ${idHorario}`);
      }

      // Arreglo de respuesta
      const horarioFiltrado = [];

      // Transformador de texto a JSON
      const arreglo = JSON.parse(horario.horarioJson.toString());
      const subgrupos = arreglo.Students_Timetable.Subgroup;

      // Revisión por cada subgrupo
      for (const sub of subgrupos) {
        const dias = sub.Day;
        // Revisión por cada día
        for (const dia of dias) {
          const horas = dia.Hour;
          // Revisión por cada hora
          for (const hora of horas) {
            // Comprueba que exista horario en la hora iterada
            if (hora.Teacher) {
              // Si el profesor se llama igual al enviado
              if (hora.Teacher['-name'].toUpperCase() === nombreDocente.toUpperCase()) {
                // Si se vinculó un espacio físico se añade este
                horarioFiltrado.push({
                  asignatura: hora.Subject['-name'].toUpperCase(),
                  aula: hora.Room ? hora.Room['-name'].toUpperCase() : '',
                  grupo: sub['-name'].toUpperCase(),
                  tipoAula: hora.Activity_Tag['-name'],
                  dia: dia['-name'].toUpperCase(),
                  horario: hora['-name'].replace(/ /g, ''),
                });
              }
            }
          }
        }
      }

      return horarioFiltrado;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      Logger.error(
        `Error al obtener el horario del docente: ${error.message}`,
        'ERROR_OBTENER_HORARIO_DOCENTE',
      );
      throw new BadGatewayException('Error al obtener el horario del docente.');
    }
  }

  /* ========================================================================================================= */
  /* ======================================= OBTENER HORARIO GRUPO ========================================= */
  /* ========================================================================================================= */

  async obtenerHorarioGrupo(grupo: string, idHorario: string): Promise<any[]> {
    try {
      Logger.log(`Obteniendo horario para el grupo ${grupo}`, 'OBTENER_HORARIO_GRUPO');
      // Buscar horario
      const horario = await this.obtenerHorarioPorID(idHorario);
      if (!horario) {
        throw new NotFoundException(`No existe el horario con ID ${idHorario}`);
      }

      // Arreglo de respuesta
      const horarioFiltrado = [];

      // Transformador de texto a JSON
      const arreglo = JSON.parse(horario.horarioJson.toString());
      const subgrupos = arreglo.Students_Timetable.Subgroup;

      // Revisión por cada subgrupo
      for (const sub of subgrupos) {
        if (sub['-name'].split(' ', 1)[0].toUpperCase() === grupo.toUpperCase()) {
          const dias = sub.Day;
          // Revisión por cada día
          for (const dia of dias) {
            const horas = dia.Hour;
            // Revisión por cada hora
            for (const hora of horas) {
              // Comprueba que exista horario en la hora iterada
              if (hora.Teacher) {
                horarioFiltrado.push({
                  docente: hora.Teacher['-name'].toUpperCase(),
                  asignatura: hora.Subject['-name'].toUpperCase(),
                  tipoAula: hora.Activity_Tag['-name'],
                  dia: dia['-name'].toUpperCase(),
                  horario: hora['-name'].replace(/ /g, ''),
                  aula: hora.Room ? hora.Room['-name'].toUpperCase() : '',
                });
              }
            }
          }
        }
      }

      return horarioFiltrado;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      Logger.error(
        `Error al obtener el horario del grupo: ${error.message}`,
        'ERROR_OBTENER_HORARIO_GRUPO',
      );
      throw new BadGatewayException('Error al obtener el horario del grupo.');
    }
  }

  /* ========================================================================================================= */
  /* ======================================= OBTENER HORARIO AULA =========================================== */
  /* ========================================================================================================= */

  async obtenerHorarioAula(nombreAula: string, idHorario: string): Promise<any[]> {
    try {
      Logger.log(`Obteniendo horario para el aula ${nombreAula}`, 'OBTENER_HORARIO_AULA');
      // Buscar horario
      const horario = await this.obtenerHorarioPorID(idHorario);
      if (!horario) {
        throw new NotFoundException(`No existe el horario con ID ${idHorario}`);
      }

      // Arreglo de respuesta
      const horarioFiltrado = [];

      // Transformador de texto a JSON
      const arreglo = JSON.parse(horario.horarioJson.toString());
      const subgrupos = arreglo.Students_Timetable.Subgroup;

      // Revisión por cada subgrupo
      for (const sub of subgrupos) {
        const dias = sub.Day;
        // Revisión por cada día
        for (const dia of dias) {
          const horas = dia.Hour;
          // Revisión por cada hora
          for (const hora of horas) {
            // Comprueba que exista horario en la hora iterada
            if (hora.Room) {
              // Si el aula se llama igual al enviado
              if (hora.Room['-name'].toUpperCase() === nombreAula.toUpperCase()) {
                horarioFiltrado.push({
                  docente: hora.Teacher ? hora.Teacher['-name'].toUpperCase() : '',
                  asignatura: hora.Subject['-name'].toUpperCase(),
                  grupo: sub['-name'].toUpperCase(),
                  tipoAula: hora.Activity_Tag['-name'],
                  dia: dia['-name'].toUpperCase(),
                  horario: hora['-name'].replace(/ /g, ''),
                });
              }
            }
          }
        }
      }

      Logger.log(`Horario filtrado para el aula ${nombreAula}: ${JSON.stringify(horarioFiltrado)}`, 'HORARIO_AULA_FILTRADO');
      return horarioFiltrado;
    } catch (error) {
      Logger.error(
        `Error al obtener el horario del aula: ${error.message}`,
        'ERROR_OBTENER_HORARIO_AULA',
      );
      throw new BadGatewayException('Error al obtener el horario del aula.');
    }
  }

  /* ========================================================================================================= */
  /* ======================================= GENERAR HORARIO ================================================ */
  /* ========================================================================================================= */

  async generarHorario(email: string): Promise<any> {
    try {
      Logger.log(`Generando horario para el email ${email}`, 'GENERAR_HORARIO');
      const usuario = await this.usuarioService.obtenerUsuarioPorSuCorreo(email);
      if (!usuario) {
        throw new NotFoundException('Usuario no encontrado.');
      }

      // Jornadas
      const semestreEnCurso = await this.semestreService.obtenerSemestreConPlanificacionEnProgreso();
      const diasLaborables = await this.jornadaLaboralService.obtenerJornadaLaboralPorSemestre(
        semestreEnCurso.id,
      );
      const intervalos = await this.jornadaLaboralService.obtenerIntervalos(
        diasLaborables[0].id,
      );

      const soloHoras = intervalos.map((intervalo) => {
        return {
          Name: `${
            parseInt(intervalo[0]) < 10 ? '0' + intervalo[0] : intervalo[0]
          }-${parseInt(intervalo[1]) < 10 ? '0' + intervalo[1] : intervalo[1]}`,
        };
      });

      const soloDias = diasLaborables.map((jornada) => {
        return {
          Name: jornada.dia
            .toLowerCase()
            .replace(/^./, jornada.dia[0].toUpperCase()),
        };
      });

      // Asignaturas
      const asignaturas = await this.asignaturasService.obtenerAsignatura();
      const soloNombreCodigosAsignaturas = asignaturas.map((asignatura) => {
        return {
          Name: `${asignatura.nombre} (${asignatura.codigo})`,
          Comments: '',
        };
      });

      // Tipo Aulas
      const tipoAulas = await this.tipoAulaService.obtenerTipoAulas();
      const soloTiposAulas = tipoAulas.map((tipo) => {
        return {
          Name: `${tipo.tipo}`,
          Printable: 'true',
          Comments: `${tipo.facultad.nombre}`,
        };
      });

      // Docentes
      const docentes = await this.docentesService.obtenerDocentes();
      const informacionCompletaDocentes = [];

      for (const docente of docentes) {
        const docentesMap = new Map();

        const asignaturasDocente = await this.actividadesService.obtenerAsignaturasPorDocente(docente.id);

        asignaturasDocente.forEach((asignatura) => {
          docentesMap.set(
            `${asignatura.nombre} (${asignatura.codigo})`,
            `${asignatura.nombre} (${asignatura.codigo})`,
          );
        });

        const infoDocente = {
          Name: docente.nombreCompleto,
          Target_Number_of_Hours: 10,
          Qualified_Subjects: {
            Qualified_Subject: Array.from(docentesMap.values()),
          },
          Comments: '',
        };
        informacionCompletaDocentes.push(infoDocente);
      }

      // Niveles y grupos - Years
      const niveles = await this.nivelesService.obtenerTodosLosNivelesYGrupos();
      const nivelesYGrupos = niveles.map((nivel) => {
        return {
          Name: nivel.nombre,
          Number_of_Students: nivel.numeroEstudiantes,
          Comments: nivel.carrera.nombre,
          Separator: ' ',
          Group: nivel.grupos.map((grupo) => {
            return {
              Name: grupo.nombre,
              Number_of_Students: grupo.numeroEstudiantes,
              Comments: '',
            };
          }),
        };
      });

      // Actividades
      const actividades = await this.actividadesService.obtenerActividades();
      const actividadesInfoCompleta = actividades.map((actividad) => {
        return {
          Teacher: actividad.docente.nombreCompleto,
          Subject: `${actividad.asignatura.nombre} (${actividad.asignatura.codigo})`,
          Activity_Tag: actividad.tipoAula.tipo,
          Students: actividad.grupo.nombre,
          Duration: actividad.duracion,
          Total_Duration: actividad.duracion,
          Id: actividad.id,
          Activity_Group_Id: 0,
          Number_Of_Students: actividad.numeroEstudiantes,
          Active: actividad.estado,
          Comments: '',
        };
      });

      // Facultades
      const facultades = await this.facultadesService.obtenerFacultades();
      const facultadesInfo = facultades.map((facultad) => {
        return {
          Name: facultad.nombre,
          Comments: '',
        };
      });

      // Espacios
      const espaciosFisicos = await this.espaciosFisicosService.obtenerEspaciosFisicos();
      const espaciosInfo = espaciosFisicos.map((espacio) => {
        return {
          Name: espacio.nombre,
          Building: espacio.tipo.facultad.nombre,
          Capacity: espacio.aforo,
          Virtual: false,
          Comments: espacio.tipo.tipo,
        };
      });

      // Restricciones de tiempo
      const restriccionesInfo = await this.actividadesService.obtenerConstraintActivityPreferredStartingTime();
      Logger.log(`Restricciones de tiempo: ${JSON.stringify(restriccionesInfo)}`, 'RESTRICCIONES_TIEMPO');

      // Restricciones de espacio
      const restriccionesEspacio = await this.actividadesService.obtenerConstraintActivityPreferredRoom();

      // Restricciones de horarios no disponibles
      const restriccionesHorariosNoDisponibles = await this.horasNoDisponiblesService.getEtiquetasHorarios();

      // Builders
      const builderHorasNoDisponibles = new XMLBuilder({
        arrayNodeName: 'ConstraintTeacherNotAvailableTimes',
        format: true,
      });

      const builderDias = new XMLBuilder({
        arrayNodeName: 'Day',
        format: true,
      });

      const buildersHoras = new XMLBuilder({
        arrayNodeName: 'Hour',
        format: true,
      });

      const buildersAsignaturas = new XMLBuilder({
        arrayNodeName: 'Subject',
        format: true,
      });

      const builderTipoAulas = new XMLBuilder({
        arrayNodeName: 'Activity_Tag',
        format: true,
      });

      const builderInfoDocentes = new XMLBuilder({
        arrayNodeName: 'Teacher',
        format: true,
      });

      const builderInfoGruposYNiveles = new XMLBuilder({
        arrayNodeName: 'Year',
        format: true,
      });

      const builderActividades = new XMLBuilder({
        arrayNodeName: 'Activity',
        format: true,
      });

      const builderFacultades = new XMLBuilder({
        arrayNodeName: 'Building',
        format: true,
      });

      const builderEspacios = new XMLBuilder({
        arrayNodeName: 'Room',
        format: true,
      });

      // Builder restricciones
      const builderRestricciones = new XMLBuilder({
        arrayNodeName: 'ConstraintActivityPreferredStartingTime',
        format: true,
      });
      Logger.log(`Restricciones de tiempo en formato XML: ${builderRestricciones.build(restriccionesInfo)}`, 'RESTRICCIONES_TIEMPO_XML');

      const builderRestriccionesEspacio = new XMLBuilder({
        arrayNodeName: 'ConstraintActivityPreferredRoom',
        format: true,
      });

      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<fet version="6.1.5">
  <Institution_Name>${nombreUniversidad}</Institution_Name>
  <Comments>${nombreFacultad}</Comments>
  <Days_List>
    <Number_of_Days>${diasLaborables.length}</Number_of_Days>
    ${builderDias.build(soloDias)}
  </Days_List>
  <Hours_List>
    <Number_of_Hours>${intervalos.length}</Number_of_Hours>
    ${buildersHoras.build(soloHoras)}
  </Hours_List>
  <Subjects_List>
    ${buildersAsignaturas.build(soloNombreCodigosAsignaturas)}
  </Subjects_List>
  <Activity_Tags_List>
    ${builderTipoAulas.build(soloTiposAulas)}
  </Activity_Tags_List>
  <Teachers_List>
    ${builderInfoDocentes.build(informacionCompletaDocentes)}
  </Teachers_List>
  <Students_List>
    ${builderInfoGruposYNiveles.build(nivelesYGrupos)}
  </Students_List>
  <Activities_List>
    ${builderActividades.build(actividadesInfoCompleta)}
  </Activities_List>
  <Buildings_List>
    ${builderFacultades.build(facultadesInfo)}
  </Buildings_List>
  <Rooms_List>
    ${builderEspacios.build(espaciosInfo)}
  </Rooms_List>
  <Time_Constraints_List>
    <ConstraintBasicCompulsoryTime>
      <Weight_Percentage>100</Weight_Percentage>
      <Active>true</Active>
      <Comments></Comments>
    </ConstraintBasicCompulsoryTime>
    <ConstraintBreakTimes>
      <Weight_Percentage>100</Weight_Percentage>
      <Number_of_Break_Times>2</Number_of_Break_Times>
      <Break_Time>
        <Day>Jueves</Day>
        <Hour>11:00-12:00</Hour>
      </Break_Time>
      <Break_Time>
        <Day>Jueves</Day>
        <Hour>12:00-13:00</Hour>
      </Break_Time>
      <Active>true</Active>
      <Comments></Comments>
    </ConstraintBreakTimes>
    ${builderRestricciones.build(restriccionesInfo)}
    ${builderHorasNoDisponibles.build(restriccionesHorariosNoDisponibles)}
  </Time_Constraints_List>
  <Space_Constraints_List>
    <ConstraintBasicCompulsorySpace>
      <Weight_Percentage>100</Weight_Percentage>
      <Active>true</Active>
      <Comments></Comments>
    </ConstraintBasicCompulsorySpace>
    ${builderRestriccionesEspacio.build(restriccionesEspacio)}
  </Space_Constraints_List>
</fet>
`;

      // Escribir el archivo XML
      fs.writeFile('./fet/output.fet', xmlContent, async (err) => {
        if (err) {
          Logger.error(`Error al escribir el archivo XML: ${err.message}`, 'ERROR_ESCRIBIR_XML');
          throw new BadGatewayException('Error al generar el archivo XML.');
        }

        Logger.log(`Archivo XML creado exitosamente para el usuario ${usuario.id}`, 'ESCRIBIR_XML');

        // Ejecutar comandos externos
        exec('cp ./fet/output.fet $HOME/Documents/spa/output.fet', (err) => {
          if (err) {
            Logger.error(`Error al copiar el archivo XML: ${err.message}`, 'ERROR_CP_XML');
            throw new BadGatewayException('Error al copiar el archivo XML.');
          }

          exec(
            'fet-cl --inputfile=output.fet',
            {
              cwd: `/home/nobh/Documents/spa`,
            },
            (err) => {
              if (err) {
                Logger.error(`Error al ejecutar fet-cl: ${err.message}`, 'ERROR_FET_CL');
                throw new BadGatewayException('Error al ejecutar fet-cl.');
              }

              exec(
                'cp -r ./output $HOME/Documents/spa/planificacion-academica-fis-backend/fet',
                {
                  cwd: `/home/nobh/Documents/spa/timetables`,
                },
                async (err) => {
                  if (err) {
                    Logger.error(`Error al copiar la salida de fet: ${err.message}`, 'ERROR_CP_SALIDA_FET');
                    throw new BadGatewayException('Error al copiar la salida de fet.');
                  }

                  try {
                    const data = fs.readFileSync(
                      './fet/output/output_subgroups.xml',
                      { encoding: 'utf8', flag: 'r' },
                    );

                    const jsonData = xml2js(data, {
                      compact: true,
                      nameKey: '-name',
                      alwaysArray: false,
                      ignoreDoctype: true,
                      alwaysChildren: false,
                      attributesKey: '-name',
                      attributeValueFn(attributeValue) {
                        return attributeValue;
                      },
                    });

                    // Formatear el JSON
                    const format = {};
                    let formatSubgrups = [];

                    formatSubgrups = jsonData['Students_Timetable']['Subgroup'].map((sub) => {
                      const subgroup = {
                        '-name': sub['-name'].name,
                        Day: sub['Day'].map((d) => {
                          const day = {
                            '-name': d['-name']['name'],
                            Hour: d['Hour'].map((h) => {
                              const keysHora = Object.keys(h);
                              if (!keysHora.includes('Activity')) {
                                return { '-name': h['-name']['name'] };
                              } else {
                                return {
                                  '-name': h['-name']['name'],
                                  Activity: {
                                    '-id': h['Activity']['-name']['id'],
                                  },
                                  Teacher: {
                                    '-name': h['Teacher']['-name']['name'],
                                  },
                                  Subject: {
                                    '-name': h['Subject']['-name']['name'],
                                  },
                                  Activity_Tag: h['Activity_Tag']['-name']['name'],
                                  Room: {
                                    '-name': h['Room']
                                      ? h['Room']['-name']['name']
                                      : '',
                                  },
                                };
                              }
                            }),
                          };
                          return day;
                        }),
                      };
                      return subgroup;
                    });

                    // Primer nodo
                    format['Students_Timetable'] = {
                      Subgroup: formatSubgrups,
                    };

                    const jsonDataFormat = JSON.stringify(format);

                    // Guardar el horario en la base de datos
                    await this.repositorioHorario.save({
                      descripcion: 'Horario por subgrupos',
                      fechaCreacion: new Date(),
                      horarioJson: jsonDataFormat,
                      usuario: usuario,
                    });

                    Logger.log(`Horario guardado exitosamente para el usuario ${usuario.id}`, 'GUARDAR_HORARIO');

                  } catch (error) {
                    Logger.error(
                      `Error al procesar el archivo XML: ${error.message}`,
                      'ERROR_PROCESAR_XML',
                    );
                    throw new BadGatewayException('Error al procesar el archivo XML.');
                  }
                },
              );
            },
          );
        });
      });

      return {
        mensaje: 'Horario en proceso de generación.',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      Logger.error(
        `Error al generar el horario: ${error.message}`,
        'ERROR_GENERAR_HORARIO',
      );
      throw new BadGatewayException('Error al generar el horario.');
    }
  }

  /* ========================================================================================================= */
  /* ======================================= PROCESAR PLANIFICACION ========================================= */
  /* ========================================================================================================= */

  async procesarPlanificacion(contenido: string, email: string): Promise<any> {
    try {
      Logger.log(`Procesando planificación para el email ${email}`, 'PROCESAR_PLANIFICACION');
      const usuario = await this.usuarioService.obtenerUsuarioPorSuCorreo(email);
      if (!usuario) {
        throw new NotFoundException('Usuario no encontrado.');
      }

      fs.writeFile('./fet/output.fet', contenido, async (err) => {
        if (err) {
          Logger.error(`Error al escribir el archivo XML: ${err.message}`, 'ERROR_ESCRIBIR_XML');
          throw new BadGatewayException('Error al generar el archivo XML.');
        }

        Logger.log(`Archivo XML creado exitosamente para el usuario ${usuario.id}`, 'ESCRIBIR_XML');

        // Ejecutar comandos externos
        exec('cp ./fet/output.fet $HOME/Documents/spa/output.fet', (err) => {
          if (err) {
            Logger.error(`Error al copiar el archivo XML: ${err.message}`, 'ERROR_CP_XML');
            throw new BadGatewayException('Error al copiar el archivo XML.');
          }

          exec(
            'fet-cl --inputfile=output.fet',
            {
              cwd: `/home/nobh/Documents/spa`,
            },
            (err) => {
              if (err) {
                Logger.error(`Error al ejecutar fet-cl: ${err.message}`, 'ERROR_FET_CL');
                throw new BadGatewayException('Error al ejecutar fet-cl.');
              }

              exec(
                'cp -r ./output $HOME/Documents/spa/planificacion-academica-fis-backend/fet',
                {
                  cwd: `/home/nobh/Documents/spa/timetables`,
                },
                async (err) => {
                  if (err) {
                    Logger.error(`Error al copiar la salida de fet: ${err.message}`, 'ERROR_CP_SALIDA_FET');
                    throw new BadGatewayException('Error al copiar la salida de fet.');
                  }

                  try {
                    const data = fs.readFileSync(
                      './fet/output/output_subgroups.xml',
                      { encoding: 'utf8', flag: 'r' },
                    );

                    const jsonData = xml2js(data, {
                      compact: true,
                      nameKey: '-name',
                      alwaysArray: false,
                      ignoreDoctype: true,
                      alwaysChildren: false,
                      attributesKey: '-name',
                      attributeValueFn(attributeValue) {
                        return attributeValue;
                      },
                    });

                    // Formatear el JSON
                    const format = {};
                    let formatSubgrups = [];

                    formatSubgrups = jsonData['Students_Timetable']['Subgroup'].map((sub) => {
                      const subgroup = {
                        '-name': sub['-name'].name,
                        Day: sub['Day'].map((d) => {
                          const day = {
                            '-name': d['-name']['name'],
                            Hour: d['Hour'].map((h) => {
                              const keysHora = Object.keys(h);
                              if (!keysHora.includes('Activity')) {
                                return { '-name': h['-name']['name'] };
                              } else {
                                if (
                                  !keysHora.includes('Teacher') &&
                                  !keysHora.includes('Room')
                                ) {
                                  return {
                                    '-name': h['-name']['name'],
                                    Activity: {
                                      '-id': h['Activity']['-name']['id'],
                                    },
                                    Subject: {
                                      '-name': h['Subject']['-name']['name'],
                                    },
                                    Activity_Tag: h['Activity_Tag']['-name']['name'],
                                  };
                                }

                                return {
                                  '-name': h['-name']['name'],
                                  Activity: {
                                    '-id': h['Activity']['-name']['id'],
                                  },
                                  Teacher: {
                                    '-name': h['Teacher']['-name']['name'],
                                  },
                                  Subject: {
                                    '-name': h['Subject']['-name']['name'],
                                  },
                                  Activity_Tag: h['Activity_Tag']['-name']['name'],
                                  Room: {
                                    '-name': h['Room']
                                      ? h['Room']['-name']['name']
                                      : '',
                                  },
                                };
                              }
                            }),
                          };
                          return day;
                        }),
                      };
                      return subgroup;
                    });

                    // Primer nodo
                    format['Students_Timetable'] = {
                      Subgroup: formatSubgrups,
                    };

                    const jsonDataFormat = JSON.stringify(format);

                    // Guardar el horario en la base de datos
                    await this.repositorioHorario.save({
                      descripcion: 'Horario por subgrupos',
                      fechaCreacion: new Date(),
                      horarioJson: jsonDataFormat,
                      usuario: usuario,
                    });

                    Logger.log(`Horario guardado exitosamente para el usuario ${usuario.id}`, 'GUARDAR_HORARIO');
                  } catch (error) {
                    Logger.error(
                      `Error al procesar el archivo XML: ${error.message}`,
                      'ERROR_PROCESAR_XML',
                    );
                    throw new BadGatewayException('Error al procesar el archivo XML.');
                  }
                },
              );
            },
          );
        });
      });

      return {
        mensaje: 'Planificación en proceso de generación.',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      Logger.error(
        `Error al procesar la planificación: ${error.message}`,
        'ERROR_PROCESAR_PLANIFICACION',
      );
      throw new BadGatewayException('Error al procesar la planificación.');
    }
  }

  /* ========================================================================================================= */
  /* ======================================= GENERAR HORARIO XML ============================================ */
  /* ========================================================================================================= */

  async generarHorarioXML(contenido: string): Promise<string> {
    try {
      Logger.log('Generando archivo XML para el horario', 'GENERAR_HORARIO_XML');
      fs.writeFile('./fet/output.fet', contenido, (err) => {
        if (err) {
          Logger.error(`Error al escribir el archivo XML: ${err.message}`, 'ERROR_ESCRIBIR_XML');
          throw new BadGatewayException('Error al generar el archivo XML.');
        }

        Logger.log(`Archivo XML creado exitosamente`, 'ESCRIBIR_XML');

        // Ejecutar comandos externos
        exec('cp ./fet/output.fet $HOME/Documents/spa/output.fet', (err) => {
          if (err) {
            Logger.error(`Error al copiar el archivo XML: ${err.message}`, 'ERROR_CP_XML');
            throw new BadGatewayException('Error al copiar el archivo XML.');
          }

          exec(
            'fet-cl --inputfile=output.fet',
            {
              cwd: `/home/nobh/Documents/spa`,
            },
            (err) => {
              if (err) {
                Logger.error(`Error al ejecutar fet-cl: ${err.message}`, 'ERROR_FET_CL');
                throw new BadGatewayException('Error al ejecutar fet-cl.');
              }

              exec(
                'cp -r ./output $HOME/Documents/spa/planificacion-academica-fis-backend/fet',
                {
                  cwd: `/home/nobh/Documents/spa/timetables`,
                },
                async (err) => {
                  if (err) {
                    Logger.error(`Error al copiar la salida de fet: ${err.message}`, 'ERROR_CP_SALIDA_FET');
                    throw new BadGatewayException('Error al copiar la salida de fet.');
                  }

                  try {
                    const data = fs.readFileSync(
                      './fet/output/output_subgroups.xml',
                      { encoding: 'utf8', flag: 'r' },
                    );

                    return data;
                  } catch (error) {
                    Logger.error(
                      `Error al leer el archivo XML generado: ${error.message}`,
                      'ERROR_LEER_XML_GENERADO',
                    );
                    throw new BadGatewayException('Error al leer el archivo XML generado.');
                  }
                },
              );
            },
          );
        });
      });

      return 'Horario en proceso de generación.';
    } catch (error) {
      Logger.error(
        `Error al generar el archivo XML: ${error.message}`,
        'ERROR_GENERAR_HORARIO_XML',
      );
      throw new BadGatewayException('Error al generar el archivo XML.');
    }
  }

  /* ========================================================================================================= */
  /* ======================================= METODOS ADICIONALES ============================================ */
  /* ========================================================================================================= */

  async Format() {
    const obj = {};
    obj['Students_Timetable'];
  }
}
