import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AsignaturaService } from '../src/asignatura/services/asignatura.service';
import { AsignaturaEntity } from '../src/asignatura/entities/asignatura.entity';
import { ActividadEntity } from '../src/actividades/entities/actividad.entity';
import { DocenteEntity } from '../src/docente/entities/docente.entity';
import { UsuarioEntity } from '../src/usuarios/entities/usuario.entity';
import { RolUsuarioEntity } from '../src/auth/entities/rol-usuario.entity';
import { RolEntity } from '../src/auth/entities/rol.entity';
import { HorarioEntity } from '../src/horario/entities/horario.entity';
import { HoraNoDisponibleEntity } from '../src/horas_no_disponibles/entities/hora_no_disponible.entity';
import { JornadaLaboralEntity } from '../src/parametros-iniciales/entities/jornada-laboral.entity';
import { SemestreEntity } from '../src/parametros-iniciales/entities/semestre.entity';
import { TipoAulaEntity } from '../src/parametros-iniciales/entities/tipo-aula.entity';
import { FacultadEntity } from '../src/parametros-iniciales/entities/facultad.entity';
import { GrupoEntity } from '../src/niveles/entities/grupo.entity';
import { NivelEntity } from '../src/niveles/entities/nivel.entity';
import { CarreraEntity } from '../src/carrera/entities/carrera.entity';
import { RestriccionActividadEntity } from '../src/actividades/entities/restriccion-actividad.entity';
import { EspacioFisicoEntity } from '../src/espacios_fisicos/entities/espacio_fisico.entity';

describe('AsignaturaService (Integration)', () => {
  let service: AsignaturaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite', // Usamos SQLite en memoria para las pruebas
          database: ':memory:',
          entities: [
            EspacioFisicoEntity,
            RestriccionActividadEntity,
            CarreraEntity,
            NivelEntity,
            GrupoEntity,
            FacultadEntity,
            TipoAulaEntity,
            SemestreEntity,
            AsignaturaEntity,
            ActividadEntity,
            DocenteEntity,
            UsuarioEntity,
            RolUsuarioEntity,
            RolEntity,
            HorarioEntity,
            HoraNoDisponibleEntity,
            JornadaLaboralEntity,
          ],
          synchronize: true, // Sincroniza automáticamente las entidades con la base de datos
          keepConnectionAlive: true,  
        }),
        TypeOrmModule.forFeature([AsignaturaEntity]),
      ],
      providers: [AsignaturaService],
    }).compile();

    service = module.get<AsignaturaService>(AsignaturaService);
  });

  afterEach(async () => {
    // Limpia la base de datos después de cada prueba
    const asignaturas = await service.obtenerAsignatura();
    for (const asignatura of asignaturas) {
      await service.eliminarAsignaturaPorID(asignatura.id);
    }
  });



  
  


  it(
    'debe guardar una asignatura en la base de datos',
    async () => {
      const asignaturaDto = {
        codigo: 'ASG001',
        nombre: 'Matemáticas',
        creditos: 3,
      };

      const result = await service.crearUnaAsignatura(asignaturaDto);

      expect(result.mensaje).toBe(
        'Se creó la asignatura ASG001 - Matemáticas existosamente.',
      );

      const asignaturas = await service.obtenerAsignatura();
      expect(asignaturas.length).toBe(1);
      expect(asignaturas[0].codigo).toBe('ASG001');
    },
    10000, // Tiempo límite para esta prueba (10 segundos)
  );

  it(
    'debe retornar un mensaje si la asignatura ya existe',
    async () => {
      const asignaturaDto = {
        codigo: 'ASG001',
        nombre: 'Matemáticas',
        creditos: 3,
      };

      // Crear la asignatura por primera vez
      await service.crearUnaAsignatura(asignaturaDto);

      // Intentar crearla nuevamente
      const result = await service.crearUnaAsignatura(asignaturaDto);

      expect(result.mensaje).toBe(
        'La asignatura ASG001 - Matemáticas ya se encuentra registrada.',
      );
    },
    10000,
  );


  it(
    'debe manejar concurrencia al crear la misma asignatura varias veces',
    async () => {
      const asignaturaDto = {
        codigo: 'ASG_CONCURRENT',
        nombre: 'Asignatura Concurrente',
        creditos: 3,
      };

      // Creamos un array de promesas que llaman al método de creación simultáneamente
      const promesas = Array(5)
        .fill(null)
        .map(() => service.crearUnaAsignatura(asignaturaDto));

      // Ejecutamos todas las promesas de forma concurrente
      const resultados = await Promise.all(promesas);

      // Consultamos el resultado final en la base de datos
      const asignaturasFinales = await service.obtenerAsignatura();

      console.log('Resultados concurrentes:', resultados);

      // Suponiendo que el 'codigo' es único,
      // esperamos un solo registro en la BD
      expect(asignaturasFinales.length).toBe(1);

      // Opcional: Verificar los mensajes retornados
      const mensajes = resultados.map((r) => r.mensaje);

      // El primer insert debe retornar "Se creó la asignatura..."
      // Los siguientes deben retornar "La asignatura ... ya se encuentra registrada."
      expect(
        mensajes.filter((m) =>
          m.includes('ya se encuentra registrada'),
        ).length,
      ).toBeGreaterThanOrEqual(1);
    },
    30000, // Aumentamos el timeout
  );
});



