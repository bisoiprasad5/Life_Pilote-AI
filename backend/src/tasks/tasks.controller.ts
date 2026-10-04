import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { SnoozeTaskDto } from './dto/snooze-task.dto';
import { RescheduleTaskDto } from './dto/reschedule-task.dto';
import { CreateSubTaskDto, UpdateSubTaskDto } from './dto/subtask.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // 1. GET /api/tasks - List tasks with pagination, filtering, sorting, and search
  @Get()
  @HttpCode(HttpStatus.OK)
  async getTasks(
    @CurrentUser('id') userId: string,
    @Query() query: QueryTasksDto,
  ) {
    const result = await this.tasksService.findAll(userId, query);
    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  // 2. POST /api/tasks - Create a new task with optional subtasks
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTask(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTaskDto,
  ) {
    const task = await this.tasksService.create(userId, dto);
    return {
      success: true,
      message: 'Task created successfully',
      data: task,
    };
  }

  // 3. GET /api/tasks/:id - Get a specific task by ID
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getTask(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const task = await this.tasksService.findById(userId, id);
    return {
      success: true,
      data: task,
    };
  }

  // 4. PUT /api/tasks/:id - Update an existing task
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateTask(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const updated = await this.tasksService.update(userId, id, dto);
    return {
      success: true,
      message: 'Task updated successfully',
      data: updated,
    };
  }

  // 5. DELETE /api/tasks/:id - Delete a task
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteTask(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const result = await this.tasksService.delete(userId, id);
    return {
      success: true,
      message: result.message,
    };
  }

  // 6. PATCH /api/tasks/:id/complete - Mark task as completed or toggle completion
  @Patch(':id/complete')
  @HttpCode(HttpStatus.OK)
  async completeTask(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CompleteTaskDto,
  ) {
    const task = await this.tasksService.complete(userId, id, dto);
    return {
      success: true,
      message: task.status === 'COMPLETED' ? 'Task marked as completed' : 'Task reopened',
      data: task,
    };
  }

  // 7. PATCH /api/tasks/:id/snooze - Snooze task deadline/due date
  @Patch(':id/snooze')
  @HttpCode(HttpStatus.OK)
  async snoozeTask(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: SnoozeTaskDto,
  ) {
    const task = await this.tasksService.snooze(userId, id, dto);
    return {
      success: true,
      message: 'Task snoozed successfully',
      data: task,
    };
  }

  // 8. PATCH /api/tasks/:id/reschedule - Reschedule task date/time/deadline
  @Patch(':id/reschedule')
  @HttpCode(HttpStatus.OK)
  async rescheduleTask(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: RescheduleTaskDto,
  ) {
    const task = await this.tasksService.reschedule(userId, id, dto);
    return {
      success: true,
      message: 'Task rescheduled successfully',
      data: task,
    };
  }

  // 9. POST /api/tasks/:id/duplicate - Duplicate an existing task
  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  async duplicateTask(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const task = await this.tasksService.duplicate(userId, id);
    return {
      success: true,
      message: 'Task duplicated successfully',
      data: task,
    };
  }

  // ==========================================
  // SUBTASK ENDPOINTS
  // ==========================================

  // POST /api/tasks/:id/subtasks - Add a subtask to a task
  @Post(':id/subtasks')
  @HttpCode(HttpStatus.CREATED)
  async addSubtask(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateSubTaskDto,
  ) {
    const subtask = await this.tasksService.addSubtask(userId, id, dto);
    return {
      success: true,
      message: 'Subtask added successfully',
      data: subtask,
    };
  }

  // PATCH /api/tasks/:id/subtasks/:subtaskId - Update or toggle subtask
  @Patch(':id/subtasks/:subtaskId')
  @HttpCode(HttpStatus.OK)
  async updateSubtask(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('subtaskId') subtaskId: string,
    @Body() dto: UpdateSubTaskDto,
  ) {
    const subtask = await this.tasksService.updateSubtask(userId, id, subtaskId, dto);
    return {
      success: true,
      message: 'Subtask updated successfully',
      data: subtask,
    };
  }

  // DELETE /api/tasks/:id/subtasks/:subtaskId - Delete a subtask
  @Delete(':id/subtasks/:subtaskId')
  @HttpCode(HttpStatus.OK)
  async deleteSubtask(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('subtaskId') subtaskId: string,
  ) {
    const result = await this.tasksService.deleteSubtask(userId, id, subtaskId);
    return {
      success: true,
      message: result.message,
    };
  }
}
