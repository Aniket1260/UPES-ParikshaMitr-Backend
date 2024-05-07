import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CopyBundle, CopyBundleDocument } from '../../schemas/sheet-bundle';
import { Model } from 'mongoose';
import { Teacher, TeacherDocument } from '../../schemas/teacher.schema';
import { AddBundlesDto } from './dto/add-bundles.dto';
import { addDays, differenceInDays, format, isSunday } from 'date-fns';
import {
  BatchSubmitUpdateDto,
  ProgressBundleDto,
} from './dto/progess-bundle.dto';
import { Slot, SlotDocument } from '../../schemas/slot.schema';
import { Room, RoomDocument } from '../../schemas/room.schema';
import { EditBatchDto, EditBundleDto } from './dto/edit-bundle.dto';

@Injectable()
export class CopyDistributionService {
  constructor(
    @InjectModel(CopyBundle.name)
    private copyBundleModel: Model<CopyBundleDocument>,
    @InjectModel(Teacher.name) private teacherModel: Model<TeacherDocument>,
    @InjectModel(Slot.name) private slotModel: Model<SlotDocument>,
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
  ) {}

  //#region Add New Bundles
  async addBundles(addBundledto: AddBundlesDto, cont_id: string) {
    const teacher = await this.teacherModel.findOne({
      sap_id: addBundledto.evaluatorSap,
    });
    if (!teacher) {
      throw new HttpException('Teacher not found', 400);
    }

    const regex = /^([0-2][0-9]|(3)[0-1])(\/)(((0)[0-9])|((1)[0-2]))(\/)\d{4}$/;

    // Test the date string against the regular expression.
    if (!regex.test(addBundledto.dateOfExam)) {
      // The date string is in the dd/mm/yyyy format.
      throw new HttpException(
        'Invalid date format for bundle ' +
          addBundledto.dateOfExam +
          '. Please use dd/mm/yyyy format.',
        400,
      );
    }

    // Split the date string into an array using the "/" character as the delimiter.
    const dateArray = addBundledto.dateOfExam.split('/');

    // Convert the first element of the array to a number using the parseInt() function. This is the day of the month.
    const day = parseInt(dateArray[0]);

    // Convert the second element of the array to a number using the parseInt() function. This is the month.
    const month = parseInt(dateArray[1]);

    // Convert the third element of the array to a number using the parseInt() function. This is the year.
    const year = parseInt(dateArray[2]);

    // Create a new Date object using the day, month, and year values.
    const date = new Date(year, month - 1, day);

    const exam_date = format(date, 'yyyy-MM-dd');

    const slot = await this.slotModel.find({
      date: exam_date,
    });

    const allRooms = slot.map((s) => s.rooms).flat();

    const rooms = await this.roomModel.find({
      _id: { $in: allRooms },
      'students.subject_code': addBundledto.subjectCode,
    });

    // if (rooms.length === 0) {
    //   throw new HttpException('Exam not registered in slots', 400);
    // }

    const prev_bundle = await this.copyBundleModel.findOne({
      date_of_exam: exam_date,
      subject_code: addBundledto.subjectCode,
      subject_school: addBundledto.subjectSchool,
      evaluator: teacher._id,
    });

    if (prev_bundle) {
      if (
        prev_bundle.copies.some(
          (copy) =>
            copy.batch === addBundledto.batch &&
            copy.program === addBundledto.program,
        )
      ) {
        throw new HttpException('CopyBundle already exists', 400);
      }

      const copy = {
        batch: addBundledto.batch,
        no_of_students: parseInt(addBundledto.noOfStudents),
        program: addBundledto.program,
        distibuter: cont_id,
      };
      prev_bundle.copies.push({
        ...copy,
      });
      prev_bundle.save();
    } else {
      const copyBundle = new this.copyBundleModel({
        date_of_exam: exam_date,
        evaluation_mode: addBundledto.evaluationMode,
        evaluator: teacher._id,
        subject_code: addBundledto.subjectCode,
        subject_name: addBundledto.subjectName,
        subject_school: addBundledto.subjectSchool,
        room_no: addBundledto.roomNo,
        copies: [
          {
            batch: addBundledto.batch,
            no_of_students: addBundledto.noOfStudents,
            program: addBundledto.program,
            distibuter: cont_id,
          },
        ],
      });
      copyBundle.save();
    }

    return {
      message: 'CopyBundle added successfully',
    };
  }

