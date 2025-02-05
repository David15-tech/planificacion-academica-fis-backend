import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CarreraService } from '../src/carrera/services/carrera.service';
import { CarreraEntity } from '../src/carrera/entities/carrera.entity';
import { CarreraDto } from '../src/carrera/dto/carrera.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CarreraService (Integration)', () => {
  let carreraService: CarreraService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        // Base de datos SQLite en memoria
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [CarreraEntity],
          synchronize: true, // crea tablas en cada test
          keepConnectionAlive: true,
        }),
        TypeOrmModule.forFeature([CarreraEntity]),
      ],
      providers: [CarreraService],
    }).compile();

    carreraService = module.get<CarreraService>(CarreraService);
  });

  afterEach(async () => {
    // Limpia la tabla de carreras
    const carreras = await carreraService.obtenerCarreras();
    for (const c of carreras) {
      await carreraService.eliminarCarreraPorID(c.id);
    }
  });

  it('debe crear una carrera en la base de datos', async () => {
    const dto: CarreraDto = {
      nombre: 'Ingeniería de Sistemas',
      codigo: 'IS-001',
    };

    const result = await carreraService.crearUnaCarrera(dto);

    expect(result).toBeDefined();
    expect(result.mensaje).toBe(
      'Se ha creado exitosamente la carrera de Ingeniería de Sistemas.',
    );

    // Verificamos que exista en la BD
    const carreras = await carreraService.obtenerCarreras();
    expect(carreras.length).toBe(1);
    expect(carreras[0].nombre).toBe('Ingeniería de Sistemas');
  });

  it('debe lanzar error si se intenta crear una carrera con el mismo código', async () => {
    const dto: CarreraDto = {
      nombre: 'Carrera 1',
      codigo: 'ABC-123',
    };

    // Primera creación
    await carreraService.crearUnaCarrera(dto);

    // Segunda creación con el mismo código
    await expect(
      carreraService.crearUnaCarrera(dto),
    ).rejects.toThrowError(BadRequestException);
  });

  it('debe actualizar una carrera existente', async () => {
    // Creamos una carrera
    const carreraCreada = await carreraService.crearUnaCarrera({
      nombre: 'Carrera Inicial',
      codigo: 'COD-INI',
    });

    // Obtenemos el ID desde la BD
    const carreras = await carreraService.obtenerCarreras();
    const carreraId = carreras[0].id;

    // Actualizamos
    const carreraActualizada = await carreraService.actualizarCarreraPorID(
      carreraId,
      {
        nombre: 'Carrera Actualizada',
        codigo: 'COD-ACT',
      },
    );

    expect(carreraActualizada.nombre).toBe('Carrera Actualizada');
    expect(carreraActualizada.codigo).toBe('COD-ACT');
  });

  it('debe lanzar NotFoundException al actualizar una carrera que no existe', async () => {
    await expect(
      carreraService.actualizarCarreraPorID('id-inexistente', {
        nombre: 'Carrera X',
        codigo: 'X-001',
      }),
    ).rejects.toThrowError(NotFoundException);
  });

  it('debe eliminar una carrera existente', async () => {
    // Creamos
    const carreraCreada = await carreraService.crearUnaCarrera({
      nombre: 'Carrera a Eliminar',
      codigo: 'DEL-001',
    });

    // Obtenemos ID
    const carreras = await carreraService.obtenerCarreras();
    const carreraId = carreras[0].id;

    // Eliminamos
    const resultado = await carreraService.eliminarCarreraPorID(carreraId);
    expect(resultado.affected).toBe(1);

    // Verificamos que ya no exista
    const carrerasDespues = await carreraService.obtenerCarreras();
    expect(carrerasDespues.length).toBe(0);
  });

  it('debe lanzar NotFoundException si se intenta eliminar una carrera inexistente', async () => {
    await expect(
      carreraService.eliminarCarreraPorID('id-inexistente'),
    ).rejects.toThrowError(NotFoundException);
  });
});
