import { HttpException, Injectable } from '@nestjs/common';
import {
  CreateExamControllerDto,
  CreateExamControllerSuperDto,
} from './dto/create-exam-controller.dto';
import { UpdateExamControllerDto } from './dto/update-exam-controller.dto';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import {
  ExamController,
  ExamControllerDocument,
} from '../schemas/exam-controller.schema';
import { LoginExamControllerDto } from './dto/exam-controller-login.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import {
  Notification,
  NotificationDocument,
} from '../schemas/notification.schema';

@Injectable()
export class ExamControllerService {
  constructor(
    @InjectModel(ExamController.name)
    private examControllerModel: Model<ExamControllerDocument>,
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    private jwtService: JwtService,
  ) {}

  async create(createExamControllerDto: CreateExamControllerDto) {
    try {
      const examControllerData = await this.examControllerModel.findOne({
        username: createExamControllerDto.username,
      });
      if (examControllerData) {
        throw new HttpException(
          {
            message: 'Username already exists',
          },
          400,
        );
      }

      const pass_hash = await bcrypt.hash(createExamControllerDto.password, 10);
      createExamControllerDto.password = pass_hash;

      const createdController = new this.examControllerModel(
        createExamControllerDto,
      );
      createdController.save();
      return {
        message: 'ExamController created successfully',
        data: {
          name: createdController.name,
        },
      };
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else {
        throw new HttpException(err.message, 400);
      }
    }
  }

  async createSuper(createExamControllerDto: CreateExamControllerSuperDto) {
    try {
      const examControllerData = await this.examControllerModel.findOne({
        username: createExamControllerDto.username,
      });
      if (examControllerData) {
        throw new HttpException(
          {
            message: 'Username already exists',
          },
          400,
        );
      }

      const pass_hash = await bcrypt.hash(createExamControllerDto.password, 10);
      createExamControllerDto.password = pass_hash;

      const createdController = new this.examControllerModel(
        createExamControllerDto,
      );
      createdController.save();
      return {
        message: 'ExamController created successfully',
        data: {
          name: createdController.name,
        },
      };
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else {
        throw new HttpException(err.message, 400);
      }
    }
  }

  async login(examController: LoginExamControllerDto) {
    try {
      const examControllerData = await this.examControllerModel.findOne({
        username: examController.username,
      });
      if (examControllerData) {
        const match = await bcrypt.compare(
          examController.password,
          examControllerData.password,
        );
        if (match) {
          const payload = {
            id: examControllerData._id,
            username: examControllerData.username,
            name: examControllerData.name,
            role: 'exam-controller',
          };
          return {
            message: 'Login successful',
            token: await this.jwtService.signAsync(payload),
            role: examControllerData.role,
          };
        } else {
          throw new HttpException(
            {
              message: 'Wrong password',
            },
            401,
          );
        }
      } else {
        throw new HttpException(
          {
            message: 'User not found',
          },
          404,
        );
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else {
        throw new HttpException(err.message, 400);
      }
    }
  }

  async getNotifications() {
    try {
      const notifications = await this.notificationModel
        .find()
        .populate('sender', 'name');
      return {
        message: 'Notifications fetched successfully',
        data: {
          notifications,
        },
      };
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else {
        throw new HttpException(err.message, 400);
      }
    }
  }

  async createNotification(
    notificationData: CreateNotificationDto,
    userId: string,
  ) {
    try {
      const createdNotification = new this.notificationModel({
        ...notificationData,
        sender: userId,
      });
      await createdNotification.save();
      return {
        message: 'Notification created successfully',
        data: {
          createdNotification,
        },
      };
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else {
        throw new HttpException(err.message, 400);
      }
    }
  }

  findAll() {
    return this.examControllerModel.find().select('name username role').exec();
  }

  findOne(id: string) {
    return `This action returns a #${id} examController`;
  }

  update(id: number, updateExamControllerDto: UpdateExamControllerDto) {
    return `This action updates a #${id} examController`;
  }

  async remove(id: string) {
    try {
      if (!id) {
        throw new HttpException('ID is required', 400);
      }
      await this.examControllerModel.deleteOne({ _id: id });
      return {
        message: 'ExamController deleted successfully',
      };
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else {
        throw new HttpException(err.message, 400);
      }
    }
  }

  async changeRole(id: string, role: string) {
    try {
      if (!id) {
        throw new HttpException('ID is required', 400);
      }
      await this.examControllerModel.updateOne({ _id: id }, { role });
      return {
        message: 'Role updated successfully',
      };
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else {
        throw new HttpException(err.message, 400);
      }
    }
  }
}