  //#region Get All Bundles
  async allBundles() {
    const bundles = await this.copyBundleModel.find().populate('evaluator');
    return bundles;
  }

  //#region Get Bundle By Id
  async getBundle(id: string) {
    function getNextWorkingDay(date) {
      const nextDay = addDays(date, 1);
      if (isSunday(nextDay)) {
        return getNextWorkingDay(nextDay);
      }
      return nextDay;
    }

    function getWorkingDateAfterDays(startDate, workingDays) {
      let currentDate = startDate;
      for (let i = 1; i < workingDays; i++) {
        currentDate = getNextWorkingDay(currentDate);
      }
      return currentDate;
    }
    try {
      const bundle = await this.copyBundleModel
        .findById(id)
        .populate('evaluator')
        .populate('copies.distibuter')
        .exec();

      const res_obj = [];

      const t = {
        _id: bundle._id,
        date_of_exam: bundle.date_of_exam,
        evaluation_mode: bundle.evaluation_mode,
        evaluator: {
          sap_id: (bundle.evaluator as any).sap_id,
          name: (bundle.evaluator as any).name,
          email: (bundle.evaluator as any).email,
          phone: (bundle.evaluator as any).phone,
        },
        subject_code: bundle.subject_code,
        subject_name: bundle.subject_name,
        subject_school: bundle.subject_school,
        room_no: bundle.room_no,
        copies: [],
      };
      for (const c of bundle.copies) {
        const start_date = c.start_date;
        const available_date = c.available_date;
        const due_date = available_date
          ? getWorkingDateAfterDays(new Date(available_date), 7)
          : null;
        const day_diff = differenceInDays(
          due_date,
          new Date(format(new Date(), 'yyyy-MM-dd')),
        );

        t.copies.push({
          _id: (c as any)._id,
          batch: c.batch,
          no_of_students: c.no_of_students,
          program: c.program,
          status:
            c.status == 'SUBMITTED'
              ? c.status
              : day_diff < 0
              ? 'OVERDUE'
              : c.status,
          allotted_date: c.allotted_date,
          start_date: c.start_date,
          submit_date: c.submit_date,
          available_date: c.available_date,
          // Due in days (7 working days from start date)
          due_in:
            available_date && c.status != 'SUBMITTED'
              ? day_diff > 0
                ? `Due in ${day_diff} days`
                : day_diff == 0
                ? 'Due Today'
                : `Overdue by ${Math.abs(day_diff)} days`
              : null,
          distibuter: (c.distibuter as any)?.name,
          answersheet: c.answersheet,
          award_softcopy: c.award_softcopy,
          award_hardcopy: c.award_hardcopy,
        });
      }
      res_obj.push(t);

      return res_obj;
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      }
      throw new HttpException(e.message, 400);
    }
  }

  //#region Progress Bundle
  async progressBundle(progressBundleDto: ProgressBundleDto) {
    const bundle = await this.copyBundleModel.findById(
      progressBundleDto.bundle_id,
    );

    if (!bundle) {
      return {
        message: 'Bundle not found',
      };
    }

    const batchIndex = bundle.copies.findIndex(
      (copy) =>
        copy.batch === progressBundleDto.batch &&
        copy.program === progressBundleDto.program,
    );

    const batch = bundle.copies[batchIndex];

    if (!batch) {
      return {
        message: 'Batch not found',
      };
    }

    if (batch.status === 'SUBMITTED') {
      throw new HttpException('Bundle already submitted', 400);
    } else if (batch.status === 'ALLOTTED') {
      throw new HttpException('Awaiting Teacher to Accept allotment', 400);
    } else if (batch.status === 'AVAILABLE') {
      batch.status = 'ALLOTTED';
      batch.allotted_date = new Date();
    } else if (batch.status === 'INPROGRESS') {
      batch.status = 'SUBMITTED';
      batch.submit_date = new Date();
    }

    bundle.copies[batchIndex] = batch;
    bundle.save();

    return {
      message: 'Bundle progressed successfully',
    };
  }

  async acceptBundle(progressBundleDto: ProgressBundleDto, teacher_id: string) {
    const bundle = await this.copyBundleModel.findById(
      progressBundleDto.bundle_id,
    );

    if (!bundle) {
      return {
        message: 'Bundle not found',
      };
    }

    if (bundle.evaluator.toString() !== teacher_id) {
      throw new HttpException('Bundle Not Alloted to Teacher', 401);
    }

    const batchIndex = bundle.copies.findIndex(
      (copy) =>
        copy.batch === progressBundleDto.batch &&
        copy.program === progressBundleDto.program,
    );

    const batch = bundle.copies[batchIndex];

    if (!batch) {
      return {
        message: 'Batch not found',
      };
    }

    if (batch.status === 'ALLOTTED') {
      batch.status = 'INPROGRESS';
      batch.start_date = new Date();
    } else {
      throw new HttpException('Bundle not allotted', 400);
    }

    bundle.copies[batchIndex] = batch;
    bundle.save();

    return {
      message: 'Bundle accepted successfully',
    };
  }
  // #region Delete Bundle

  async deleteBundle(id: string, batch: string) {
    const bundle = await this.copyBundleModel.findById(id);

    if (!bundle) {
      return {
        message: 'Bundle not found',
      };
    }

    const batchIndex = bundle.copies.findIndex((copy) => copy.batch === batch);

    if (batchIndex === -1) {
      return {
        message: 'Batch not found',
      };
    }

    bundle.copies.splice(batchIndex, 1);

    bundle.save();

    return {
      message: 'Bundle deleted successfully',
    };
  }

  //#region Batch Submit Update
  async batchSubmitUpdate(batchSubmitUpdateDto: BatchSubmitUpdateDto) {
    const bundle = await this.copyBundleModel.findById(
      batchSubmitUpdateDto.bundle_id,
    );

    if (!bundle) {
      return {
        message: 'Bundle not found',
      };
    }

    const batchIndex = bundle.copies.findIndex(
      (copy) =>
        copy.batch === batchSubmitUpdateDto.batch &&
        copy.program === batchSubmitUpdateDto.program,
    );

    const batch = bundle.copies[batchIndex];

    if (!batch) {
      return {
        message: 'Batch not found',
      };
    }

    batch.answersheet = batchSubmitUpdateDto.answersheet;
    batch.award_softcopy = batchSubmitUpdateDto.award_softcopy;
    batch.award_hardcopy = batchSubmitUpdateDto.award_hardcopy;

    bundle.copies[batchIndex] = batch;
    bundle.save();

    return {
      message: 'Batch updated successfully',
    };
  }

  //#region Delete Subject
  async deleteSubject(id: string) {
    const bundle = await this.copyBundleModel.findById(id);

    if (!bundle) {
      return {
        message: 'Bundle not found',
      };
    }

    await bundle.deleteOne();

    return {
      message: 'Bundle deleted successfully',
    };
  }

  //#region Edit Bundle
  async editBundle(editBundleDto: EditBundleDto) {
    try {
      const bundle = await this.copyBundleModel.findById(editBundleDto.id);

      if (!bundle) {
        throw new HttpException('Bundle not found', 400);
      }

      bundle.date_of_exam = editBundleDto.dateOfExamination;
      bundle.subject_name = editBundleDto.subjectName;
      bundle.room_no = +editBundleDto.roomNumber;

      bundle.save();

      return {
        message: 'Bundle updated successfully',
      };
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      }
      throw new HttpException(e.message, 400);
    }
  }

  //#region Edit Batch
  async editBatch(editBatchDto: EditBatchDto) {
    try {
      const bundle = await this.copyBundleModel.findOne({
        'copies._id': editBatchDto.id,
      });

      if (!bundle) {
        throw new HttpException('Batch not found', 400);
      }

      const batchIndex = bundle.copies.findIndex(
        (copy: any) => copy._id.toString() === editBatchDto.id,
      );

      if (batchIndex === -1) {
        throw new HttpException('Batch not found', 400);
      }

      bundle.copies[batchIndex].no_of_students = editBatchDto.numStudents;

      bundle.save();

      return {
        message: 'Batch updated successfully',
      };
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      }
      throw new HttpException(e.message, 400);
    }
  }
}
