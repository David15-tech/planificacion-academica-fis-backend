// test/espacios_fisicos.service.integration.spec.ts
// O en: src/espacios_fisicos/tests/espacios_fisicos.service.integration.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EspaciosFisicosService } from '../src/espacios_fisicos/services/espacios_fisicos.service';
import { EspacioFisicoEntity } from '../src/espacios_fisicos/entities/espacio_fisico.entity';

// Servicios a mockear
import { TipoAulaService } from '../src/parametros-iniciales/services/tipo-aula.service';
import { FacultadService } from '../src/parametros-iniciales/services/facultad.service';

// DTO
import { EspacioFisicoDTO } from '../src/espacios_fisicos/dto/espacio_fisico.dto';
import { BadRequestException } from '@nestjs/common';

// Mock de TipoAulaService
const mockTipoAulaService = {
  obtenerTipoAulaPorId: jest.fn(),
  obtenerTipoAulaPorNombreYFacultad: jest.fn(),
};

// Mock de FacultadService
const mockFacultadService = {
  obtenerFacultadPorSuNombre: jest.fn(),
};

describe('EspaciosFisicosService (Integration)', () => {
  let espaciosFisicosService: EspaciosFisicosService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        // BD en memoria
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [EspacioFisicoEntity],
          synchronize: true,
          keepConnectionAlive: true,
        }),
        TypeOrmModule.forFeature([EspacioFisicoEntity]),
      ],
      providers: [
        EspaciosFisicosService,
        { provide: TipoAulaService, useValue: mockTipoAulaService },
        { provide: FacultadService, useValue: mockFacultadService },
      ],
    }).compile();

    espaciosFisicosService = module.get<EspaciosFisicosService>(
      EspaciosFisicosService,
    );
  });

  afterEach(async () => {
    // Limpia la tabla de espacios físicos tras cada test
    const todos = await espaciosFisicosService.obtenerEspaciosFisicos();
    for (const ef of todos) {
      await espaciosFisicosService.eliminarEspacioFisicoPorId(ef.id);
    }
    // Resetea los mocks
    jest.clearAllMocks();
  });

  it('debe crear un espacio físico cuando no existe previamente', async () => {
    // Configura el mock para que retorne algo como "tipoAula" (no null)
    mockTipoAulaService.obtenerTipoAulaPorId.mockResolvedValue({ id: 'TIPO123' });

    const dto: EspacioFisicoDTO = {
      nombre: 'Aula 101',
      tipo_id: 'TIPO123',
      aforo: 30,
    };

    const result = await espaciosFisicosService.crearEspacioFisico(dto);

    expect(result).toBeDefined();
    expect(result.mensaje).toContain('Se creó el espacio físico Aula 101');

    // Verificamos que sí existe en la BD
    const lista = await espaciosFisicosService.obtenerEspaciosFisicos();
    expect(lista.length).toBe(1);
    expect(lista[0].nombre).toBe('Aula 101');
    expect(lista[0].aforo).toBe(30);
  });

  it('debe lanzar error si ya existe un espacio con ese nombre', async () => {
    // 1) Creamos uno manualmente
    await espaciosFisicosService.crearEspacioFisico({
      nombre: 'Auditorio',
      tipo_id: 'TIPO123',
      aforo: 100,
    });

    // 2) Intentamos crear con el mismo nombre
    await expect(
      espaciosFisicosService.crearEspacioFisico({
        nombre: 'Auditorio',
        tipo_id: 'TIPO123',
        aforo: 150,
      }),
    ).rejects.toThrowError(BadRequestException);
  });

  it('debe listar espacios físicos', async () => {
    // Creamos un par de registros
    await espaciosFisicosService.crearEspacioFisico({
      nombre: 'Laboratorio 1',
      tipo_id: 'TIPO_LAB',
      aforo: 25,
    });
    await espaciosFisicosService.crearEspacioFisico({
      nombre: 'Laboratorio 2',
      tipo_id: 'TIPO_LAB',
      aforo: 25,
    });

    const lista = await espaciosFisicosService.obtenerEspaciosFisicos();
    expect(lista.length).toBe(2);
    expect(lista[0].nombre).toBe('Laboratorio 1');
    expect(lista[1].nombre).toBe('Laboratorio 2');
  });


});
