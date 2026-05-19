import {
  Body, Controller, Delete, Get,
  Param, Patch, Post, Query, Req,
  UseGuards
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import {  PostVisibility } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';

@ApiTags('Posts')           // ← اسم المجموعة في Swagger UI
@ApiBearerAuth()            // ← كل الـ endpoints تحتاج JWT Token
@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  // ─────────────────────────────────────────
  // POST /post — إنشاء بوست جديد
  // ─────────────────────────────────────────
  @Post()
  @ApiOperation({
    summary: 'إنشاء بوست جديد',
    description: 'يقوم المستخدم المسجل بإنشاء بوست جديد',
  })
  @ApiBody({ type: CreatePostDto })
  @ApiResponse({ status: 201, description: 'تم إنشاء البوست بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصرح — يحتاج Token' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  create(@Req() req, @Body() createPostDto: CreatePostDto) {
    return this.postService.create(req.user.id, createPostDto);
  }

  // ─────────────────────────────────────────
  // GET /post/feed — جلب الفيد الخاص بالمستخدم
  // ─────────────────────────────────────────
  @Get('feed')
  @ApiOperation({
    summary: 'جلب الفيد الخاص بالمستخدم',
    description: 'يرجع البوستات المخصصة للمستخدم مع دعم Pagination',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'رقم الصفحة',
    example: 1,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    description: 'عدد العناصر في الصفحة',
    example: 20,
  })
  @ApiResponse({ status: 200, description: 'تم جلب الفيد بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  getFeed(
    @Req() req,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.postService.getFeedForUser(req.user.id, Number(page), Number(pageSize));
  }

  // ─────────────────────────────────────────
  // GET /post — جلب كل البوستات
  // ─────────────────────────────────────────
  // @Get()
  // @ApiOperation({
  //   summary: 'جلب كل البوستات',
  //   description: 'يرجع قائمة بجميع البوستات الموجودة',
  // })
  // @ApiResponse({ status: 200, description: 'تم جلب البوستات بنجاح' })
  // findAll() {
  //   return this.postService.findAll();
  // }

  // ─────────────────────────────────────────
  // GET /post/:id — جلب بوست واحد
  // ─────────────────────────────────────────
  @Get(':id')
  @ApiOperation({
    summary: 'جلب بوست بالـ ID',
    description: 'يرجع تفاصيل بوست واحد عن طريق الـ ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'الـ ID الخاص بالبوست',
    example: '64f1a2b3c4d5e6f7a8b9c0d1',
  })
  @ApiResponse({ status: 200, description: 'تم إيجاد البوست' })
  @ApiResponse({ status: 404, description: 'البوست غير موجود' })
  findOne(@Param('id') id: string) {
    return this.postService.findOne(id);
  }

  // here if i want find the post by the user name like for see posts for certain user
  @Public()
  @Get('user/:username1')
  findPostsByUsername(@Param('username1') username1: string) {
    return this.postService.findPostsByUsername(username1);
  }
  //here when i am share the post and this have original post and qutoe content like look how syria is good now 

  @Post('share/:postId')
  sharePost(@Param('postId') postId: string, @Req() req, @Body() body: { quoteContent?: string }) {
    return this.postService.sharePost(req.user.id, postId, body.quoteContent);
  }

  ///here when i want make schdedule for my post
  @Post('schedule')
  schedulePost(@Req() req, @Body() body: {scheduledTime: string }) {
    return this.postService.schedulePost(req.user.id, body);
  }

 //here we updsert the post visablity when i want make the post public or private or friends only
  @Patch('update-privacy/:postId')
 
  updatePostPrivacy(@Req() req, @Param('postId') postId: string, @Body() body: { visibility: PostVisibility}) {
    return this.postService.updatePostPrivacy(req.user.id, postId, body.visibility);
  }
  //here saved the post
  @Post('save/:postId')
  savePost(@Req() req, @Param('postId') postId: string) {
    return this.postService.savePost(BigInt(postId), req.user.id);
  }
  //here we hide the post
  @Post('hide/:postId')
  hidePost(@Req() req, @Param('postId') postId: string) {
    return this.postService.hidePostForUser(req.user.id, BigInt(postId));
  }




    // ─────────────────────────────────────────
  // PATCH /post/:id — تعديل بوست
  // ─────────────────────────────────────────
  @Patch(':id')
  @ApiOperation({
    summary: 'تعديل بوست موجود',
    description: 'يمكن تعديل عنوان أو محتوى البوست',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'الـ ID الخاص بالبوست',
    example: '64f1a2b3c4d5e6f7a8b9c0d1',
  })
  @ApiBody({ type: UpdatePostDto })
  @ApiResponse({ status: 200, description: 'تم التعديل بنجاح' })
  @ApiResponse({ status: 404, description: 'البوست غير موجود' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto,@Req() req) {
    return this.postService.update(id, updatePostDto, req.user.id);
  }
  

  // ─────────────────────────────────────────
  // DELETE /post/:id — حذف بوست
  // ─────────────────────────────────────────
  @Delete(':id')

  @ApiOperation({
    summary: 'حذف بوست',
    description: 'يحذف البوست بشكل نهائي من قاعدة البيانات',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'الـ ID الخاص بالبوست',
    example: '64f1a2b3c4d5e6f7a8b9c0d1',
  })
  
  @ApiResponse({ status: 200, description: 'تم الحذف بنجاح' })
  @ApiResponse({ status: 404, description: 'البوست غير موجود' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  remove(@Param('id') id: string, @Req() req) {
    return this.postService.remove(id, req.user.id);
  }
}