import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { HorarioDTO } from 'src/parametros-iniciales/dtos/horario.dto';
import { HorarioService } from 'src/parametros-iniciales/services/horario/horario.service';

@Controller('horario')
export class HorarioController {

    constructor(
        private _horarioService : HorarioService

    ){
    }

    @Post('/registrarHorario')
    async registrarHorario(@Body() horario: HorarioDTO){
        await this._horarioService.registrarHorario(horario);
    }

    @Get('calcularHorasLaborablesDeUnDia/:dia')
    async calcularHorasLaborablesDeUnDiaLaboral(@Param('dia') dia: string){
        return await this._horarioService.calcularHorasLaborablesDeUnDia(dia);
    }
}
