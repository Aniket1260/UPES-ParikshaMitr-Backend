import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { UfmService } from './ufm.service';
import { TeacherJwtGuard } from '../guards/teacher-jwt.guard';
import { MarkUFMDto } from './dto/mark_ufm.dto';
import { ExamContGuard } from '../guards/cont-guard.guard';

@Controller('ufm')
export class UfmController {
  constructor(private readonly ufmService: UfmService) {}

  @UseGuards(TeacherJwtGuard)
  @Post('mark-ufm')
  markUfm(@Body() body: MarkUFMDto, @Req() req: any) {
    return this.ufmService.markUfm(body, req.user);
  }

  @UseGuards(ExamContGuard)
  @Get('get-ufms')
  getAllUFMs(@Req() req: any) {
    return this.ufmService.getAllUFMs();
  }
}
