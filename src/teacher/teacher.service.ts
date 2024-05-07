import { HttpException, Injectable } from '@nestjs/common';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { Teacher } from '../schemas/teacher.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { TeacherLoginDto } from './dto/teacher-login';
import { JwtService } from '@nestjs/jwt';
import { Schedule } from '../schemas/schedule.schema';
import {
  add,
  differenceInCalendarDays,
  format,
  isBefore,
  isEqual,
  max,
  min,
} from 'date-fns';
import {
  Notification,
  NotificationDocument,
} from '../schemas/notification.schema';

import { Slot } from '../schemas/slot.schema';
// import
// import { Slot } from '../schemas/slot.schema';
import { FlyingSquad } from '../schemas/flying-squad.schema';

@Injectable()
export class TeacherService {
  constructor(
    @InjectModel(Teacher.name) private teacherModel: Model<Teacher>,
    @InjectModel(Schedule.name) private scheduleModel: Model<Schedule>,
    @InjectModel(Slot.name) private slotModel: Model<Slot>,
    @InjectModel(FlyingSquad.name) private flyingsquadModel: Model<FlyingSquad>,
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
    private jwtService: JwtService,
  ) {}

  async create(createTeacherDto: CreateTeacherDto) {
    try {
      const teacher = await this.teacherModel.findOne({
        sap_id: createTeacherDto.sap_id,
      });

      if (teacher) {
        throw new HttpException(
          {
            message: 'Teacher already exists',
          },
          400,
        );
      }

      const pass_hash = await bcrypt.hash(createTeacherDto.password, 10);
      createTeacherDto.password = pass_hash;

      const createdTeacher = new this.teacherModel(createTeacherDto);
      createdTeacher.save();
      return {
        message: 'Teacher created successfully',
        data: {
          sap_id: createdTeacher.sap_id,
          name: createdTeacher.name,
          approved: createdTeacher.approved,
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

  async login(teacher: TeacherLoginDto) {
    try {
      const teacherData = await this.teacherModel.findOne({
        sap_id: teacher.sap_id,
      });

      if (!teacherData) {
        throw new HttpException(
          {
            message: 'Teacher not found',
          },
          404,
        );
      }

      if (!teacherData.approved) {
        throw new HttpException(
          {
            message: 'Teacher not approved',
          },
          401,
        );
      }

      if (teacherData) {
        const match = await bcrypt.compare(
          teacher.password,
          teacherData.password,
        );
        if (match) {
          const payload = {
            id: teacherData._id,
            sap_id: teacherData.sap_id,
            name: teacherData.name,
            role: 'teacher',
          };
          return {
            message: 'Login successful',
            token: await this.jwtService.signAsync(payload),
          };
        } else {
          throw new HttpException(
            {
              message: 'Invalid credentials',
            },
            401,
          );
        }
      } else {
        throw new HttpException(
          {
            message: 'Teacher not found',
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

  async findAll() {
    try {
      const teachers = await this.teacherModel.find().exec();
      const result = teachers.map((teacher) => {
        const x = teacher.toObject();
        delete x.password;
        return x;
      });
      return result;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else {
        throw new HttpException(err.message, 400);
      }
    }
  }

  async findOne(id: string) {
    try {
      const teacher: Teacher = await this.teacherModel.findById(id).exec();
      return {
        message: 'Teacher found',
        data: {
          sap_id: teacher.sap_id,
          name: teacher.name,
          approved: teacher.approved,
          phone: teacher.phone,
          email: teacher.email,
        },
      };
    } catch (err) {
      throw new HttpException(
        {
          message: 'Teacher not found',
        },
        404,
      );
    }
  }

  async update(id: number, updateTeacherDto: UpdateTeacherDto) {
    try {
      const update = await this.teacherModel.findByIdAndUpdate(
        id,
        {
          phone: updateTeacherDto.phone,
          email: updateTeacherDto.email,
        },
        { new: true },
      );

      if (!update) {
        throw new HttpException(
          {
            message: 'Teacher not found',
          },
          404,
        );
      }

      return {
        message: 'Teacher updated successfully',
        data: {
          sap_id: update.sap_id,
          name: update.name,
          phone: update.phone,
          email: update.email,
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

  remove(id: number) {
    return `This action removes a #${id} teacher`;
  }

  async getSchedule(user: any) {
    try {
      const schedule = await this.scheduleModel.find({
        participants: user.id,
      });
      const mindate: Date = min(
          schedule.map((event) => event.event_start_time),
        ),
        maxdate: Date = max(schedule.map((event) => event.event_end_time));

      const returnSchedule = {};
      for (
        let i = mindate;
        differenceInCalendarDays(i, maxdate) <= 0;
        i = add(i, { days: 1 })
      ) {
        const dayObject = [];
        schedule.forEach((event) => {
          if (event.event_start_time.getDate() === i.getDate()) {
            dayObject.push({
              timeSlot:
                event.event_start_time.toLocaleTimeString() +
                ' - ' +
                event.event_end_time.toLocaleTimeString(),
              eventName: event.event_name,
              eventDescription: event.event_description,
              location: event.location,
            });
          }
          if (dayObject.length > 0) {
            returnSchedule[format(i, 'yyyy-MM-dd')] = dayObject;
          }
        });
      }
      return {
        returnSchedule,
      };
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else {
        throw new HttpException(err.message, 400);
      }
    }
  }

  async getTeacherDetails(id: string) {
    try {
      const teacher = await this.teacherModel.findById(id).exec();
      return {
        message: 'Teacher found',
        data: {
          school: teacher.school,
          sap_id: teacher.sap_id,
          name: teacher.name,
          phone: teacher.phone,
          email: teacher.email,
          approved: teacher.approved,
        },
      };
    } catch (err) {
      throw new HttpException(
        {
          message: 'Teacher not found',
        },
        404,
      );
    }
  }

  async getSlotDetails(id: string) {
    try {
      const slots = await this.slotModel.find().exec();
      let invDutiesArray = [];
      let flyingSquadArray = [];
      for (const slot of slots) {
        invDutiesArray = [...invDutiesArray, ...slot.inv_duties];
        const flyingSquadIds = await Promise.all(
          slot.flying_squad.map(async (flyingSquadId) => {
            const flyingSquad = await this.flyingsquadModel.findById(
              flyingSquadId,
            );
            return {
              teacher_id_flying_squad: flyingSquad.teacher_id.toString(),
              flying_squad_id: flyingSquadId.toString(),
            };
          }),
        );
        flyingSquadArray = [...flyingSquadArray, ...flyingSquadIds];
      }
      console.log(invDutiesArray);
      const result = {};
      for (const slot of slots) {
        const date = slot.date.toString().split('T')[0];
        result[date] = [];
        for (const invDuty of invDutiesArray) {
          if (
            slot.inv_duties.includes(invDuty.toString()) &&
            invDuty.toString() === id
          ) {
            result[date].push({
              time: slot.timeSlot,
              type: 'Invigilation Duty',
              room: 'Controller Room',
              message:
                'Go to the controller room, press start invigilation and scan the QR for further instructions',
            });
          }
        }
        for (const fs of flyingSquadArray) {
          if (
            slot.flying_squad.includes(fs.flying_squad_id) &&
            fs.teacher_id_flying_squad === id
          ) {
            result[date].push({
              time: slot.timeSlot,
              type: 'Flying Squad',
              room: 'Controller Room',
              message:
                'Go to the controller room, press start invigilation and scan the QR for further  instructions',
            });
          }
        }
      }

      for (const date in result) {
        if (result[date].length === 0) {
          delete result[date];
        } else {
          const uniqueTimes = new Set();
          result[date] = result[date].filter((event) => {
            if (uniqueTimes.has(event.time)) {
              return false;
            } else {
              uniqueTimes.add(event.time);
              return true;
            }
          });
        }
      }

      return result;
    } catch (err) {
      throw new HttpException(
        {
          message: 'Internal Error',
        },
        404,
      );
    }
  }
  async getNotifications() {
    try {
      const notifications = await this.notificationModel
        .find()
        .populate('sender', 'name')
        .exec();
      return {
        message: 'Notifications found',
        data: {
          notifications: [
            ...notifications.map((notification) => {
              notification = notification.toObject() as NotificationDocument;
              return {
                _id: notification._id,
                title: notification.title,
                sender: (notification.sender as any).name,
                message: notification.message,
                createdAt: (notification as any).createdAt,
              };
            }),
          ],
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
}
