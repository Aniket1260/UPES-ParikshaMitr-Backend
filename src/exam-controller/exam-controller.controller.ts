import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Put,
} from '@nestjs/common';
import { ExamControllerService } from './exam-controller.service';
import {
  ChangeRoleDto,
  CreateExamControllerDto,
  CreateExamControllerSuperDto,
} from './dto/create-exam-controller.dto';
import { UpdateExamControllerDto } from './dto/update-exam-controller.dto';
import { LoginExamControllerDto } from './dto/exam-controller-login.dto';
import { ExamContGuard } from '../guards/cont-guard.guard';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Controller('exam-controller')
export class ExamControllerController {
  constructor(private readonly examControllerService: ExamControllerService) {}

  @Post()
  create(@Body() createExamControllerDto: CreateExamControllerDto) {
    return this.examControllerService.create(createExamControllerDto);
  }

  @Post('login')
  login(@Body() loginData: LoginExamControllerDto) {
    return this.examControllerService.login(loginData);
  }

  @UseGuards(ExamContGuard)
  @Get('verifyLogin')
  verifyLogin() {
    return {
      message: 'Login successful',
    };
  }

  @UseGuards(ExamContGuard)
  @Get('get-notifications')
  getNotifications() {
    return this.examControllerService.getNotifications();
  }

  @UseGuards(ExamContGuard)
  @Post('create-notification')
  createNotification(
    @Body() notificationData: CreateNotificationDto,
    @Req() req,
  ) {
    return this.examControllerService.createNotification(
      notificationData,
      req?.user.id,
    );
  }

  @Get()
  findAll() {
    return this.examControllerService.findAll();
  }

  @Get('find/:id')
  findOne(@Param('id') id: string) {
    return this.examControllerService.findOne(id);
  }

  @Patch('update/:id')
  update(
    @Param('id') id: string,
    @Body() updateExamControllerDto: UpdateExamControllerDto,
  ) {
    return this.examControllerService.update(+id, updateExamControllerDto);
  }

  @UseGuards(ExamContGuard)
  @Delete('delete/:id')
  remove(@Param('id') id: string) {
    return this.examControllerService.remove(id);
  }

  @UseGuards(ExamContGuard)
  @Get('')
  findAllExamControllers() {
    return this.examControllerService.findAll();
  }

  @UseGuards(ExamContGuard)
  @Post('create-super')
  createSuper(@Body() createExamControllerDto: CreateExamControllerSuperDto) {
    return this.examControllerService.createSuper(createExamControllerDto);
  }

  @UseGuards(ExamContGuard)
  @Put('change-role/:id')
  changeRole(@Param('id') id: string, @Body() body: ChangeRoleDto) {
    return this.examControllerService.changeRole(id, body.role);
  }
}
